// Envio de e-mail transacional com provedor trocável.
// Com RESEND_API_KEY usa a API HTTP do Resend (fetch, sem SDK); sem ela, só registra a mensagem no log (dev).
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

export interface Mensagem {
  para: string;
  assunto: string;
  html: string;
  texto: string;
  /** Cabeçalhos extras da mensagem (ex.: List-Unsubscribe nos lembretes). */
  cabecalhos?: Record<string, string>;
}

export interface ProvedorEmail {
  nome: string;
  enviar(msg: Mensagem): Promise<void>;
}

export const provedorConsole: ProvedorEmail = {
  nome: 'console',
  async enviar(msg) {
    // Em produção o destinatário e o texto (com o link de nova senha) NÃO vão para o log: quem lê o log poderia
    // trocar a senha de outra pessoa. Fora de produção o link aparece, para testar o fluxo sem provedor.
    if (env.NODE_ENV === 'production') {
      logger.warn({ assunto: msg.assunto }, 'E-mail não enviado: RESEND_API_KEY não definida');
      return;
    }
    logger.info(`[email] (não enviado: sem RESEND_API_KEY)\nPara: ${msg.para}\nAssunto: ${msg.assunto}\n\n${msg.texto}\n`);
  },
};

export function provedorResend(apiKey: string, remetente: string): ProvedorEmail {
  return {
    nome: 'resend',
    async enviar(msg) {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: remetente,
          to: [msg.para],
          subject: msg.assunto,
          html: msg.html,
          text: msg.texto,
          ...(msg.cabecalhos ? { headers: msg.cabecalhos } : {}),
        }),
      });
      if (!r.ok) {
        const corpo = await r.text().catch(() => '');
        throw new Error(`Resend respondeu ${r.status}: ${corpo.slice(0, 300)}`);
      }
    },
  };
}

function provedorAtual(): ProvedorEmail {
  return env.RESEND_API_KEY ? provedorResend(env.RESEND_API_KEY, env.EMAIL_FROM) : provedorConsole;
}

export async function enviarEmail(msg: Mensagem): Promise<void> {
  await provedorAtual().enviar(msg);
}

/** Chamado na subida do servidor: em produção, sem provedor configurado, ninguém recebe o link de nova senha. */
export function avisarConfigEmail() {
  if (env.NODE_ENV === 'production' && !env.RESEND_API_KEY) {
    logger.warn(
      'RESEND_API_KEY não definida: os e-mails (recuperar senha) não são enviados e, em produção, nem aparecem no log.'
    );
  }
}
