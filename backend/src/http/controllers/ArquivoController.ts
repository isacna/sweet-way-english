import { Response } from 'express';
import { prisma } from '../../database/client.js';
import { AuthRequest } from '../../types/index.js';
import { caminhoAbsoluto, pastaUploads, tipoPrevisualizavel } from '../../storage/arquivos.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const turmaSelect = { select: { id: true, professorId: true } } as const;

/** Mesma resposta para "não existe" e "não pode ver": não revela que o arquivo existe. */
function naoEncontrado(res: Response) {
  res.status(404).json({ error: 'Arquivo não encontrado' });
}

/** `Content-Disposition` com o nome original (RFC 6266/5987) e um fallback ASCII. */
export function contentDisposition(tipo: 'inline' | 'attachment', nome: string) {
  const ascii = nome.normalize('NFD').replace(/[^\x20-\x7e]/g, '').replace(/["\\]/g, '_') || 'arquivo';
  const codificado = encodeURIComponent(nome).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return `${tipo}; filename="${ascii}"; filename*=UTF-8''${codificado}`;
}

/**
 * Quem pode ver um arquivo:
 *  - o dono (quem enviou);
 *  - a professora dona da turma a que o arquivo pertence (atividade, entrega ou material);
 *  - alunos matriculados na turma, para anexos de atividade e materiais;
 *  - numa entrega, só o próprio aluno (além da professora);
 *  - admin (conferido no banco, como em requireAdmin).
 */
async function podeVer(
  usuario: AuthRequest['user'],
  arquivo: {
    donoId: number;
    atividade: { turma: { id: number; professorId: number } } | null;
    material: { turma: { id: number; professorId: number } } | null;
    submissao: { alunoId: number; atividade: { turma: { id: number; professorId: number } } } | null;
  },
) {
  if (arquivo.donoId === usuario.id) return true;

  const turmaCompartilhada = arquivo.atividade?.turma ?? arquivo.material?.turma ?? null;
  const turmaDaEntrega = arquivo.submissao?.atividade.turma ?? null;

  if (usuario.role === 'professor') {
    if (turmaCompartilhada?.professorId === usuario.id || turmaDaEntrega?.professorId === usuario.id) return true;
  }
  if (usuario.role === 'aluno') {
    if (arquivo.submissao?.alunoId === usuario.id) return true;
    if (turmaCompartilhada) {
      const matricula = await prisma.matricula.findFirst({
        where: { turmaId: turmaCompartilhada.id, alunoId: usuario.id },
        select: { id: true },
      });
      if (matricula) return true;
    }
  }

  const conta = await prisma.usuario.findUnique({ where: { id: usuario.id }, select: { admin: true } });
  return conta?.admin === true;
}

/** GET /api/arquivos/:id — envia o arquivo para quem pode ver; 404 para todos os outros. */
export async function getArquivo(req: AuthRequest, res: Response) {
  const id = String(req.params.id ?? '');
  if (!UUID.test(id)) return naoEncontrado(res);

  const arquivo = await prisma.arquivo.findUnique({
    where: { id },
    include: {
      atividade: { select: { turma: turmaSelect } },
      material: { select: { turma: turmaSelect } },
      submissao: { select: { alunoId: true, atividade: { select: { turma: turmaSelect } } } },
    },
  });
  if (!arquivo || !(await podeVer(req.user, arquivo))) return naoEncontrado(res);

  try {
    caminhoAbsoluto(arquivo.caminho); // recusa nomes com pasta ou ".."
  } catch {
    return naoEncontrado(res);
  }

  const inline = tipoPrevisualizavel(arquivo.mime);
  res.setHeader('Content-Type', arquivo.mime === 'text/plain' ? 'text/plain; charset=utf-8' : arquivo.mime);
  res.setHeader('Content-Disposition', contentDisposition(inline ? 'inline' : 'attachment', arquivo.nomeOriginal));
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, no-cache');
  // O frontend (outra origem) lê o nome do arquivo para o download
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

  // `root`: a checagem de dotfiles vale só para o nome do arquivo, não para a pasta (que pode estar sob ".algo/")
  res.sendFile(arquivo.caminho, { root: pastaUploads(), cacheControl: false, dotfiles: 'deny' }, (err) => {
    if (!err) return;
    if (!res.headersSent) {
      res.removeHeader('Content-Disposition');
      naoEncontrado(res);
    } else {
      console.error('Falha ao enviar arquivo', arquivo.id, err);
    }
  });
}
