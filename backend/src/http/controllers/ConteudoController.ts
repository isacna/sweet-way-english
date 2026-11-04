// Curso autoguiado — revisão e publicação do conteúdo pela professora (rotas com requireRole('professor')).
// O conteúdo é global: qualquer professor pode revisar e publicar. Contrato em docs/api-curso.md.
import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../database/client.js';
import { Prisma } from '../../database/generated/prisma/client.js';
import { AuthRequest } from '../../types/index.js';
import { itemSchema, licaoEdicaoSchema } from '../../domain/conteudo/schema.js';
import { dadosExercicio } from '../../domain/conteudo/importar.js';
import { comCorrecao, corrigirOuZerar, erroZod, idParam } from './cursoApoio.js';

const STATUS = ['rascunho', 'revisao', 'publicado'] as const;
const statusLicaoSchema = z.object({ status: z.enum(STATUS) });
const statusModuloSchema = z.object({ status: z.enum(STATUS), incluirLicoes: z.boolean().optional() });
const verificarSchema = z.object({ item: z.unknown(), resposta: z.json() });

export async function listarConteudo(_req: AuthRequest, res: Response) {
  const niveis = await prisma.nivel.findMany({
    orderBy: { ordem: 'asc' },
    include: {
      modulos: {
        orderBy: { ordem: 'asc' },
        include: {
          _count: { select: { itensTeste: true } },
          licoes: { orderBy: { ordem: 'asc' }, include: { _count: { select: { exercicios: true } } } },
        },
      },
    },
  });

  res.json({
    niveis: niveis.map((n) => ({
      id: n.id,
      codigo: n.codigo,
      nome: n.nome,
      modulos: n.modulos.map((m) => ({
        id: m.id,
        slug: m.slug,
        ordem: m.ordem,
        titulo: m.titulo,
        tema: m.tema,
        status: m.status,
        totalItensTeste: m._count.itensTeste,
        licoes: m.licoes.map((l) => ({
          id: l.id,
          ordem: l.ordem,
          slug: l.slug,
          titulo: l.titulo,
          status: l.status,
          totalExercicios: l._count.exercicios,
          atualizadoEm: l.atualizadoEm,
          revisadoEm: l.revisadoEm,
        })),
      })),
    })),
  });
}

async function licaoCompleta(id: number) {
  const licao = await prisma.licao.findUnique({
    where: { id },
    include: {
      modulo: { select: { id: true, slug: true, titulo: true } },
      exercicios: { orderBy: { ordem: 'asc' } },
    },
  });
  if (!licao) return null;
  return {
    id: licao.id,
    slug: licao.slug,
    ordem: licao.ordem,
    titulo: licao.titulo,
    objetivo: licao.objetivo,
    minutosEstimados: licao.minutosEstimados,
    status: licao.status,
    apresentacao: licao.apresentacao,
    modulo: licao.modulo,
    exercicios: licao.exercicios.map((e) => ({
      id: e.id,
      ordem: e.ordem,
      etapa: e.etapa,
      tipo: e.tipo,
      enunciado: e.enunciado,
      conteudo: e.conteudo,
      gabarito: e.gabarito,
      explicacao: e.explicacao,
      tagsErro: e.tagsErro,
    })),
  };
}

export async function getLicaoConteudo(req: AuthRequest, res: Response) {
  const id = idParam(req.params.id);
  if (!id) {
    res.status(400).json({ error: 'ID inválido' });
    return;
  }
  const licao = await licaoCompleta(id);
  if (!licao) {
    res.status(404).json({ error: 'Lição não encontrada' });
    return;
  }
  res.json(licao);
}

/** O GET devolve `tagsErro: null` quando não há tags; aceita o mesmo objeto de volta no PUT. */
function semTagsNulas(corpo: unknown): unknown {
  if (!corpo || typeof corpo !== 'object' || !Array.isArray((corpo as { exercicios?: unknown }).exercicios)) return corpo;
  const exercicios = (corpo as { exercicios: unknown[] }).exercicios.map((e) => {
    if (!e || typeof e !== 'object' || (e as { tagsErro?: unknown }).tagsErro !== null) return e;
    const { tagsErro: _t, ...resto } = e as Record<string, unknown>;
    return resto;
  });
  return { ...corpo, exercicios };
}

/** Exercícios com `id` são atualizados; sem `id`, criados; os que sumiram, apagados. A ordem segue o array. */
export async function salvarLicao(req: AuthRequest, res: Response) {
  const id = idParam(req.params.id);
  if (!id) {
    res.status(400).json({ error: 'ID inválido' });
    return;
  }
  const corpo = licaoEdicaoSchema.safeParse(semTagsNulas(req.body));
  if (!corpo.success) return erroZod(res, corpo.error);
  const dados = corpo.data;

  if (!dados.exercicios.some((e) => e.etapa === 'quiz')) {
    res.status(400).json({ error: 'A lição precisa de pelo menos um item de mini-quiz' });
    return;
  }

  const licao = await prisma.licao.findUnique({ where: { id }, include: { exercicios: { select: { id: true } } } });
  if (!licao) {
    res.status(404).json({ error: 'Lição não encontrada' });
    return;
  }

  const existentes = new Set(licao.exercicios.map((e) => e.id));
  const enviados = dados.exercicios.map((e) => e.id).filter((x): x is number => typeof x === 'number');
  const alheio = enviados.find((x) => !existentes.has(x));
  if (alheio !== undefined) {
    res.status(400).json({ error: `O exercício ${alheio} não pertence a esta lição` });
    return;
  }
  if (new Set(enviados).size !== enviados.length) {
    res.status(400).json({ error: 'Há exercícios repetidos na lição' });
    return;
  }

  const manter = new Set(enviados);
  await prisma.$transaction(async (tx) => {
    await tx.licao.update({
      where: { id },
      data: {
        titulo: dados.titulo,
        objetivo: dados.objetivo,
        minutosEstimados: dados.minutosEstimados,
        apresentacao: dados.apresentacao,
      },
    });
    await tx.exercicio.deleteMany({ where: { licaoId: id, id: { notIn: [...manter] } } });
    for (const [idx, e] of dados.exercicios.entries()) {
      const campos = dadosExercicio(e, idx + 1);
      const data = {
        ...campos,
        conteudo: campos.conteudo as Prisma.InputJsonObject,
        gabarito: campos.gabarito as Prisma.InputJsonObject,
        tagsErro: campos.tagsErro ?? Prisma.DbNull, // sem tags = limpa as antigas
      };
      if (e.id) await tx.exercicio.update({ where: { id: e.id }, data });
      else await tx.exercicio.create({ data: { ...data, licaoId: id } });
    }
  });

  res.json(await licaoCompleta(id));
}

export async function alterarStatusLicao(req: AuthRequest, res: Response) {
  const id = idParam(req.params.id);
  if (!id) {
    res.status(400).json({ error: 'ID inválido' });
    return;
  }
  const corpo = statusLicaoSchema.safeParse(req.body);
  if (!corpo.success) return erroZod(res, corpo.error);
  const { status } = corpo.data;

  const existe = await prisma.licao.findUnique({ where: { id }, select: { id: true } });
  if (!existe) {
    res.status(404).json({ error: 'Lição não encontrada' });
    return;
  }
  const licao = await prisma.licao.update({
    where: { id },
    data: { status, ...(status === 'publicado' && { revisadoPorId: req.user.id, revisadoEm: new Date() }) },
    select: { id: true, status: true, revisadoPorId: true, revisadoEm: true },
  });
  res.json(licao);
}

export async function alterarStatusModulo(req: AuthRequest, res: Response) {
  const id = idParam(req.params.id);
  if (!id) {
    res.status(400).json({ error: 'ID inválido' });
    return;
  }
  const corpo = statusModuloSchema.safeParse(req.body);
  if (!corpo.success) return erroZod(res, corpo.error);
  const { status, incluirLicoes } = corpo.data;

  const existe = await prisma.modulo.findUnique({ where: { id }, select: { id: true } });
  if (!existe) {
    res.status(404).json({ error: 'Módulo não encontrado' });
    return;
  }

  const resultado = await prisma.$transaction(async (tx) => {
    const modulo = await tx.modulo.update({ where: { id }, data: { status }, select: { id: true, slug: true, status: true } });
    let licoesAtualizadas = 0;
    if (incluirLicoes) {
      const r = await tx.licao.updateMany({
        where: { moduloId: id },
        data: { status, ...(status === 'publicado' && { revisadoPorId: req.user.id, revisadoEm: new Date() }) },
      });
      licoesAtualizadas = r.count;
    }
    return { ...modulo, licoesAtualizadas };
  });
  res.json(resultado);
}

export async function getTesteModulo(req: AuthRequest, res: Response) {
  const id = idParam(req.params.id);
  if (!id) {
    res.status(400).json({ error: 'ID inválido' });
    return;
  }
  const modulo = await prisma.modulo.findUnique({
    where: { id },
    select: { id: true, slug: true, titulo: true, itensTeste: { orderBy: [{ forma: 'asc' }, { ordem: 'asc' }] } },
  });
  if (!modulo) {
    res.status(404).json({ error: 'Módulo não encontrado' });
    return;
  }

  const formas = new Map<number, typeof modulo.itensTeste>();
  for (const item of modulo.itensTeste) formas.set(item.forma, [...(formas.get(item.forma) ?? []), item]);

  res.json({
    modulo: { id: modulo.id, slug: modulo.slug, titulo: modulo.titulo },
    formas: [...formas].map(([forma, itens]) => ({ forma, itens })),
  });
}

/** Pré-visualização no editor: corrige um item ainda não salvo. */
export async function verificarItem(req: AuthRequest, res: Response) {
  const corpo = verificarSchema.safeParse(req.body);
  if (!corpo.success) return erroZod(res, corpo.error);
  const item = itemSchema.safeParse(corpo.data.item);
  if (!item.success) return erroZod(res, item.error);

  const resultado = comCorrecao(res, () => corrigirOuZerar(item.data, corpo.data.resposta));
  if (!resultado) return;
  res.json(resultado);
}
