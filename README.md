# Sweet Way English

Plataforma web de apoio ao ensino de inglês desenvolvida como trabalho de conclusão da Pós-Graduação em Desenvolvimento Full Stack. A solução visa centralizar materiais e facilitar a interação entre alunos e professores em turmas presenciais de idiomas.

## 📋 Sobre o Projeto

O Sweet Way English nasceu da necessidade identificada durante um curso básico de inglês: a dificuldade de estender a interação da sala de aula para o ambiente digital de forma engajadora. A plataforma oferece uma solução completa para gerenciamento de turmas, atividades, entregas e acompanhamento de progresso dos alunos.

## 🛠️ Tecnologias

### Frontend
- **Next.js** - Framework React para construção de páginas dinâmicas com organização clara de rotas e componentes reutilizáveis
- **React** - Biblioteca JavaScript para criação de interfaces de usuário

### Backend
- **Node.js** - Runtime JavaScript para o servidor
- **TypeScript** - Superset do JavaScript com tipagem estática

### Banco de Dados
- **SQLite** - Banco de dados relacional embarcado, sem necessidade de servidor separado
- **Prisma ORM** - Camada de acesso ao banco de dados com modelagem tipada e migrações

### DevOps
- **Docker** - Containerização para padronização de ambientes de desenvolvimento e produção

## 📁 Estrutura do Projeto

```
sweet-way-english/
├── frontend/          # Aplicação Next.js
├── backend/           # API Node.js com TypeScript
├── docs/              # Documentação do projeto
└── README.md
```

O projeto está organizado para demonstrar a separação clara de responsabilidades entre o servidor (API) e a interface do cliente.

## 🚀 Como Executar

### Pré-requisitos
- Docker e Docker Compose

### Com Docker (recomendado)

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/sweet-way-english.git
cd sweet-way-english
```

2. Crie o arquivo `.env` na raiz do projeto a partir do exemplo:
```bash
cp .env.example .env
```

3. Preencha as variáveis no `.env`:
```env
JWT_SECRET=sua-chave-secreta
GEMINI_API_KEY=sua-chave-gemini
APP_URL=http://localhost:3333
NEXT_PUBLIC_API_URL=http://localhost:3333
```

4. Inicie os containers:
```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend: http://localhost:3333

### Sem Docker (desenvolvimento local)

**Pré-requisitos adicionais:** Node.js 20+

**Backend:**
```bash
cd backend
npm install
npx prisma migrate dev
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## 🔑 Credenciais de Teste

O banco de dados é populado automaticamente com dados de exemplo na primeira execução.

| Perfil | E-mail | Senha |
|--------|--------|-------|
| Professor | `professor@sweetway.com` | `senha123` |
| Aluno | `ana@email.com` | `senha123` |
| Aluno | `bruno@email.com` | `senha123` |
| Aluno | `carla@email.com` | `senha123` |

## ✨ Funcionalidades

- Autenticação de usuários (alunos e professores)
- Gerenciamento de turmas
- Criação e distribuição de atividades
- Sistema de entregas e avaliações
- Painel de acompanhamento de progresso
- Histórico de atividades e resultados

## 🎯 Objetivos

Este projeto foi desenvolvido como MVP funcional com potencial de validação em contexto real, aplicando as competências adquiridas na formação Full Stack e servindo como base para continuidade profissional.

## 👤 Autor

**Isac Nunes Alves**

Desenvolvido como trabalho de conclusão da Pós-Graduação em Desenvolvimento Full Stack - PUCRS Online / UOL EdTech

## 📚 Referências

- [Node.js Documentation](https://nodejs.org/en/docs)
- [Prisma ORM Documentation](https://www.prisma.io/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://pt-br.reactjs.org/)

## 📄 Licença

Este projeto foi desenvolvido para fins acadêmicos.