import { Request } from 'express';

export type Papel = 'professor' | 'aluno';

export interface AuthRequest extends Request {
  user: {
    id: number;
    email: string;
    role: Papel;
    admin?: boolean;
  };
}
