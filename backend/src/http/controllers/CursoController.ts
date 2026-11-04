// Curso autoguiado — lado do aluno (rotas com requireRole('aluno')). Contrato em docs/api-curso.md.
import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../database/client.js';
import type { Prisma } from '../../database/generated/prisma/client.js';
import { AuthRequest } from '../../types/index.js';
import type { Resultado } from '../../domain/correcao.js';
import { escolherForma, percentualDe } from '../../domain/desbloqueio.js';
import {
  ESPERA_REPROVACAO_HORAS,
  PERCENTUAL_DOMINIO_LICAO,
  XP,
  avaliarTeste,
  proximaRevisao,
} from '../../domain/progresso.js';
import {
  carregarTrilha,
  colocarNaRevisao,
  comCorrecao,
  corrigirOuZerar,
  erroZod,
  estadoDaLicao,
  exercicioPublico,
  filtroRevisaoPendente,
  idParam,
  itemTestePublico,
  listaNumeros,
  listaTextos,
  perfilPublico,
  proximaLicaoId,
  registrarEstudo,
} from './cursoApoio.js';

const HORA_MS = 60 * 60 * 1000;
const LIMITE_REVISAO = 20;

const respostaSchema = z.object({ resposta: z.json() });
const respostasSchema = z.object({ respostas: z.record(z.string(), z.json()) });
const perfilSchema = z.object({ metodologia: z.enum(['gramatica', 'comunicativa', 'gamificada', 'input']) });

// ─── Trilha ─────────────────────────────────────────────────────────────────

export async function getTrilha(req: AuthRequest, res: Response) {
  const agora = new Date();
  const [perfil, trilha] = await Promise.all([perfilPublico(req.user.id, agora), carregarTrilha(req.user.id, agora)]);

  const niveis = trilha.niveis
    .filter((n) => n.modulos.length > 0)
    .map((n) => ({
      id: n.id,
      codigo: n.codigo,
      nome: n.nome,
      descricao: n.descricao,
      modulos: n.modulos.map((m) => {
        const estado = trilha.estados.get(m.id)!;
        return {
          id: m.id,
          slug: m.slug,
          ordem: m.ordem,
          titulo: m.titulo,
          tema: m.tema,
          descricao: m.descricao,
          canDos: listaTextos(m.canDos),
          gramatica: m.gramatica,
          vocabulario: m.vocabulario,
          funcao: m.funcao,
          desbloqueado: estado.desbloqueado,
          licoesConcluidas: estado.licoesConcluidas,
          totalLicoes: estado.totalLicoes,
          teste: {
            disponivel: estado.testeDisponivel,
            aprovado: estado.aprovado,
            melhorPercentual: estado.melhorPercentual,
            tentativas: estado.tentativas,
            bloqueadoAte: estado.bloqueadoAte?.toISOString() ?? null,
          },
          licoes: m.licoes.map((l) => {
            const el = estado.licoes.get(l.id)!;
            return {
              id: l.id,
              ordem: l.ordem,
              titulo: l.titulo,
              objetivo: l.objetivo,
              minutosEstimados: l.minutosEstimados,
              desbloqueada: el.desbloqueada,
              concluida: el.concluida,
              melhorPercentual: trilha.progressoPorLicao.get(l.id)?.melhorPercentual ?? 0,
            };
          }),
        };
      }),
    }));

  res.json({ perfil, niveis });
}

// ─── Lição ──────────────────────────────────────────────────────────────────

/** Busca a lição e confere publicação (404) e desbloqueio (403). Responde o erro e devolve null. */
async function licaoLiberada(req: AuthRequest, res: Response, licaoId: number) {
  const licao = await prisma.licao.findUnique({
    where: { id: licaoId },
    include: { modulo: { select: { id: true, slug: true, titulo: true, ordem: true } } },
  });
  const trilha = licao ? await carregarTrilha(req.user.id) : null;
  const estado = licao && trilha ? estadoDaLicao(trilha, licao.moduloId, licao.id) : null;
  if (!licao || !trilha || !estado) {
    res.status(404).json({ error: 'Lição não encontrada' });
    return null;
  }
  if (!estado.licao.desbloqueada) {
    res.status(403).json({ error: 'Conclua a lição anterior para liberar esta' });
    return null;
  }
  return { licao, trilha, estado };
}

export async function getLicao(req: AuthRequest, res: Response) {
  const id = idParam(req.params.id);
  if (!id) {
    res.status(400).json({ error: 'ID inválido' });
    return;
  }
  const ok = await licaoLiberada(req, res, id);
  if (!ok) return;
  const { licao, trilha } = ok;

  const exercicios = await prisma.exercicio.findMany({ where: { licaoId: id }, orderBy: { ordem: 'asc' } });
  const progresso = trilha.progressoPorLicao.get(id);

  res.json({
    id: licao.id,
    slug: licao.slug,
    ordem: licao.ordem,
    titulo: licao.titulo,
    objetivo: licao.objetivo,
    minutosEstimados: licao.minutosEstimados,
    modulo: licao.modulo,
    apresentacao: licao.apresentacao,
    exercicios: exercicios.map(exercicioPublico),
    progresso: {
      concluida: progresso?.concluida ?? false,
      melhorPercentual: progresso?.melhorPercentual ?? 0,
      tentativas: progresso?.tentativas ?? 0,
    },
    proximaLicaoId: proximaLicaoId(trilha, licao.moduloId, licao.id),
  });
}

// ─── Prática (controlada, semicontrolada, produção) ─────────────────────────

export async function verificarExercicio(req: AuthRequest, res: Response) {
  const id = idParam(req.params.id);
  if (!id) {
    res.status(400).json({ error: 'ID inválido' });
    return;
  }
  const corpo = respostaSchema.safeParse(req.body);
  if (!corpo.success) return erroZod(res, corpo.error);

  const exercicio = await prisma.exercicio.findUnique({ where: { id } });
  if (!exercicio) {
    res.status(404).json({ error: 'Exercício não encontrado' });
    return;
  }
  if (!(await licaoLiberada(req, res, exercicio.licaoId))) return;
  if (exercicio.etapa === 'quiz') {
    res.status(400).json({ error: 'Itens do mini-quiz são corrigidos juntos, ao enviar o quiz' });
    return;
  }

  const resultado = comCorrecao(res, () => corrigirOuZerar(exercicio, corpo.data.resposta));
  if (!resultado) return;

  const agora = new Date();
  await prisma.$transaction(async (tx) => {
    if (!resultado.correto) await colocarNaRevisao(tx, req.user.id, exercicio.id, agora);
    await registrarEstudo(tx, req.user.id, 0, agora); // sem XP na prática (evita farmar)
  });

  res.json(resultado);
}

// ─── Mini-quiz ──────────────────────────────────────────────────────────────

export async function enviarQuiz(req: AuthRequest, res: Response) {
  const id = idParam(req.params.id);
  if (!id) {
    res.status(400).json({ error: 'ID inválido' });
    return;
  }
  const corpo = respostasSchema.safeParse(req.body);
  if (!corpo.success) return erroZod(res, corpo.error);

  const ok = await licaoLiberada(req, res, id);
  if (!ok) return;

  const quiz = await prisma.exercicio.findMany({ where: { licaoId: id, etapa: 'quiz' }, orderBy: { ordem: 'asc' } });
  if (!quiz.length) {
    res.status(409).json({ error: 'Esta lição ainda não tem mini-quiz' });
    return;
  }

  const resultados = comCorrecao(res, () =>
    quiz.map((e) => ({ exercicioId: e.id, ...corrigirOuZerar(e, corpo.data.respostas[String(e.id)]) })),
  );
  if (!resultados) return;

  const percentual = percentualDe(resultados.map((r) => r.pontuacao));
  const aprovado = percentual >= PERCENTUAL_DOMINIO_LICAO;
  const usuarioId = req.user.id;
  const agora = new Date();

  const { xpGanho, licaoConcluida } = await prisma.$transaction(async (tx) => {
    const anterior = await tx.progressoLicao.findUnique({ where: { usuarioId_licaoId: { usuarioId, licaoId: id } } });
    const jaConcluida = anterior?.concluida ?? false;
    const melhorAnterior = anterior?.melhorPercentual ?? 0;

    let xp = 0;
    if (aprovado && !jaConcluida) xp = XP.licaoConcluida;
    else if (aprovado && jaConcluida && percentual > melhorAnterior) xp = XP.licaoMelhorada;

    const concluidaAgora = aprovado && !jaConcluida;
    await tx.progressoLicao.upsert({
      where: { usuarioId_licaoId: { usuarioId, licaoId: id } },
      create: {
        usuarioId,
        licaoId: id,
        tentativas: 1,
        melhorPercentual: percentual,
        concluida: aprovado,
        concluidaEm: aprovado ? agora : null,
      },
      update: {
        tentativas: { increment: 1 },
        melhorPercentual: Math.max(melhorAnterior, percentual),
        ...(concluidaAgora && { concluida: true, concluidaEm: agora }),
      },
    });

    for (const r of resultados) if (!r.correto) await colocarNaRevisao(tx, usuarioId, r.exercicioId, agora);
    await registrarEstudo(tx, usuarioId, xp, agora);

    return { xpGanho: xp, licaoConcluida: jaConcluida || aprovado };
  });

  res.json({
    percentual,
    aprovado,
    resultados,
    xpGanho,
    licaoConcluida,
    proximaLicaoId: proximaLicaoId(ok.trilha, ok.licao.moduloId, id),
  });
}

// ─── Revisão espaçada ───────────────────────────────────────────────────────

export async function listarRevisao(req: AuthRequest, res: Response) {
  const where = filtroRevisaoPendente(req.user.id, new Date());
  const [itens, total] = await Promise.all([
    prisma.revisaoItem.findMany({
      where,
      orderBy: { proximaEm: 'asc' },
      take: LIMITE_REVISAO,
      include: { exercicio: { include: { licao: { select: { titulo: true } } } } },
    }),
    prisma.revisaoItem.count({ where }),
  ]);

  res.json({
    itens: itens.map((r) => ({ ...exercicioPublico(r.exercicio), caixa: r.caixa, licaoTitulo: r.exercicio.licao.titulo })),
    total,
  });
}

export async function responderRevisao(req: AuthRequest, res: Response) {
  const exercicioId = idParam(req.params.exercicioId);
  if (!exercicioId) {
    res.status(400).json({ error: 'ID inválido' });
    return;
  }
  const corpo = respostaSchema.safeParse(req.body);
  if (!corpo.success) return erroZod(res, corpo.error);

  const agora = new Date();
  const usuarioId = req.user.id;
  const item = await prisma.revisaoItem.findFirst({
    where: { usuarioId, exercicioId, exercicio: { licao: { status: 'publicado', modulo: { status: 'publicado' } } } },
    include: { exercicio: true },
  });
  if (!item) {
    res.status(404).json({ error: 'Este exercício não está na sua revisão' });
    return;
  }
  // Desvio documentado em docs/api-curso.md: item ainda não vencido não pode ser respondido (evita farmar XP)
  if (item.proximaEm.getTime() > agora.getTime()) {
    res.status(409).json({ error: 'Este item ainda não está na hora de revisar', proximaEm: item.proximaEm.toISOString() });
    return;
  }

  const resultado = comCorrecao(res, () => corrigirOuZerar(item.exercicio, corpo.data.resposta));
  if (!resultado) return;

  const proxima = proximaRevisao(item.caixa, resultado.correto, agora);
  const xpGanho = resultado.correto ? XP.revisaoCorreta : 0;

  await prisma.$transaction(async (tx) => {
    await tx.revisaoItem.update({
      where: { id: item.id },
      data: {
        caixa: proxima.caixa,
        proximaEm: proxima.proximaEm,
        ...(resultado.correto ? { acertos: { increment: 1 } } : { erros: { increment: 1 } }),
      },
    });
    await registrarEstudo(tx, usuarioId, xpGanho, agora);
  });

  res.json({ ...resultado, caixa: proxima.caixa, proximaEm: proxima.proximaEm.toISOString(), xpGanho });
}

// ─── Teste de módulo ────────────────────────────────────────────────────────

export async function iniciarTeste(req: AuthRequest, res: Response) {
  const moduloId = idParam(req.params.id);
  if (!moduloId) {
    res.status(400).json({ error: 'ID inválido' });
    return;
  }
  const usuarioId = req.user.id;
  const agora = new Date();
  const trilha = await carregarTrilha(usuarioId, agora);
  const estado = trilha.estados.get(moduloId);
  if (!estado) {
    res.status(404).json({ error: 'Módulo não encontrado' });
    return;
  }
  if (!estado.desbloqueado) {
    res.status(403).json({ error: 'Seja aprovado no teste do módulo anterior para liberar este' });
    return;
  }
  if (!estado.todasConcluidas) {
    res.status(409).json({ error: 'Conclua todas as lições do módulo antes do teste' });
    return;
  }

  const aberta = await prisma.tentativaTeste.findFirst({
    where: { usuarioId, moduloId, finalizadaEm: null },
    orderBy: { iniciadaEm: 'desc' },
  });
  if (aberta) {
    const itens = await itensDaTentativa(listaNumeros(aberta.itemIds));
    res.json({ tentativaId: aberta.id, forma: aberta.forma, itens: itens.map(itemTestePublico) });
    return;
  }

  if (estado.bloqueadoAte) {
    res.status(423).json({
      error: `Você poderá tentar de novo após ${ESPERA_REPROVACAO_HORAS} horas`,
      bloqueadoAte: estado.bloqueadoAte.toISOString(),
    });
    return;
  }

  const [formas, ultima] = await Promise.all([
    prisma.itemTeste.findMany({ where: { moduloId }, distinct: ['forma'], select: { forma: true } }),
    prisma.tentativaTeste.findFirst({ where: { usuarioId, moduloId }, orderBy: { iniciadaEm: 'desc' }, select: { forma: true } }),
  ]);
  const forma = escolherForma(
    formas.map((f) => f.forma),
    ultima?.forma ?? null,
  );
  if (forma === null) {
    res.status(409).json({ error: 'O teste deste módulo ainda não está pronto' });
    return;
  }

  const itens = await prisma.itemTeste.findMany({ where: { moduloId, forma }, orderBy: { ordem: 'asc' } });
  const tentativa = await prisma.tentativaTeste.create({
    data: { usuarioId, moduloId, forma, itemIds: itens.map((i) => i.id) },
  });

  res.status(201).json({ tentativaId: tentativa.id, forma, itens: itens.map(itemTestePublico) });
}

/** Itens na ordem em que foram apresentados. */
async function itensDaTentativa(ids: number[]) {
  const itens = await prisma.itemTeste.findMany({ where: { id: { in: ids } } });
  const porId = new Map(itens.map((i) => [i.id, i]));
  return ids.map((id) => porId.get(id)).filter((i): i is NonNullable<typeof i> => Boolean(i));
}

export async function finalizarTentativa(req: AuthRequest, res: Response) {
  const id = idParam(req.params.id);
  if (!id) {
    res.status(400).json({ error: 'ID inválido' });
    return;
  }
  const corpo = respostasSchema.safeParse(req.body);
  if (!corpo.success) return erroZod(res, corpo.error);

  const usuarioId = req.user.id;
  const tentativa = await prisma.tentativaTeste.findUnique({ where: { id } });
  if (!tentativa || tentativa.usuarioId !== usuarioId) {
    res.status(404).json({ error: 'Tentativa não encontrada' });
    return;
  }
  if (tentativa.finalizadaEm) {
    res.status(409).json({ error: 'Esta tentativa já foi finalizada' });
    return;
  }

  const itens = await itensDaTentativa(listaNumeros(tentativa.itemIds));
  const resultados = comCorrecao(res, () =>
    itens.map((i) => ({
      itemId: i.id,
      habilidade: i.habilidade,
      ...corrigirOuZerar(i, corpo.data.respostas[String(i.id)]),
    })),
  );
  if (!resultados) return;

  const { percentual, porHabilidade, aprovado } = avaliarTeste(resultados);
  const agora = new Date();
  const bloqueadoAte = aprovado ? null : new Date(agora.getTime() + ESPERA_REPROVACAO_HORAS * HORA_MS);

  const xpGanho = await prisma.$transaction(async (tx) => {
    const jaAprovado = await tx.tentativaTeste.count({ where: { usuarioId, moduloId: tentativa.moduloId, aprovado: true } });
    // `finalizadaEm: null` no filtro impede finalizar a mesma tentativa duas vezes em paralelo
    const { count } = await tx.tentativaTeste.updateMany({
      where: { id, finalizadaEm: null },
      data: {
        respostas: corpo.data.respostas as Prisma.InputJsonObject,
        percentual,
        porHabilidade,
        aprovado,
        finalizadaEm: agora,
      },
    });
    if (count === 0) return null;
    const xp = aprovado && jaAprovado === 0 ? XP.testeAprovado : 0;
    await registrarEstudo(tx, usuarioId, xp, agora);
    return xp;
  });
  if (xpGanho === null) {
    res.status(409).json({ error: 'Esta tentativa já foi finalizada' });
    return;
  }

  let proximoModuloId: number | null = null;
  if (aprovado) {
    const trilha = await carregarTrilha(usuarioId, agora);
    proximoModuloId = trilha.estados.get(tentativa.moduloId)?.proximoModuloId ?? null;
  }

  res.json({
    percentual,
    porHabilidade,
    aprovado,
    resultados: resultados satisfies ({ itemId: number; habilidade: string } & Resultado)[],
    xpGanho,
    bloqueadoAte: bloqueadoAte?.toISOString() ?? null,
    proximoModuloId,
  });
}

// ─── Perfil ─────────────────────────────────────────────────────────────────

export async function atualizarPerfil(req: AuthRequest, res: Response) {
  const corpo = perfilSchema.safeParse(req.body);
  if (!corpo.success) {
    res.status(400).json({ error: 'Metodologia inválida' });
    return;
  }
  if (corpo.data.metodologia !== 'gramatica') {
    res.status(400).json({ error: 'Esta metodologia estará disponível em breve' });
    return;
  }
  await prisma.perfilAprendiz.upsert({
    where: { usuarioId: req.user.id },
    update: { metodologia: corpo.data.metodologia },
    create: { usuarioId: req.user.id, metodologia: corpo.data.metodologia },
  });
  res.json(await perfilPublico(req.user.id));
}
