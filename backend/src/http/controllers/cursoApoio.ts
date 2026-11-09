// Apoio compartilhado pelos controllers do curso autoguiado (aluno e professora).
import type { Response } from 'express';
import { z, type ZodError } from 'zod';
import { prisma } from '../../database/client.js';
import type { Prisma } from '../../database/generated/prisma/client.js';
import { corrigir, RespostaInvalida, versaoPublica, type ItemCorrigivel, type Resultado } from '../../domain/correcao.js';
import { calcularTrilha, respostaVazia, type EstadoModulo } from '../../domain/desbloqueio.js';
import { atualizarOfensiva, novaRevisao, ofensivaVigente } from '../../domain/progresso.js';

/** Cliente do Prisma ou o `tx` de uma transação interativa. */
export type Db = Prisma.TransactionClient;

export function idParam(valor: unknown): number | null {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** Limite de tamanho de uma resposta: a correção normaliza com regex, e texto enorme trava o event loop. */
export const MAX_RESPOSTA_CHARS = 2000;

export const respostaLimitada = z
  .json()
  .refine((v) => JSON.stringify(v).length <= MAX_RESPOSTA_CHARS, { message: 'Resposta longa demais' });

export function erroZod(res: Response, erro: ZodError) {
  const issue = erro.issues[0];
  const caminho = issue?.path.length ? `${issue.path.join('.')}: ` : '';
  res.status(400).json({ error: `${caminho}${issue?.message ?? 'Dados inválidos'}` });
}

// ─── Campos Json ────────────────────────────────────────────────────────────

export function listaTextos(v: Prisma.JsonValue | null | undefined): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

export function listaNumeros(v: Prisma.JsonValue | null | undefined): number[] {
  return Array.isArray(v) ? v.filter((x): x is number => typeof x === 'number') : [];
}

// ─── Correção ───────────────────────────────────────────────────────────────

/** Corrige; resposta ausente (undefined/null) conta como errada. Pode lançar RespostaInvalida. */
export function corrigirOuZerar(item: ItemCorrigivel, resposta: unknown): Resultado {
  return corrigir(item, resposta === undefined || resposta === null ? respostaVazia(item.tipo) : resposta);
}

/** Executa a correção e devolve 400 se a resposta estiver no formato errado. */
export function comCorrecao<T>(res: Response, fn: () => T): T | undefined {
  try {
    return fn();
  } catch (e) {
    if (e instanceof RespostaInvalida) {
      res.status(400).json({ error: `Resposta inválida: ${e.message}` });
      return undefined;
    }
    throw e;
  }
}

type ExercicioLinha = {
  id: number;
  ordem: number;
  etapa: string;
  tipo: string;
  enunciado: string;
  conteudo: Prisma.JsonValue;
  gabarito: Prisma.JsonValue;
  explicacao: string;
  tagsErro?: Prisma.JsonValue | null;
};

/** Só os campos que podem ir ao navegador do aluno. */
export function exercicioPublico(e: ExercicioLinha) {
  const { id, ordem, etapa, tipo, enunciado, conteudo } = versaoPublica(e);
  return { id, ordem, etapa, tipo, enunciado, conteudo };
}

type ItemTesteLinha = Omit<ExercicioLinha, 'etapa'> & { habilidade: string };

export function itemTestePublico(i: ItemTesteLinha) {
  const { id, ordem, habilidade, tipo, enunciado, conteudo } = versaoPublica(i);
  return { id, ordem, habilidade, tipo, enunciado, conteudo };
}

// ─── Trilha ─────────────────────────────────────────────────────────────────

const PUBLICADO = 'publicado' as const;

/** Carrega a trilha publicada (níveis → módulos → lições) e o estado de desbloqueio do aluno. */
export async function carregarTrilha(usuarioId: number, agora = new Date(), db: Db = prisma) {
  const [niveis, progressos, tentativas] = await Promise.all([
    db.nivel.findMany({
      orderBy: { ordem: 'asc' },
      include: {
        modulos: {
          where: { status: PUBLICADO },
          orderBy: { ordem: 'asc' },
          include: {
            licoes: {
              where: { status: PUBLICADO },
              orderBy: { ordem: 'asc' },
              select: { id: true, ordem: true, titulo: true, objetivo: true, minutosEstimados: true },
            },
          },
        },
      },
    }),
    db.progressoLicao.findMany({ where: { usuarioId } }),
    db.tentativaTeste.findMany({
      where: { usuarioId, finalizadaEm: { not: null } },
      select: { moduloId: true, aprovado: true, percentual: true, finalizadaEm: true },
    }),
  ]);

  const modulos = niveis.flatMap((n) => n.modulos);
  const concluidas = new Set(progressos.filter((p) => p.concluida).map((p) => p.licaoId));
  const estados = calcularTrilha(modulos, concluidas, tentativas, agora);
  const progressoPorLicao = new Map(progressos.map((p) => [p.licaoId, p]));

  return { niveis, modulos, estados, progressoPorLicao };
}

export type Trilha = Awaited<ReturnType<typeof carregarTrilha>>;

/** Estado de uma lição publicada na trilha do aluno (null se lição ou módulo não estão publicados). */
export function estadoDaLicao(trilha: Trilha, moduloId: number, licaoId: number) {
  const modulo: EstadoModulo | undefined = trilha.estados.get(moduloId);
  const licao = modulo?.licoes.get(licaoId);
  return modulo && licao ? { modulo, licao } : null;
}

/** Próxima lição publicada do mesmo módulo. */
export function proximaLicaoId(trilha: Trilha, moduloId: number, licaoId: number): number | null {
  const licoes = trilha.modulos.find((m) => m.id === moduloId)?.licoes ?? [];
  const idx = licoes.findIndex((l) => l.id === licaoId);
  return idx >= 0 ? (licoes[idx + 1]?.id ?? null) : null;
}

// ─── Perfil, ofensiva e revisão ─────────────────────────────────────────────

export async function obterPerfil(usuarioId: number, db: Db = prisma) {
  // INSERT ... ON CONFLICT DO NOTHING: duas requisições ao mesmo tempo (ex.: trilha e painel) não brigam pelo
  // perfil novo. O upsert do Prisma fazia SELECT + INSERT e a segunda caía na unique de usuarioId (500).
  await db.perfilAprendiz.createMany({ data: [{ usuarioId }], skipDuplicates: true });
  return db.perfilAprendiz.findUniqueOrThrow({ where: { usuarioId } });
}

/** Filtro dos itens de revisão vencidos, só de conteúdo publicado. */
export function filtroRevisaoPendente(usuarioId: number | { in: number[] }, agora: Date): Prisma.RevisaoItemWhereInput {
  return {
    usuarioId,
    proximaEm: { lte: agora },
    exercicio: { licao: { status: PUBLICADO, modulo: { status: PUBLICADO } } },
  };
}

export async function perfilPublico(usuarioId: number, agora = new Date(), db: Db = prisma) {
  const [perfil, revisoesPendentes] = await Promise.all([
    obterPerfil(usuarioId, db),
    db.revisaoItem.count({ where: filtroRevisaoPendente(usuarioId, agora) }),
  ]);
  return {
    xp: perfil.xp,
    ofensivaAtual: ofensivaVigente(perfil, agora),
    ofensivaMaxima: perfil.ofensivaMaxima,
    metodologia: perfil.metodologia,
    revisoesPendentes,
  };
}

/** Registra um estudo: atualiza a ofensiva e soma XP. */
export async function registrarEstudo(db: Db, usuarioId: number, xp: number, agora = new Date()) {
  const perfil = await obterPerfil(usuarioId, db);
  const ofensiva = atualizarOfensiva(perfil, agora);
  return db.perfilAprendiz.update({
    where: { usuarioId },
    data: { ...ofensiva, xp: { increment: xp } },
  });
}

/**
 * Exercício errado na prática ou no quiz: entra na revisão (novaRevisao) ou, se já está, volta para a caixa 1
 * sem empurrar para depois uma revisão que já estava marcada para antes.
 */
export async function colocarNaRevisao(db: Db, usuarioId: number, exercicioId: number, agora = new Date()) {
  const nova = novaRevisao(agora);
  const existente = await db.revisaoItem.findUnique({ where: { usuarioId_exercicioId: { usuarioId, exercicioId } } });
  if (!existente) {
    await db.revisaoItem.create({ data: { usuarioId, exercicioId, caixa: nova.caixa, proximaEm: nova.proximaEm, erros: 1 } });
    return;
  }
  const proximaEm = existente.proximaEm.getTime() < nova.proximaEm.getTime() ? existente.proximaEm : nova.proximaEm;
  await db.revisaoItem.update({
    where: { id: existente.id },
    data: { caixa: 1, proximaEm, erros: { increment: 1 } },
  });
}
