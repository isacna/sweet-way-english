// Configuração da escola (hoje só a logo, o único upload público).
import { prisma } from '../database/client.js';
import { env } from '../config/env.js';
import { caminhoAbsoluto, gravarNoDisco, removerDoDisco } from '../storage/arquivos.js';
import { ErroNaoEncontrado } from './erros.js';

async function obterOuCriar() {
  return prisma.configuracaoApp.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
}

/** URL pública e absoluta da logo; `v` muda a cada troca, então o navegador pode guardar em cache. */
function urlDaLogo(config: { logoCaminho: string | null; atualizadoEm: Date }) {
  if (!config.logoCaminho) return null;
  return `${env.APP_URL.replace(/\/$/, '')}/api/configuracoes/logo?v=${config.atualizadoEm.getTime()}`;
}

export async function configuracaoPublica() {
  return { logoUrl: urlDaLogo(await obterOuCriar()) };
}

/** Nome do arquivo da logo dentro da pasta de uploads (validado). 404 se não há logo. */
export async function caminhoDaLogo() {
  const config = await prisma.configuracaoApp.findUnique({ where: { id: 1 } });
  if (!config?.logoCaminho) throw new ErroNaoEncontrado('Nenhuma logo definida');
  try {
    caminhoAbsoluto(config.logoCaminho);
  } catch {
    throw new ErroNaoEncontrado('Logo não encontrada');
  }
  return config.logoCaminho;
}

/** Troca a logo (imagem já conferida pelos bytes) e apaga a anterior do disco. */
export async function trocarLogo(arquivo: { buffer: Buffer; ext: string }) {
  const anterior = await obterOuCriar();
  const caminho = await gravarNoDisco(arquivo.buffer, arquivo.ext);
  let config;
  try {
    config = await prisma.configuracaoApp.update({ where: { id: 1 }, data: { logoCaminho: caminho } });
  } catch (err) {
    await removerDoDisco([caminho]);
    throw err;
  }
  if (anterior.logoCaminho && anterior.logoCaminho !== caminho) await removerDoDisco([anterior.logoCaminho]);
  return { logoUrl: urlDaLogo(config) };
}
