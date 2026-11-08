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
