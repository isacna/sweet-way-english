// Conquistas e certificados de nível do curso autoguiado. Contrato em docs/api-curso.md.
//  - Conquistas: derivadas do progresso (domain/conquistas.ts), nada é gravado.
//  - Certificado: uma linha por aluno e nível, criada na primeira consulta depois que o nível foi concluído.
//    O `codigo` é público e serve para qualquer pessoa conferir o certificado.
import { randomInt } from 'node:crypto';
import type { Request, Response } from 'express';
import { prisma } from '../../database/client.js';
import { AuthRequest } from '../../types/index.js';
import { calcularConquistas, nivelConcluido, type NivelDoAluno } from '../../domain/conquistas.js';
import { ErroNaoEncontrado } from '../../services/erros.js';
import { carregarTrilha, obterPerfil, type Trilha } from './cursoApoio.js';

// Sem 0/O/1/I/L, como o código de convite das turmas
const ALFABETO_CODIGO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const TAMANHO_CODIGO = 12;
const FORMATO_CODIGO = new RegExp(`^[${ALFABETO_CODIGO}]{${TAMANHO_CODIGO}}$`);
/** Colisão de código é quase impossível (31^12), mas ele é @unique: sorteia outro em vez de falhar. */
const TENTATIVAS_CODIGO = 3;

/** Código do certificado (31^12 ≈ 7,9e17): não dá para adivinhar o de outra pessoa. */
export function gerarCodigoCertificado() {
  let codigo = '';
  for (let i = 0; i < TAMANHO_CODIGO; i++) codigo += ALFABETO_CODIGO[randomInt(ALFABETO_CODIGO.length)];
  return codigo;
}

/** Níveis com módulos publicados e quantos testes de módulo o aluno já passou em cada um. */
function niveisDoAluno(trilha: Trilha) {
  return trilha.niveis
    .filter((n) => n.modulos.length > 0)
    .map((n) => ({
      id: n.id,
      codigo: n.codigo,
      nome: n.nome,
      totalModulos: n.modulos.length,
      modulosAprovados: n.modulos.filter((m) => trilha.estados.get(m.id)?.aprovado).length,
    }));
}

// ─── GET /curso/conquistas ──────────────────────────────────────────────────

export async function getConquistas(req: AuthRequest, res: Response) {
  const [perfil, trilha] = await Promise.all([obterPerfil(req.user.id), carregarTrilha(req.user.id)]);

  // Só lições publicadas (de módulos publicados) contam
  const progressos = trilha.modulos
    .flatMap((m) => m.licoes)
    .map((l) => trilha.progressoPorLicao.get(l.id))
    .filter((p) => p?.concluida);
  const niveis: NivelDoAluno[] = niveisDoAluno(trilha);

  res.json({
    conquistas: calcularConquistas({
      xp: perfil.xp,
      ofensivaMaxima: perfil.ofensivaMaxima,
      licoesConcluidas: progressos.length,
      licoesNotaMaxima: progressos.filter((p) => p!.melhorPercentual >= 100).length,
      niveis,
    }),
  });
}

// ─── GET /curso/certificados ────────────────────────────────────────────────

export async function getCertificados(req: AuthRequest, res: Response) {
  const usuarioId = req.user.id;
  const niveis = niveisDoAluno(await carregarTrilha(usuarioId));
  const concluidos = niveis.filter(nivelConcluido);

  const buscar = () => prisma.certificado.findMany({ where: { usuarioId } });
  let certificados = await buscar();
  const faltam = () => concluidos.filter((n) => !certificados.some((c) => c.nivelId === n.id));

  if (faltam().length) {
    const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId }, select: { nome: true } });
    for (let t = 0; usuario && t < TENTATIVAS_CODIGO && faltam().length; t++) {
      // INSERT ... ON CONFLICT DO NOTHING: duas abas ao mesmo tempo não brigam pela unique de (usuarioId, nivelId),
      // e um código repetido só deixa a linha para a próxima volta.
      await prisma.certificado.createMany({
        data: faltam().map((n) => ({
          codigo: gerarCodigoCertificado(),
          usuarioId,
          nivelId: n.id,
          nomeAluno: usuario.nome,
        })),
        skipDuplicates: true,
      });
      certificados = await buscar();
    }
  }

  res.json({
    niveis: niveis.map((n) => {
      // Um certificado já emitido continua valendo mesmo que um módulo novo seja publicado depois no nível
      const c = certificados.find((x) => x.nivelId === n.id);
      return {
        nivel: { id: n.id, codigo: n.codigo, nome: n.nome },
        concluido: nivelConcluido(n),
        modulosAprovados: n.modulosAprovados,
        totalModulos: n.totalModulos,
        certificado: c ? { codigo: c.codigo, emitidoEm: c.emitidoEm, nomeAluno: c.nomeAluno } : null,
      };
    }),
  });
}

// ─── GET /certificados/:codigo (público) ────────────────────────────────────

/** Conferência pública: só o nome impresso no certificado, o nível e a data. Nada mais sobre o aluno. */
export async function verificarCertificado(req: Request, res: Response) {
  // Aceita o código como aparece impresso (minúsculas, espaços ou hífens entre os grupos)
  const codigo = String(req.params.codigo ?? '')
    .toUpperCase()
    .replace(/[\s-]/g, '');
  if (!FORMATO_CODIGO.test(codigo)) throw new ErroNaoEncontrado('Certificado não encontrado');

  const certificado = await prisma.certificado.findUnique({
    where: { codigo },
    select: { nomeAluno: true, emitidoEm: true, nivel: { select: { codigo: true, nome: true } } },
  });
  if (!certificado) throw new ErroNaoEncontrado('Certificado não encontrado');

  res.json({ nomeAluno: certificado.nomeAluno, nivel: certificado.nivel, emitidoEm: certificado.emitidoEm });
}
