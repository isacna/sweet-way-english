// Progresso dos alunos no curso autoguiado, visto pela professora (requireRole('professor')).
import { Response } from 'express';
import { prisma } from '../../database/client.js';
import { AuthRequest } from '../../types/index.js';
import { ofensivaVigente } from '../../domain/progresso.js';
import { filtroRevisaoPendente, idParam } from './cursoApoio.js';

const PUBLICADO = 'publicado' as const;

export async function progressoAlunos(req: AuthRequest, res: Response) {
  let turmaId: number | null = null;
  if (req.query.turmaId !== undefined && req.query.turmaId !== '') {
    turmaId = idParam(req.query.turmaId);
    if (!turmaId) {
      res.status(400).json({ error: 'Turma inválida' });
      return;
    }
    const turma = await prisma.turma.findFirst({ where: { id: turmaId, professorId: req.user.id }, select: { id: true } });
    if (!turma) {
      res.status(404).json({ error: 'Turma não encontrada' });
      return;
    }
  }

  const agora = new Date();
  const [modulos, matriculas] = await Promise.all([
    prisma.modulo.findMany({
      where: { status: PUBLICADO },
      orderBy: [{ nivel: { ordem: 'asc' } }, { ordem: 'asc' }],
      select: { id: true, slug: true, ordem: true, titulo: true, _count: { select: { licoes: { where: { status: PUBLICADO } } } } },
    }),
    prisma.matricula.findMany({
      where: { turma: { professorId: req.user.id, ...(turmaId && { id: turmaId }) }, aluno: { papel: 'aluno' } },
      include: {
        aluno: { select: { id: true, nome: true, email: true } },
        turma: { select: { id: true, nome: true } },
      },
    }),
  ]);

  const alunosPorId = new Map<number, { id: number; nome: string; email: string; turmas: { id: number; nome: string }[] }>();
  for (const m of matriculas) {
    const a = alunosPorId.get(m.aluno.id) ?? { ...m.aluno, turmas: [] };
    if (!a.turmas.some((t) => t.id === m.turma.id)) a.turmas.push(m.turma);
    alunosPorId.set(a.id, a);
  }
  const ids = [...alunosPorId.keys()];

  const [perfis, concluidas, tentativas, revisoes] = ids.length
    ? await Promise.all([
        prisma.perfilAprendiz.findMany({ where: { usuarioId: { in: ids } } }),
        prisma.progressoLicao.findMany({
          where: { usuarioId: { in: ids }, concluida: true, licao: { status: PUBLICADO } },
          select: { usuarioId: true, licao: { select: { moduloId: true } } },
        }),
        prisma.tentativaTeste.findMany({
          where: { usuarioId: { in: ids }, finalizadaEm: { not: null } },
          select: { usuarioId: true, moduloId: true, aprovado: true, percentual: true },
        }),
        prisma.revisaoItem.findMany({
          where: filtroRevisaoPendente({ in: ids }, agora),
          select: { usuarioId: true },
        }),
      ])
    : [[], [], [], []];

  const perfilPorAluno = new Map(perfis.map((p) => [p.usuarioId, p]));
  const contar = <K>(m: Map<K, number>, k: K) => m.set(k, (m.get(k) ?? 0) + 1);
  const licoesPor = new Map<string, number>();
  for (const c of concluidas) contar(licoesPor, `${c.usuarioId}:${c.licao.moduloId}`);
  const revisoesPor = new Map<number, number>();
  for (const r of revisoes) contar(revisoesPor, r.usuarioId);

  const alunos = [...alunosPorId.values()]
    .sort((x, y) => x.nome.localeCompare(y.nome, 'pt-BR'))
    .map((a) => {
      const perfil = perfilPorAluno.get(a.id);
      return {
        id: a.id,
        nome: a.nome,
        email: a.email,
        xp: perfil?.xp ?? 0,
        ofensivaAtual: perfil ? ofensivaVigente(perfil, agora) : 0,
        ultimoEstudoEm: perfil?.ultimoEstudoEm?.toISOString() ?? null,
        revisoesPendentes: revisoesPor.get(a.id) ?? 0,
        turmas: a.turmas,
        modulos: modulos.map((m) => {
          const doModulo = tentativas.filter((t) => t.usuarioId === a.id && t.moduloId === m.id);
          const percentuais = doModulo.map((t) => t.percentual).filter((p): p is number => typeof p === 'number');
          return {
            moduloId: m.id,
            licoesConcluidas: licoesPor.get(`${a.id}:${m.id}`) ?? 0,
            testeAprovado: doModulo.some((t) => t.aprovado === true),
            melhorPercentualTeste: percentuais.length ? Math.max(...percentuais) : null,
            tentativasTeste: doModulo.length,
          };
        }),
      };
    });

  res.json({
    modulos: modulos.map((m) => ({ id: m.id, slug: m.slug, ordem: m.ordem, titulo: m.titulo, totalLicoes: m._count.licoes })),
    alunos,
  });
}
