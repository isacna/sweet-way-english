// Erros que os services lançam. O errorHandler central (http/middlewares/errorHandler.ts) transforma cada um na
// resposta `{ error: mensagem }` com o status da classe. A mensagem vai para o usuário: português, sem dados internos.

export class ErroServico extends Error {
  constructor(
    readonly status: number,
    mensagem: string,
  ) {
    super(mensagem);
    this.name = new.target.name;
  }
}

/** 400: entrada inválida ou regra de negócio que recusa o pedido. */
export class ErroValidacao extends ErroServico {
  constructor(mensagem = 'Dados inválidos') {
    super(400, mensagem);
  }
}

/** 403: o usuário existe e está logado, mas não pode fazer isto. */
export class ErroProibido extends ErroServico {
  constructor(mensagem = 'Acesso negado') {
    super(403, mensagem);
  }
}

/** 404: o registro não existe (ou, por política, não revelamos que existe). */
export class ErroNaoEncontrado extends ErroServico {
  constructor(mensagem = 'Não encontrado') {
    super(404, mensagem);
  }
}

/** 409: conflito com o estado atual. */
export class ErroConflito extends ErroServico {
  constructor(mensagem = 'Conflito com o estado atual') {
    super(409, mensagem);
  }
}

/** Erro conhecido do Prisma com o código dado (ex.: P2002 = único violado, P2025 = registro não encontrado). */
export function ehErroPrisma(err: unknown, codigo: string): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === codigo;
}
