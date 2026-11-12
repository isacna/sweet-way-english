// Lembretes de estudo por e-mail (opt-in em PerfilAprendiz.lembretesEmail). As regras de quem recebe o quê estão em
// domain/lembretes.ts; aqui ficam a seleção no banco, o envio e o link para parar de receber.
// Quem dispara é o script `npm run lembretes:enviar` (cron); o servidor não tem timer.
import jwt from 'jsonwebtoken';
import { prisma } from '../database/client.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { decidirLembrete, DIAS_PRIMEIRA_LICAO, DIAS_SAUDADE, type Lembrete } from '../domain/lembretes.js';
import { enviarEmail } from '../email/index.js';
import { emailLembreteOfensiva, emailLembretePrimeiraLicao, emailLembreteSaudade } from '../email/templates.js';
import { ErroValidacao } from './erros.js';

// ─── Link para parar de receber ─────────────────────────────────────────────

const TIPO_TOKEN = 'cancelar-lembretes';
/** O link de um e-mail antigo continua valendo por bastante tempo; cada lembrete novo traz um link novo. */
const VALIDADE_TOKEN = '365d';
const DIA_MS = 24 * 60 * 60 * 1000;

/**
 * JWT só para desligar os lembretes. Não serve de sessão: `authenticateToken` exige `v` (versaoToken), que este
 * token não tem; e um token de sessão não serve aqui, porque não tem `tipo`.
 */
export function tokenCancelarLembretes(usuarioId: number): string {
  return jwt.sign({ tipo: TIPO_TOKEN, id: usuarioId }, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: VALIDADE_TOKEN,
  });
}

/** Id do usuário de um token válido de cancelamento, ou `null`. */
export function lerTokenCancelar(token: string): number | null {
  try {
    const p = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof p !== 'object' || p === null) return null;
    const { tipo, id } = p as { tipo?: unknown; id?: unknown };
    return tipo === TIPO_TOKEN && typeof id === 'number' && Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

export function linkCancelarLembretes(usuarioId: number): string {
  return `${env.frontendUrl}/lembretes/cancelar?token=${encodeURIComponent(tokenCancelarLembretes(usuarioId))}`;
}

/**
 * Desliga os lembretes de quem é dono do token. Token inválido ou vencido: 400.
 * Com token válido a resposta é sempre a mesma, mesmo se já estava desligado ou se a conta não existe mais.
 */
export async function cancelarLembretes(token: string): Promise<void> {
  const usuarioId = lerTokenCancelar(token);
  if (usuarioId === null) {
    throw new ErroValidacao('Link inválido ou expirado. Entre na sua conta para desligar os lembretes no painel.');
  }
  await prisma.perfilAprendiz.updateMany({ where: { usuarioId }, data: { lembretesEmail: false } });
}

// ─── Envio ──────────────────────────────────────────────────────────────────

function montarEmail(lembrete: Lembrete, nome: string, usuarioId: number) {
  const dados = { nome, linkEstudar: `${env.frontendUrl}/aluno`, linkCancelar: linkCancelarLembretes(usuarioId) };
  if (lembrete.tipo === 'ofensiva') return emailLembreteOfensiva({ ...dados, dias: lembrete.dias });
  if (lembrete.tipo === 'saudade') return emailLembreteSaudade({ ...dados, dias: lembrete.dias });
  return emailLembretePrimeiraLicao(dados);
}

/**
 * Cabeçalhos do "cancelar inscrição" que o Gmail e outros mostram ao lado do remetente (RFC 8058): o provedor faz
 * um POST nesse endereço, sem corpo JSON, por isso a rota também aceita o token na query.
 */
function cabecalhosCancelar(usuarioId: number): Record<string, string> {
  const url = `${env.frontendUrl}/api/lembretes/cancelar?token=${encodeURIComponent(tokenCancelarLembretes(usuarioId))}`;
  return { 'List-Unsubscribe': `<${url}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' };
}

export interface LembretePlanejado {
  usuarioId: number;
  email: string;
  lembrete: Lembrete;
}

export interface ResultadoLembretes {
  /** Perfis com lembretes ligados que entraram na análise. */
  candidatos: number;
  /** Lembretes enviados (ou, em simulação, que seriam enviados). */
  enviados: number;
  falhas: number;
  /** Sem provedor de e-mail em produção: nada foi enviado nem marcado. */
  semProvedor: boolean;
  simulacao: boolean;
  lista: LembretePlanejado[];
}

export interface OpcoesLembretes {
  agora?: Date;
  /** Só lista quem receberia o quê: não envia e não grava `ultimoLembreteEm`. */
  simular?: boolean;
  /** Pausa entre um envio e outro, para não bater no limite de requisições do provedor. */
  pausaMs?: number;
}

const pausa = (ms: number) => new Promise((ok) => setTimeout(ok, ms));

/**
 * Envia os lembretes do dia. Pode rodar mais de uma vez: cada perfil é "reservado" gravando `ultimoLembreteEm`
 * antes do envio (update condicional), então duas execuções ao mesmo tempo não mandam em dobro; se o envio falhar,
 * a marca é desfeita e a próxima execução tenta de novo.
 */
export async function enviarLembretes(opcoes: OpcoesLembretes = {}): Promise<ResultadoLembretes> {
  const agora = opcoes.agora ?? new Date();
  const simular = opcoes.simular ?? false;
  const pausaMs = opcoes.pausaMs ?? 600;
  const resultado: ResultadoLembretes = { candidatos: 0, enviados: 0, falhas: 0, semProvedor: false, simulacao: simular, lista: [] };

  // Em produção, sem RESEND_API_KEY, `enviarEmail` só registra um aviso: marcar como enviado seria mentira
  if (!simular && env.NODE_ENV === 'production' && !env.RESEND_API_KEY) {
    logger.warn('Lembretes não enviados: RESEND_API_KEY não definida');
    return { ...resultado, semProvedor: true };
  }

  // Corte largo no banco (com folga de um dia para o fuso); quem decide de verdade é decidirLembrete
  const desdeEstudo = new Date(agora.getTime() - (Math.max(...DIAS_SAUDADE) + 1) * DIA_MS);
  const desdeCriacao = new Date(agora.getTime() - (DIAS_PRIMEIRA_LICAO + 1) * DIA_MS);
  const perfis = await prisma.perfilAprendiz.findMany({
    where: {
      lembretesEmail: true,
      usuario: { papel: 'aluno' },
      OR: [{ ultimoEstudoEm: { gte: desdeEstudo } }, { ultimoEstudoEm: null, criadoEm: { gte: desdeCriacao } }],
    },
    select: {
      id: true,
      usuarioId: true,
      lembretesEmail: true,
      ultimoLembreteEm: true,
      ultimoEstudoEm: true,
      ofensivaAtual: true,
      criadoEm: true,
      usuario: { select: { nome: true, email: true, papel: true } },
    },
    orderBy: { id: 'asc' },
  });
  resultado.candidatos = perfis.length;

  let primeiro = true;
  for (const perfil of perfis) {
    const lembrete = decidirLembrete({ ...perfil, papel: perfil.usuario.papel }, agora);
    if (!lembrete) continue;
    const planejado: LembretePlanejado = { usuarioId: perfil.usuarioId, email: perfil.usuario.email, lembrete };

    if (simular) {
      resultado.lista.push(planejado);
      resultado.enviados++;
      continue;
    }

    // Reserva: só segue quem conseguir trocar a marca antiga pela nova (e ainda estiver com os lembretes ligados)
    const reserva = await prisma.perfilAprendiz.updateMany({
      where: { id: perfil.id, lembretesEmail: true, ultimoLembreteEm: perfil.ultimoLembreteEm },
      data: { ultimoLembreteEm: agora },
    });
    if (reserva.count !== 1) continue;

    if (!primeiro && pausaMs > 0) await pausa(pausaMs);
    primeiro = false;

    try {
      const { assunto, html, texto } = montarEmail(lembrete, perfil.usuario.nome, perfil.usuarioId);
      await enviarEmail({ para: perfil.usuario.email, assunto, html, texto, cabecalhos: cabecalhosCancelar(perfil.usuarioId) });
      resultado.lista.push(planejado);
      resultado.enviados++;
    } catch (err) {
      resultado.falhas++;
      // Sem o e-mail no log: só o id
      logger.error({ err, usuarioId: perfil.usuarioId, tipo: lembrete.tipo }, 'Falha ao enviar o lembrete de estudo');
      await prisma.perfilAprendiz
        .updateMany({ where: { id: perfil.id, ultimoLembreteEm: agora }, data: { ultimoLembreteEm: perfil.ultimoLembreteEm } })
        .catch((e) => logger.error({ err: e, usuarioId: perfil.usuarioId }, 'Falha ao desfazer a marca do lembrete'));
    }
  }

  return resultado;
}
