import { describe, it, expect, vi, beforeEach } from 'vitest';
import multer from 'multer';
import { errorHandler } from '../../../http/middlewares/errorHandler.js';
import {
  ErroConflito,
  ErroNaoEncontrado,
  ErroProibido,
  ErroValidacao,
  ehErroPrisma,
} from '../../../services/erros.js';
import { TipoArquivoNaoPermitido } from '../../../storage/arquivos.js';
import { logger } from '../../../config/logger.js';
import { mockReq, mockRes } from '../../helpers/mockReqRes.js';

describe('errorHandler', () => {
  let res: any;
  beforeEach(() => {
    res = mockRes();
    vi.restoreAllMocks();
  });

  it.each([
    [new ErroValidacao('Título é obrigatório'), 400, 'Título é obrigatório'],
    [new ErroProibido(), 403, 'Acesso negado'],
    [new ErroNaoEncontrado('Turma não encontrada'), 404, 'Turma não encontrada'],
    [new ErroConflito('Já existe'), 409, 'Já existe'],
  ])('maps %s to its status with { error }', (erro, status, mensagem) => {
    const log = vi.spyOn(logger, 'error');
    errorHandler(erro, mockReq(), res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(status);
    expect(res.json).toHaveBeenCalledWith({ error: mensagem });
    // Erros esperados não poluem o log de erros
    expect(log).not.toHaveBeenCalled();
  });

  it('maps an oversized upload to 413 and other multer errors to 400', () => {
    errorHandler(new multer.MulterError('LIMIT_FILE_SIZE'), mockReq(), res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(413);
    errorHandler(new multer.MulterError('LIMIT_UNEXPECTED_FILE'), mockReq(), res, vi.fn());
    expect(res.status).toHaveBeenLastCalledWith(400);
  });

  it('maps a forbidden file type to 415', () => {
    errorHandler(new TipoArquivoNaoPermitido('Tipo não permitido'), mockReq(), res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(415);
    expect(res.json).toHaveBeenCalledWith({ error: 'Tipo não permitido' });
  });

  it('maps malformed JSON to 400', () => {
    const erro = Object.assign(new SyntaxError('Unexpected token'), { body: '{' });
    errorHandler(erro, mockReq(), res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'JSON inválido' });
  });

  it('answers 500 without details and logs the error with its stack through the request logger', () => {
    const reqLog = { error: vi.fn() };
    const erro = new Error('connection refused at 10.0.0.5');
    errorHandler(erro, mockReq({ log: reqLog } as any), res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Erro interno do servidor' });
    expect(reqLog.error).toHaveBeenCalledWith({ err: erro }, 'Erro não tratado');
  });

  it('falls back to the global logger when the request has none', () => {
    const log = vi.spyOn(logger, 'error').mockImplementation(() => {});
    errorHandler(new Error('x'), mockReq(), res, vi.fn());
    expect(log).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('ehErroPrisma recognises a Prisma error code', () => {
    expect(ehErroPrisma(Object.assign(new Error('u'), { code: 'P2002' }), 'P2002')).toBe(true);
    expect(ehErroPrisma(new Error('u'), 'P2002')).toBe(false);
    expect(ehErroPrisma(null, 'P2002')).toBe(false);
  });
});
