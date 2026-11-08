# Migrações SQLite (arquivadas)

Histórico das 9 migrações da época em que o banco era SQLite (`prisma/dev.db`), até `20261104000000_nota_licao`.
Elas **não rodam mais**: o Prisma só lê `prisma/migrations/`, que desde a F1 de `docs/plano-producao.md` começa
com uma migração base única para PostgreSQL (`20261108000000_base_postgres`).

Ficam aqui só como referência (por exemplo, para entender como `20261103000000_usuario_unificado` juntou
`Professor`/`Aluno` em `Usuario`).

Para levar os dados de um banco SQLite antigo para o Postgres, use o script:

```bash
npm run db:migrar-sqlite -- caminho/para/dev.db
```

Ele lê o arquivo só para leitura e espera um Postgres vazio já com `prisma migrate deploy` aplicado. Detalhes em
`backend/CLAUDE.md`. O SQLite precisa estar pelo menos na migração `20261103010000_curso_autoguiado`; tabelas
que ainda não existirem no arquivo (por exemplo `NotaLicao`) são puladas.
