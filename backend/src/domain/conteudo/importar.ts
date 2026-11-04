import type { PrismaClient } from '../../database/generated/prisma/client.js';
import { DIRETORIO_CONTEUDO, lerModulos, lerNiveis } from './arquivos.js';
import type { ExercicioConteudo, ItemTesteConteudo } from './schema.js';

export interface OpcoesImportacao {
  /** Importa já como `publicado` (útil em desenvolvimento). Padrão: `revisao`, aguardando a professora. */
  publicar?: boolean;
  /** Sobrescreve lições e testes que já existem (perde edições da professora e revisões SRS ligadas). */
  sobrescrever?: boolean;
  dir?: string;
}

export function dadosExercicio(e: ExercicioConteudo, ordem: number) {
  return {
    ordem,
    etapa: e.etapa,
    tipo: e.tipo,
    enunciado: e.enunciado,
    conteudo: e.conteudo,
    gabarito: e.gabarito,
    explicacao: e.explicacao,
    tagsErro: e.tagsErro ?? undefined,
  };
}

function dadosItemTeste(i: ItemTesteConteudo, ordem: number) {
  return {
    ordem,
    forma: i.forma,
    habilidade: i.habilidade,
    tipo: i.tipo,
    enunciado: i.enunciado,
    conteudo: i.conteudo,
    gabarito: i.gabarito,
    explicacao: i.explicacao,
  };
}

/**
 * Importa os arquivos de conteúdo para o banco. Idempotente: por padrão só cria o que falta
 * (lições e testes existentes não são tocados, para preservar edições feitas pela professora).
 */
export async function importarConteudo(prisma: PrismaClient, opcoes: OpcoesImportacao = {}) {
  const dir = opcoes.dir ?? DIRETORIO_CONTEUDO;
  const status = opcoes.publicar ? 'publicado' : 'revisao';
  const arquivos = lerModulos(dir);
  const invalidos = arquivos.filter((a) => a.erros.length);
  if (invalidos.length) {
    const detalhe = invalidos.map((a) => `${a.arquivo}:\n  ${a.erros.slice(0, 10).join('\n  ')}`).join('\n');
    throw new Error(`Conteúdo inválido (rode npm run conteudo:validar):\n${detalhe}`);
  }

  const resumo = { modulos: 0, licoesCriadas: 0, licoesAtualizadas: 0, testes: 0 };

  for (const n of lerNiveis(dir)) {
    await prisma.nivel.upsert({
      where: { codigo: n.codigo },
      update: { nome: n.nome, descricao: n.descricao, ordem: n.ordem },
      create: { codigo: n.codigo, nome: n.nome, descricao: n.descricao, ordem: n.ordem },
    });
  }

  for (const { nivel, modulo: m } of arquivos) {
    if (!m) continue;
    const nivelDb = await prisma.nivel.findUniqueOrThrow({ where: { codigo: nivel } });
    const meta = {
      ordem: m.ordem,
      titulo: m.titulo,
      tema: m.tema,
      descricao: m.descricao,
      canDos: m.canDos,
      gramatica: m.gramatica,
      vocabulario: m.vocabulario,
      funcao: m.funcao,
      pronuncia: m.pronuncia,
    };
    const existente = await prisma.modulo.findUnique({ where: { slug: m.slug } });
    const moduloDb = existente
      ? opcoes.sobrescrever
        ? await prisma.modulo.update({ where: { id: existente.id }, data: meta })
        : existente
      : await prisma.modulo.create({ data: { ...meta, slug: m.slug, nivelId: nivelDb.id, status } });
    resumo.modulos++;

    for (const l of m.licoes) {
      const dados = {
        ordem: l.ordem,
        titulo: l.titulo,
        objetivo: l.objetivo,
        minutosEstimados: l.minutosEstimados,
        apresentacao: l.apresentacao,
      };
      const exercicios = l.exercicios.map((e, i) => dadosExercicio(e, i + 1));
      const licaoDb = await prisma.licao.findUnique({ where: { slug: l.slug } });
      if (!licaoDb) {
        await prisma.licao.create({
          data: { ...dados, slug: l.slug, moduloId: moduloDb.id, status, exercicios: { create: exercicios } },
        });
        resumo.licoesCriadas++;
      } else if (opcoes.sobrescrever) {
        await prisma.$transaction([
          prisma.exercicio.deleteMany({ where: { licaoId: licaoDb.id } }),
          prisma.licao.update({ where: { id: licaoDb.id }, data: { ...dados, exercicios: { create: exercicios } } }),
        ]);
        resumo.licoesAtualizadas++;
      }
    }

    const temTeste = (await prisma.itemTeste.count({ where: { moduloId: moduloDb.id } })) > 0;
    if (!temTeste || opcoes.sobrescrever) {
      await prisma.$transaction([
        prisma.itemTeste.deleteMany({ where: { moduloId: moduloDb.id } }),
        prisma.itemTeste.createMany({
          data: m.teste.itens.map((i, idx) => ({ ...dadosItemTeste(i, idx + 1), moduloId: moduloDb.id })),
        }),
      ]);
      resumo.testes++;
    }
  }

  return resumo;
}
