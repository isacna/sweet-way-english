// Inicialização de produção (sem dados de demonstração): importa o curso e cria o
// primeiro admin a partir de ADMIN_EMAIL / ADMIN_PASSWORD. Idempotente: roda a cada start.
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../src/database/client.js';
import { importarConteudo } from '../src/domain/conteudo/importar.js';

const adminSchema = z.object({
  ADMIN_EMAIL: z.string().trim().toLowerCase().pipe(z.email('ADMIN_EMAIL inválido')),
  ADMIN_PASSWORD: z.string().min(12, 'ADMIN_PASSWORD precisa ter pelo menos 12 caracteres'),
  ADMIN_NOME: z.string().trim().min(1).default('Administrador'),
});

async function criarPrimeiroAdmin() {
  if (await prisma.usuario.findFirst({ where: { admin: true }, select: { id: true } })) return;

  if (!process.env.ADMIN_EMAIL && !process.env.ADMIN_PASSWORD) {
    console.warn('Nenhum admin cadastrado: defina ADMIN_EMAIL e ADMIN_PASSWORD para criar o primeiro.');
    return;
  }
  const parsed = adminSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Admin inicial inválido: ${parsed.error.issues.map((i) => i.message).join('; ')}`);
  }
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NOME } = parsed.data;
  await prisma.usuario.upsert({
    where: { email: ADMIN_EMAIL },
    update: { papel: 'professor', admin: true },
    create: {
      nome: ADMIN_NOME,
      email: ADMIN_EMAIL,
      senha: await bcrypt.hash(ADMIN_PASSWORD, 10),
      papel: 'professor',
      admin: true,
    },
  });
  console.log(`Admin inicial criado: ${ADMIN_EMAIL}`);
}

async function main() {
  // Lições e testes existentes são mantidos (as edições da professora não se perdem)
  const curso = await importarConteudo(prisma, { publicar: process.env.SEED_PUBLICAR_CONTEUDO === '1' });
  console.log(`Curso: ${curso.modulos} módulos, ${curso.licoesCriadas} lições novas`);
  await criarPrimeiroAdmin();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
