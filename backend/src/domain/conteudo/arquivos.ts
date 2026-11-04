import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { moduloSchema, type ModuloConteudo } from './schema.js';

// Conteúdo-fonte do curso: prisma/conteudo/niveis.json + prisma/conteudo/<nivel>/*.json (um módulo por arquivo)
export const DIRETORIO_CONTEUDO = path.resolve('prisma/conteudo');

const niveisSchema = z.array(
  z.object({ codigo: z.string().min(1), nome: z.string().min(1), descricao: z.string().optional(), ordem: z.number().int() }),
);
export type NivelConteudo = z.infer<typeof niveisSchema>[number];

export interface ArquivoModulo {
  arquivo: string;
  nivel: string; // código do nível, ex. "A1"
  modulo?: ModuloConteudo;
  erros: string[];
}

export function lerNiveis(dir = DIRETORIO_CONTEUDO): NivelConteudo[] {
  return niveisSchema.parse(JSON.parse(fs.readFileSync(path.join(dir, 'niveis.json'), 'utf-8')));
}

function formatarErros(error: z.ZodError) {
  return error.issues.map((i) => `${i.path.length ? i.path.join('.') + ': ' : ''}${i.message}`);
}

export function lerArquivoModulo(arquivo: string, nivel: string): ArquivoModulo {
  let json: unknown;
  try {
    json = JSON.parse(fs.readFileSync(arquivo, 'utf-8'));
  } catch (e) {
    return { arquivo, nivel, erros: [`JSON inválido: ${(e as Error).message}`] };
  }
  const parsed = moduloSchema.safeParse(json);
  if (!parsed.success) return { arquivo, nivel, erros: formatarErros(parsed.error) };

  const m = parsed.data;
  const erros: string[] = [];
  const prefixo = `${nivel.toLowerCase()}-m${String(m.ordem).padStart(2, '0')}`;
  if (m.slug !== prefixo) erros.push(`slug do módulo deveria ser "${prefixo}"`);
  m.licoes.forEach((l, i) => {
    if (l.ordem !== i + 1) erros.push(`lição ${l.slug}: ordem ${l.ordem}, esperado ${i + 1}`);
    if (l.slug !== `${prefixo}-l${l.ordem}`) erros.push(`lição ${l.slug}: slug deveria ser "${prefixo}-l${l.ordem}"`);
  });
  return { arquivo, nivel, modulo: m, erros };
}

/** Lê todos os módulos de todos os níveis (ou só os arquivos indicados). */
export function lerModulos(dir = DIRETORIO_CONTEUDO, somente?: string[]): ArquivoModulo[] {
  const resultado: ArquivoModulo[] = [];
  for (const nivel of lerNiveis(dir)) {
    const pasta = path.join(dir, nivel.codigo.toLowerCase());
    if (!fs.existsSync(pasta)) continue;
    for (const nome of fs.readdirSync(pasta).filter((f) => f.endsWith('.json')).sort()) {
      const arquivo = path.join(pasta, nome);
      if (somente && !somente.some((s) => path.resolve(s) === arquivo || nome === s || nome === `${s}.json`)) continue;
      resultado.push(lerArquivoModulo(arquivo, nivel.codigo));
    }
  }
  // Ordens repetidas dentro do mesmo nível
  const vistos = new Map<string, string>();
  for (const r of resultado) {
    if (!r.modulo) continue;
    const chave = `${r.nivel}#${r.modulo.ordem}`;
    if (vistos.has(chave)) r.erros.push(`ordem ${r.modulo.ordem} repetida (também em ${vistos.get(chave)})`);
    else vistos.set(chave, path.basename(r.arquivo));
  }
  return resultado;
}
