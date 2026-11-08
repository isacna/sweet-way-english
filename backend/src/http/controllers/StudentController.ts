import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../../types/index.js';
import { ehMenor } from '../../domain/idade.js';
import { edicaoUsuarioSchema, email, ERRO_SENHA, id, idCorpo, SENHA_MIN, texto, validar } from '../validacao.js';
import * as alunos from '../../services/alunos.js';

const MSG_OBRIGATORIOS = 'Nome, email e senha são obrigatórios';
const novoAlunoSchema = z.object({
  nome: texto(MSG_OBRIGATORIOS),
  email: email(MSG_OBRIGATORIOS),
  senha: z.string({ error: MSG_OBRIGATORIOS }).min(1, MSG_OBRIGATORIOS).min(SENHA_MIN, ERRO_SENHA),
});

// Dados opcionais de idade/responsável (LGPD art. 14), como no cadastro público
const responsavelSchema = z
  .object({
    dataNascimento: z.coerce.date({ error: 'Data de nascimento inválida' }).optional(),
    responsavelNome: z.string().trim().optional(),
    responsavelEmail: z.string().trim().toLowerCase().pipe(z.email('Email do responsável inválido')).optional(),
    consentimentoResponsavel: z.boolean().optional(),
  })
  .superRefine((d, ctx) => {
    if (!d.dataNascimento) return;
    if (d.dataNascimento > new Date()) {
      ctx.addIssue({ code: 'custom', path: ['dataNascimento'], message: 'Data de nascimento no futuro' });
      return;
    }
    if (ehMenor(d.dataNascimento) && (!d.responsavelNome || !d.responsavelEmail || d.consentimentoResponsavel !== true)) {
      ctx.addIssue({
        code: 'custom',
        path: ['consentimentoResponsavel'],
        message: 'Menores de 18 anos precisam do nome, email e consentimento de um responsável',
      });
    }
  });

const turmaSchema = z.object({ turmaId: idCorpo('Selecione uma turma para vincular o aluno') });
const paramsAluno = z.object({ id: id() });
const edicaoSchema = edicaoUsuarioSchema({ aparar: false });

const CAMPOS_RESPONSAVEL = ['dataNascimento', 'responsavelNome', 'responsavelEmail', 'consentimentoResponsavel'];

/** GET /professor/alunos — requireRole('professor') */
export async function listStudents(req: AuthRequest, res: Response) {
  res.json(await alunos.listarAlunos(req.user.id));
}

/** POST /professor/alunos — requireRole('professor') */
export async function createStudent(req: AuthRequest, res: Response) {
  const corpo = req.body ?? {};
  const base = validar(novoAlunoSchema, corpo);
  // Campos vazios vindos do formulário contam como ausentes
  const opcionais = Object.fromEntries(
    CAMPOS_RESPONSAVEL.map((k) => [k, corpo[k]]).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  );
  const responsavel = validar(responsavelSchema, opcionais);
  const { turmaId } = validar(turmaSchema, corpo);

  const aluno = await alunos.criarAluno(req.user.id, {
    ...base,
    turmaId,
    dataNascimento: responsavel.dataNascimento,
    responsavelNome: responsavel.responsavelNome,
    responsavelEmail: responsavel.responsavelEmail,
  });
  res.status(201).json({ message: 'Aluno criado com sucesso', aluno });
}

/** PATCH /professor/alunos/:id — requireRole('professor') */
export async function updateStudent(req: AuthRequest, res: Response) {
  const { id: alunoId } = validar(paramsAluno, req.params);
  const edicao = validar(edicaoSchema, req.body);
  res.json(await alunos.atualizarAluno(req.user.id, alunoId, edicao));
}

/** DELETE /professor/alunos/:id — requireRole('professor') */
export async function deleteStudent(req: AuthRequest, res: Response) {
  const { id: alunoId } = validar(paramsAluno, req.params);
  await alunos.excluirAluno(req.user.id, alunoId);
  res.status(204).send();
}
