// Modelos de e-mail (português). Sempre com versão em texto puro, para clientes que não mostram HTML.

function escaparHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export function emailRedefinirSenha({ nome, link }: { nome: string; link: string }) {
  const primeiroNome = nome.trim().split(/\s+/)[0] || 'olá';
  const assunto = 'Redefinir sua senha – Sweet Way English';
  const texto = [
    `Oi, ${primeiroNome}!`,
    '',
    'Recebemos um pedido para redefinir a senha da sua conta na Sweet Way English.',
    'Para criar uma nova senha, abra o link abaixo (ele vale por 1 hora e só pode ser usado uma vez):',
    '',
    link,
    '',
    'Se você não pediu isso, pode ignorar este e-mail: sua senha continua a mesma.',
  ].join('\n');

  const n = escaparHtml(primeiroNome);
  const l = escaparHtml(link);
  const html = `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:24px;background:#f6f4ef;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr><td align="center">
        <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;padding:32px">
          <tr><td>
            <h1 style="margin:0 0 16px;font-size:20px">Redefinir sua senha</h1>
            <p style="margin:0 0 12px;line-height:1.5">Oi, ${n}!</p>
            <p style="margin:0 0 20px;line-height:1.5">Recebemos um pedido para redefinir a senha da sua conta na Sweet Way English. Clique no botão para criar uma nova senha.</p>
            <p style="margin:0 0 24px"><a href="${l}" style="display:inline-block;background:#1f2937;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold">Criar nova senha</a></p>
            <p style="margin:0 0 12px;line-height:1.5;font-size:14px;color:#4b5563">O link vale por 1 hora e só pode ser usado uma vez. Se o botão não funcionar, copie e cole este endereço no navegador:</p>
            <p style="margin:0 0 20px;font-size:13px;word-break:break-all"><a href="${l}" style="color:#1f2937">${l}</a></p>
            <p style="margin:0;line-height:1.5;font-size:14px;color:#4b5563">Se você não pediu isso, pode ignorar este e-mail: sua senha continua a mesma.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  return { assunto, html, texto };
}

// ─── Lembretes de estudo (opt-in) ───────────────────────────────────────────

interface DadosLembrete {
  nome: string;
  /** Painel do aluno. */
  linkEstudar: string;
  /** Página que desliga os lembretes com um clique. */
  linkCancelar: string;
}

function primeiroNomeDe(nome: string) {
  return nome.trim().split(/\s+/)[0] || 'olá';
}

/** Mesmo visual do e-mail de senha: título, parágrafos, um botão e o rodapé para parar de receber. */
function montarLembrete(
  { nome, linkEstudar, linkCancelar }: DadosLembrete,
  { assunto, titulo, paragrafos, botao }: { assunto: string; titulo: string; paragrafos: string[]; botao: string },
) {
  const primeiroNome = primeiroNomeDe(nome);
  const texto = [
    `Oi, ${primeiroNome}!`,
    '',
    ...paragrafos,
    '',
    `${botao}: ${linkEstudar}`,
    '',
    '--',
    'Você recebe este e-mail porque ativou os lembretes de estudo na Sweet Way English.',
    `Para parar de receber, abra: ${linkCancelar}`,
  ].join('\n');

  const e = escaparHtml(linkEstudar);
  const c = escaparHtml(linkCancelar);
  const html = `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:24px;background:#f6f4ef;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr><td align="center">
        <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;padding:32px">
          <tr><td>
            <h1 style="margin:0 0 16px;font-size:20px">${escaparHtml(titulo)}</h1>
            <p style="margin:0 0 12px;line-height:1.5">Oi, ${escaparHtml(primeiroNome)}!</p>
${paragrafos.map((p) => `            <p style="margin:0 0 12px;line-height:1.5">${escaparHtml(p)}</p>`).join('\n')}
            <p style="margin:8px 0 24px"><a href="${e}" style="display:inline-block;background:#1f2937;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold">${escaparHtml(botao)}</a></p>
            <p style="margin:0;line-height:1.5;font-size:13px;color:#4b5563">Você recebe este e-mail porque ativou os lembretes de estudo na Sweet Way English. <a href="${c}" style="color:#4b5563">Parar de receber lembretes</a>.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  return { assunto, html, texto };
}

/** Estudou ontem e ainda não estudou hoje: a ofensiva de `dias` dias acaba à meia-noite. */
export function emailLembreteOfensiva(dados: DadosLembrete & { dias: number }) {
  return montarLembrete(dados, {
    assunto: `Sua ofensiva de ${dados.dias} dias continua hoje? – Sweet Way English`,
    titulo: `${dados.dias} dias seguidos de estudo`,
    paragrafos: [
      `Você está há ${dados.dias} dias seguidos estudando inglês, e ainda falta o estudo de hoje.`,
      'Uma revisão rápida ou uma lição curta já mantém a sua ofensiva. Cinco minutos bastam.',
    ],
    botao: 'Estudar agora',
  });
}

/** Último estudo há `dias` dias. */
export function emailLembreteSaudade(dados: DadosLembrete & { dias: number }) {
  return montarLembrete(dados, {
    assunto: 'Sentimos sua falta – Sweet Way English',
    titulo: 'Sentimos sua falta',
    paragrafos: [
      `Faz ${dados.dias} dias que você não estuda inglês com a gente.`,
      'Seu progresso está guardado: é só continuar de onde parou. Uma lição curta hoje já coloca você de volta no ritmo.',
    ],
    botao: 'Continuar o curso',
  });
}

/** Abriu o curso e ainda não fez nenhuma lição. */
export function emailLembretePrimeiraLicao(dados: DadosLembrete) {
  return montarLembrete(dados, {
    assunto: 'Sua primeira lição está esperando – Sweet Way English',
    titulo: 'Sua primeira lição está esperando',
    paragrafos: [
      'Você já tem a sua conta na Sweet Way English, mas ainda não fez a primeira lição.',
      'Ela leva cerca de 15 minutos: uma explicação curta em português, prática com correção na hora e um mini-quiz.',
    ],
    botao: 'Começar a primeira lição',
  });
}
