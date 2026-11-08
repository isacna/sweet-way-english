// Materiais de apoio das turmas: upload privado OU link externo (CHECK no banco).
import { prisma } from '../database/client.js';
import type { TipoMaterial } from '../database/generated/prisma/client.js';
import { arquivoResumoSelect } from '../http/arquivoPublico.js';
import { apagarArquivos, removerDoDisco } from '../storage/arquivos.js';
import { ErroNaoEncontrado, ErroValidacao } from './erros.js';
import { garantirAcessoTurma, turmaDaProfessora } from './turmas.js';
import type { GravarAnexo, UsuarioSessao } from './tipos.js';

const incluirArquivo = { arquivo: { select: arquivoResumoSelect } } as const;

export interface NovoMaterial {
  titulo: string;
  tipo: TipoMaterial;
  /** URL do link (ignorada quando vem arquivo) */
  url: string;
}

export async function criarMaterial(professorId: number, turmaId: number, dados: NovoMaterial, anexo: GravarAnexo | null) {
  await turmaDaProfessora(professorId, turmaId);

  if (!anexo && !dados.url) throw new ErroValidacao('Informe título, tipo e um arquivo ou URL');
  if (!anexo && !/^https?:\/\//i.test(dados.url)) {
    throw new ErroValidacao('A URL precisa começar com http:// ou https://');
  }

  const { titulo, tipo, url } = dados;
  // Com arquivo, a URL enviada junto é ignorada (o material é upload OU link)
  return anexo
    ? anexo((tx, a) => tx.materialApoio.create({ data: { titulo, tipo, turmaId, arquivoId: a.id }, include: incluirArquivo }))
    : prisma.materialApoio.create({ data: { titulo, tipo, turmaId, url }, include: incluirArquivo });
}

export async function apagarMaterial(professorId: number, turmaId: number, materialId: number) {
  await turmaDaProfessora(professorId, turmaId);

  const material = await prisma.materialApoio.findFirst({ where: { id: materialId, turmaId } });
  if (!material) throw new ErroNaoEncontrado('Material não encontrado');

  const caminhos = await prisma.$transaction(async (tx) => {
    await tx.materialApoio.delete({ where: { id: materialId } });
    return apagarArquivos(tx, [material.arquivoId]);
  });
  await removerDoDisco(caminhos);
}

export async function listarMateriais(usuario: UsuarioSessao, turmaId: number) {
  await garantirAcessoTurma(usuario, turmaId);
  return prisma.materialApoio.findMany({ where: { turmaId }, include: incluirArquivo });
}
