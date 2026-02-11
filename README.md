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
- **PostgreSQL** - Banco de dados relacional para persistência de dados estruturados
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
- Node.js (versão LTS recomendada)
- Docker e Docker Compose
- PostgreSQL (ou usar via Docker)

### Instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/sweet-way-english.git
cd sweet-way-english
```

2. Configure as variáveis de ambiente:
   - Crie arquivos `.env` no diretório `backend/` e `frontend/` conforme necessário

3. Execute com Docker:
```bash
docker-compose up
```

Ou execute manualmente:

**Backend:**
```bash
cd backend
npm install
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

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