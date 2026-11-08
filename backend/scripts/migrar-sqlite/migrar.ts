// Copia os dados de um banco SQLite antigo (prisma/dev.db) para um Postgres vazio já migrado.
// A CLI fica em scripts/migrar-sqlite-para-postgres.ts; esta função também é usada no teste com Postgres real.
import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';
import { $Enums, Prisma, type PrismaClient } from '../../src/database/generated/prisma/client.js';
import { caminhoLegado, mimePorExtensao, nomeOriginalLegado } from '../../src/storage/legado.js';

/** Ordem de inserção respeitando as chaves estrangeiras. */
export const ORDEM_TABELAS = [
  'Usuario',
  'ConfiguracaoApp',
  'Turma',
  'Aviso',
  'Matricula',
  'Atividade',
  'Submissao',
  'Feedback',
  'MaterialApoio',
  'Nivel',
  'Modulo',
  'Licao',
  'Exercicio',
  'ItemTeste',
  'PerfilAprendiz',
  'ProgressoLicao',
  'NotaLicao',
  'RevisaoItem',
  'TentativaTeste',
] as const;

export interface OpcoesMigracao {
  /** Apaga tudo no destino antes de copiar (o padrão é recusar se já houver usuários). */
  forcar?: boolean;
  log?: (msg: string) => void;
}

export interface ResultadoTabela {
  tabela: string;
  origem: number | null; // null = tabela não existe no SQLite
  destino: number;
}

type Linha = Record<string, unknown>;

/** Uploads antigos ("/uploads/<nome>") viram linhas de Arquivo; a chave é "<Tabela>:<id do registro>". */
interface ArquivosLegados {
  linhas: { id: string; donoId: number; nomeOriginal: string; caminho: string; mime: string; tamanho: number; criadoEm: Date }[];
  porRegistro: Map<string, string>;
}

function montarArquivosLegados(sqlite: Database.Database, tabelas: Set<string>): ArquivosLegados {
  const legado: ArquivosLegados = { linhas: [], porRegistro: new Map() };
  const adicionar = (chave: string, donoId: number, url: unknown, data: unknown) => {
    const caminho = caminhoLegado(url);
    if (!caminho) return;
    const id = randomUUID();
    legado.porRegistro.set(chave, id);
    legado.linhas.push({
      id,
      donoId,
      nomeOriginal: nomeOriginalLegado(caminho),
      caminho,
      mime: mimePorExtensao(caminho),
      tamanho: 0,
      criadoEm: converterData(data) ?? new Date(),
    });
  };
  if (tabelas.has('Submissao')) {
    const linhas = sqlite.prepare('SELECT id, alunoId, arquivoUrl, dataEnvio FROM "Submissao"').all() as Linha[];
    for (const l of linhas) adicionar(`Submissao:${l.id}`, Number(l.alunoId), l.arquivoUrl, l.dataEnvio);
  }
  if (tabelas.has('MaterialApoio') && tabelas.has('Turma')) {
    const linhas = sqlite
      .prepare('SELECT m.id, t.professorId, m.urlArquivo, m.criadoEm FROM "MaterialApoio" m JOIN "Turma" t ON t.id = m.turmaId')
      .all() as Linha[];
    for (const l of linhas) adicionar(`MaterialApoio:${l.id}`, Number(l.professorId), l.urlArquivo, l.criadoEm);
  }
  return legado;
}
type Campo = { name: string; kind: string; type: string };

const LOTE = 500;
const ENUMS = $Enums as unknown as Record<string, Record<string, string>>;

/** Datas do SQLite do Prisma: "2026-03-20 03:08:02" (CURRENT_TIMESTAMP, UTC), ISO com fuso, ou epoch em ms. */
export function converterData(v: unknown): Date | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number' || typeof v === 'bigint') return new Date(Number(v));
  const s = String(v).trim();
  if (/^\d+$/.test(s)) return new Date(Number(s));
  const iso = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(s) ? s.replace(' ', 'T') : s;
  const comFuso = /([zZ]|[+-]\d{2}:?\d{2})$/.test(iso) || /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : `${iso}Z`;
  const d = new Date(comFuso);
  if (Number.isNaN(d.getTime())) throw new Error(`Data inválida no SQLite: ${JSON.stringify(v)}`);
  return d;
}

function delegate(tx: Prisma.TransactionClient, modelo: string) {
  const nome = modelo[0].toLowerCase() + modelo.slice(1);
  return (tx as unknown as Record<string, { createMany(a: { data: Linha[] }): Promise<{ count: number }>; count(): Promise<number> }>)[nome];
}

function converterLinha(
  modelo: string,
  linha: Linha,
  campos: Campo[],
  usuarios: Set<number>,
  arquivos: ArquivosLegados,
): Linha {
  const out: Linha = {};
  for (const c of campos) {
    if (!(c.name in linha)) continue;
    const v = linha[c.name];
    if (c.kind === 'enum') {
      const valores = Object.values(ENUMS[c.type] ?? {});
      if (v === null || v === undefined) continue; // usa o default do schema
      if (!valores.includes(String(v))) {
        throw new Error(`${modelo}.${c.name} id=${linha.id}: valor "${v}" fora do enum ${c.type} (${valores.join(', ')})`);
      }
      out[c.name] = String(v);
      continue;
    }
    switch (c.type) {
      case 'Boolean':
        out[c.name] = v === null ? null : v === 1 || v === true || v === '1' || v === 'true';
        break;
      case 'DateTime':
        out[c.name] = converterData(v);
        break;
      case 'Json':
        // Json nulo: omitido (vira NULL no banco); Prisma não aceita `null` literal em Json opcional
        if (v === null || v === undefined) break;
        out[c.name] = typeof v === 'string' ? JSON.parse(v) : v;
        break;
      case 'Int':
        out[c.name] = v === null ? null : Number(v);
        break;
      case 'Float':
        out[c.name] = v === null ? null : Number(v);
        break;
      default:
        out[c.name] = v;
    }
  }

  // Colunas novas da F1: preenche com a melhor data disponível na própria linha
  const nomes = new Set(campos.map((c) => c.name));
  const dataOrigem = (out.criadoEm ?? out.dataEnvio ?? out.iniciadaEm ?? out.atualizadoEm) as Date | undefined;
  if (nomes.has('atualizadoEm') && out.atualizadoEm == null) out.atualizadoEm = dataOrigem ?? new Date();
  if (nomes.has('criadoEm') && out.criadoEm == null && dataOrigem) out.criadoEm = dataOrigem;

  if (modelo === 'Usuario') {
    out.email = String(out.email).trim().toLowerCase();
    if (typeof out.responsavelEmail === 'string') out.responsavelEmail = out.responsavelEmail.trim().toLowerCase();
  }
  // revisadoPorId era um Int solto; agora é FK (SetNull). Revisor inexistente vira null.
  if (modelo === 'Licao' && out.revisadoPorId != null && !usuarios.has(Number(out.revisadoPorId))) {
    out.revisadoPorId = null;
  }
  // Uploads privados (migração 20261109010000_arquivos): as URLs "/uploads/..." viraram FKs para Arquivo
  if (modelo === 'Submissao') out.arquivoId = arquivos.porRegistro.get(`Submissao:${linha.id}`) ?? null;
  if (modelo === 'MaterialApoio') {
    const arquivoId = arquivos.porRegistro.get(`MaterialApoio:${linha.id}`);
    if (arquivoId) out.arquivoId = arquivoId;
    else out.url = typeof linha.urlArquivo === 'string' ? linha.urlArquivo : null;
  }
  if (modelo === 'ConfiguracaoApp' && 'logoUrl' in linha) out.logoCaminho = caminhoLegado(linha.logoUrl);
  return out;
}

export async function migrarSqliteParaPostgres(
  sqlitePath: string,
  prisma: PrismaClient,
  opcoes: OpcoesMigracao = {},
): Promise<ResultadoTabela[]> {
  const log = opcoes.log ?? (() => {});
  // Só leitura: o arquivo de origem nunca é alterado
  const sqlite = new Database(sqlitePath, { readonly: true, fileMustExist: true });
  try {
    const tabelasSqlite = new Set(
      (sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[]).map((t) => t.name),
    );
    if (!tabelasSqlite.has('Usuario')) {
      throw new Error('O SQLite não tem a tabela Usuario: aplique as migrações antigas até 20261103000000_usuario_unificado.');
    }

    const migrado = await prisma.$queryRaw<{ n: bigint }[]>`
      SELECT count(*) AS n FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'Usuario'`;
    if (Number(migrado[0].n) === 0) throw new Error('O Postgres de destino não está migrado: rode `npx prisma migrate deploy` antes.');

    const existentes = await prisma.usuario.count();
    if (existentes > 0 && !opcoes.forcar) {
      throw new Error(`O destino já tem ${existentes} usuário(s). Use --forcar para apagar tudo no destino e copiar de novo.`);
    }

    // E-mails que colidem depois de normalizar precisam ser resolvidos à mão antes
    const emails = sqlite.prepare('SELECT id, email FROM "Usuario"').all() as { id: number; email: string }[];
    const vistos = new Map<string, number>();
    for (const u of emails) {
      const e = String(u.email).trim().toLowerCase();
      if (vistos.has(e)) throw new Error(`E-mails duplicados sem diferenciar maiúsculas: ids ${vistos.get(e)} e ${u.id} (${e})`);
      vistos.set(e, u.id);
    }
    const usuarios = new Set(emails.map((u) => u.id));

    const arquivos = montarArquivosLegados(sqlite, tabelasSqlite);
    const modelos = new Map(Prisma.dmmf.datamodel.models.map((m) => [m.name, m.fields as unknown as Campo[]]));
    const resultado: ResultadoTabela[] = [];

    await prisma.$transaction(
      async (tx) => {
        if (opcoes.forcar) {
          const lista = [...ORDEM_TABELAS, 'Arquivo'].map((t) => `"${t}"`).join(', ');
          await tx.$executeRawUnsafe(`TRUNCATE TABLE ${lista} RESTART IDENTITY CASCADE`);
          log('Destino esvaziado (--forcar).');
        }

        for (const tabela of ORDEM_TABELAS) {
          if (!tabelasSqlite.has(tabela)) {
            log(`${tabela}: não existe no SQLite, pulando.`);
            resultado.push({ tabela, origem: null, destino: 0 });
            continue;
          }
          const campos = (modelos.get(tabela) ?? []).filter((c) => c.kind === 'scalar' || c.kind === 'enum');
          const linhas = sqlite.prepare(`SELECT * FROM "${tabela}" ORDER BY id`).all() as Linha[];
          if (linhas.length) {
            const nomes = new Set(campos.map((c) => c.name));
            const sobrando = Object.keys(linhas[0]).filter((k) => !nomes.has(k));
            if (sobrando.length) log(`${tabela}: colunas ignoradas (não existem no schema novo): ${sobrando.join(', ')}`);
          }
          const dados = linhas.map((l) => converterLinha(tabela, l, campos, usuarios, arquivos));
          const d = delegate(tx, tabela);
          for (let i = 0; i < dados.length; i += LOTE) await d.createMany({ data: dados.slice(i, i + LOTE) });
          const destino = await d.count();
          resultado.push({ tabela, origem: linhas.length, destino });
          log(`${tabela}: ${linhas.length} → ${destino}`);
          if (destino !== linhas.length) throw new Error(`${tabela}: esperava ${linhas.length} linhas, o destino tem ${destino}`);

          if (tabela === 'Usuario') {
            // Metadados dos uploads antigos (os arquivos continuam com o mesmo nome na pasta de uploads)
            for (let i = 0; i < arquivos.linhas.length; i += LOTE) {
              await tx.arquivo.createMany({ data: arquivos.linhas.slice(i, i + LOTE) });
            }
            resultado.push({ tabela: 'Arquivo', origem: arquivos.linhas.length, destino: await tx.arquivo.count() });
            log(`Arquivo (de URLs /uploads/): ${arquivos.linhas.length}`);
          }
        }

        // Ids foram copiados explicitamente: as sequências precisam continuar depois do maior id
        for (const tabela of ORDEM_TABELAS) {
          const seq = await tx.$queryRawUnsafe<{ s: string | null }[]>(`SELECT pg_get_serial_sequence('"${tabela}"', 'id') AS s`);
          if (!seq[0]?.s) continue;
          await tx.$executeRawUnsafe(
            `SELECT setval($1::regclass, COALESCE((SELECT MAX(id) FROM "${tabela}"), 0) + 1, false)`,
            seq[0].s,
          );
        }
      },
      { timeout: 10 * 60_000, maxWait: 30_000 },
    );
    return resultado;
  } finally {
    sqlite.close();
  }
}
