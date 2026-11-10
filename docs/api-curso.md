# API do curso autoguiado (Fase 1)

Contrato entre backend e frontend. Tipos TypeScript equivalentes em `frontend/src/lib/curso.ts`.
Tudo sob `/api`, JSON, com `Authorization: Bearer <token>`. Erros: `{ error: string }` (mensagem em PT).
Corpo validado com zod; 400 em corpo inválido.

Regras de negócio em `backend/src/domain/progresso.ts` (limiares, XP, Leitner, ofensiva) e correção em
`backend/src/domain/correcao.ts`. **O gabarito, a `explicacao` e `tagsErro` nunca vão ao aluno antes da resposta**
(use `versaoPublica`).

## Aluno — `requireRole('aluno')`

Só conteúdo com `status = publicado` (módulo **e** lição) aparece para o aluno.

### Desbloqueio
- Módulo 1 do nível A1: liberado. Módulo N: liberado quando o teste do módulo N−1 (publicado) foi aprovado.
- Lição 1 de um módulo liberado: liberada. Lição N: liberada quando a lição N−1 está concluída.
- Teste do módulo: disponível quando todas as lições publicadas do módulo estão concluídas, e não está em espera
  (24 h após uma reprovação: `bloqueadoAte`). Tentativas ilimitadas, cada uma com uma forma diferente da anterior
  quando houver.

### `GET /curso`
Trilha completa com progresso.
```ts
{
  perfil: { xp: number; ofensivaAtual: number; ofensivaMaxima: number; metodologia: string; revisoesPendentes: number },
  niveis: [{
    id, codigo, nome, descricao,
    modulos: [{
      id, slug, ordem, titulo, tema, descricao, canDos: string[], gramatica, vocabulario, funcao,
      desbloqueado: boolean,
      licoesConcluidas: number, totalLicoes: number,
      teste: { disponivel: boolean; aprovado: boolean; melhorPercentual: number | null; tentativas: number; bloqueadoAte: string | null },
      licoes: [{ id, ordem, titulo, objetivo, minutosEstimados, desbloqueada: boolean, concluida: boolean, melhorPercentual: number }]
    }]
  }]
}
```
`ofensivaAtual` é a ofensiva **vigente** (`ofensivaVigente`). `revisoesPendentes` = itens de revisão com `proximaEm <= agora`.
Cria o `PerfilAprendiz` na primeira chamada se não existir.

### `GET /curso/licoes/:id`
404 se não publicada; 403 `{ error }` se bloqueada.
```ts
{
  id, slug, ordem, titulo, objetivo, minutosEstimados,
  modulo: { id, slug, titulo, ordem },
  apresentacao: Apresentacao,
  exercicios: ExercicioPublico[],   // ordenados por `ordem`; inclui as 4 etapas
  progresso: { concluida: boolean; melhorPercentual: number; tentativas: number },
  proximaLicaoId: number | null,      // próxima lição publicada do mesmo módulo
  nota: { texto: string; atualizadoEm: string } | null   // anotações do próprio aluno
}
ExercicioPublico = { id, ordem, etapa, tipo, enunciado, conteudo }
```

### `PUT /curso/licoes/:id/nota` — `{ texto }`
Salva as anotações do aluno na lição (até 5000 caracteres; 400 acima disso). Mesmas regras de 404/403 da lição.
Texto vazio (ou só espaços) apaga a nota. Resposta: `{ nota: { texto, atualizadoEm } | null }`.

### `POST /curso/exercicios/:id/verificar` — `{ resposta }`
Para etapas `controlada | semicontrolada | producao` (400 se for `quiz`). Lição precisa estar liberada.
Resposta: `Resultado` (`{ correto, pontuacao, respostaEsperada, explicacao }`).
Se errou, o exercício entra (ou volta) na revisão: `novaRevisao()` se ainda não existe; se já existe, caixa 1.
Sem XP (evita farmar). Atualiza a ofensiva.

### `POST /curso/licoes/:id/quiz` — `{ respostas: { [exercicioId]: resposta } }`
Corrige todos os exercícios `quiz` da lição (resposta ausente = errada).
```ts
{
  percentual: number, aprovado: boolean,          // aprovado = percentual >= 80
  resultados: [{ exercicioId, ...Resultado }],
  xpGanho: number, licaoConcluida: boolean,       // licaoConcluida = concluída agora ou antes
  proximaLicaoId: number | null
}
```
Atualiza `ProgressoLicao` (tentativas+1, melhorPercentual, concluida/concluidaEm na 1ª aprovação), XP
(`licaoConcluida` na 1ª aprovação; `licaoMelhorada` se aprovou de novo superando a melhor nota), ofensiva,
e põe os itens errados na revisão.

### `GET /curso/revisao`
Até 20 itens com `proximaEm <= agora`, mais antigos primeiro: `{ itens: (ExercicioPublico & { caixa: number; licaoTitulo: string })[], total: number }`.

### `POST /curso/revisao/:exercicioId` — `{ resposta }`
404 se o item não está na revisão do aluno. Corrige, aplica `proximaRevisao()`, soma `XP.revisaoCorreta` se acertou,
atualiza a ofensiva. Resposta: `Resultado & { caixa: number; proximaEm: string; xpGanho: number }`.

### `POST /curso/modulos/:id/teste`
Inicia uma tentativa. 409 se lições incompletas; 423 `{ error, bloqueadoAte }` se em espera; 403 se módulo bloqueado.
Escolhe a forma (diferente da última tentativa, quando houver mais de uma). Se já há tentativa não finalizada do
mesmo módulo, devolve essa.
```ts
{ tentativaId: number, forma: number, itens: (ItemTestePublico)[] }
ItemTestePublico = { id, ordem, habilidade, tipo, enunciado, conteudo }
```

### `POST /curso/tentativas/:id` — `{ respostas: { [itemId]: resposta } }`
Finaliza (409 se já finalizada; 404 se não é do aluno). Usa `avaliarTeste()`.
```ts
{
  percentual, porHabilidade: Record<string, number>, aprovado: boolean,
  resultados: [{ itemId, habilidade, ...Resultado }],
  xpGanho: number,                    // XP.testeAprovado só na 1ª aprovação do módulo
  bloqueadoAte: string | null,        // agora + 24 h se reprovou
  proximoModuloId: number | null      // se aprovou
}
```

### `PATCH /curso/perfil` — `{ metodologia }`
Só `"gramatica"` é aceita na v1 (400 para as outras, com mensagem "em breve"). Devolve o perfil.

## Professora — `requireRole('professor')`

O conteúdo é global (não é por turma): qualquer professor pode revisar e publicar.

### `GET /conteudo`
```ts
{ niveis: [{ id, codigo, nome, modulos: [{ id, slug, ordem, titulo, tema, status, totalItensTeste: number,
  licoes: [{ id, ordem, slug, titulo, status, totalExercicios: number, atualizadoEm, revisadoEm: string | null }] }] }] }
```

### `GET /conteudo/licoes/:id`
Lição completa **com** gabarito/explicação/tagsErro:
`{ id, slug, ordem, titulo, objetivo, minutosEstimados, status, apresentacao, modulo: { id, slug, titulo }, exercicios: [{ id, ordem, etapa, tipo, enunciado, conteudo, gabarito, explicacao, tagsErro }] }`

### `PUT /conteudo/licoes/:id` — corpo validado por `licaoEdicaoSchema`
Exercícios com `id` são atualizados; sem `id`, criados; os que sumiram, apagados (a ordem segue o array).
Não muda o status. Devolve a lição como no GET.

### `PATCH /conteudo/licoes/:id/status` — `{ status: 'rascunho' | 'revisao' | 'publicado' }`
Ao publicar, grava `revisadoPorId` e `revisadoEm`.

### `PATCH /conteudo/modulos/:id/status` — `{ status, incluirLicoes?: boolean }`
Publica/despublica o módulo; com `incluirLicoes`, aplica o mesmo status (e revisor) a todas as lições.

### `GET /conteudo/modulos/:id/teste`
`{ modulo: { id, slug, titulo }, formas: [{ forma: number, itens: ItemTeste completo[] }] }` (só leitura na v1).

### `POST /conteudo/exercicios/verificar` — `{ item, resposta }`
Pré-visualização no editor: valida `item` com `itemSchema` e devolve `corrigir(item, resposta)`.

### `GET /professor/progresso?turmaId=`
Alunos das turmas do professor (ou só da turma indicada; 404 se a turma não é dele).
`?turmaId=sem-turma` lista os alunos **sem nenhuma matrícula** (cadastro público em `/cadastro`), com `turmas: []`.
No piloto qualquer professor (admin ou não) vê esse grupo, porque esses alunos ainda não pertencem a ninguém.
```ts
{
  modulos: [{ id, slug, ordem, titulo, totalLicoes }],   // módulos publicados, em ordem
  alunos: [{
    id, nome, email, xp, ofensivaAtual, ultimoEstudoEm: string | null, revisoesPendentes,
    turmas: [{ id, nome }],
    modulos: [{ moduloId, licoesConcluidas, testeAprovado: boolean, melhorPercentualTeste: number | null, tentativasTeste: number }]
  }]
}
```

## Notas de implementação (detalhes não previstos acima)

### Pilotos multimídia (A1 M04, A1 M06, A2 M02)

As 18 lições desses módulos incluem 36 atividades adicionais (18 de escuta, 9 de decisão e 9 de ordenação) e 18 missões pessoais. Os exercícios e quizzes anteriores são preservados. A escuta original usa a voz do navegador, identificada no player; não é uma gravação humana. A música do Super Simple é uma extensão infantil opcional. O áudio de café e o vídeo explicativo de passado do British Council abrem na fonte, com suas legendas/transcrições. Nenhum quiz depende da disponibilidade desses serviços.

- Todo `conteudo` de exercício pode incluir `midia`. A apresentação aceita `recursos` (até quatro mídias) e `missao`.
- Mídia: `{ tipo: "audio" | "video" | "musica", modo: "voz" | "arquivo" | "youtube" | "link", titulo, fonte, orientacao, url?, transcricao?, inicio?, fim? }`. URLs devem usar HTTPS. `youtube` recebe `https://www.youtube.com/watch?v=ID`; o player monta uma URL de incorporação e só a carrega após um clique. Arquivos exigem transcrição; voz exige texto e não aceita URL. `inicio` e `fim` são segundos inteiros, somente para arquivo/YouTube, com fim maior que início. Não há autoplay.
- Novo tipo `sequence`: `conteudo: { trechos: string[], midia? }`, com 3–8 trechos distintos, e `gabarito: { ordem: number[] }`, uma permutação dos índices. A resposta do aluno é a lista de índices selecionados na ordem; só a sequência completa correta recebe um ponto. O gabarito continua exclusivo do servidor.
- Missão: `{ titulo, enunciado, criterios: string[], exemplo }`, com 2–6 critérios. É uma produção livre com autoavaliação, sem nota, XP ou bloqueio de progressão. O aluno pode guardar a resposta no caderno existente (limite total de 5.000 caracteres). O editor da professora preserva e permite editar todos esses campos.
- `npm run conteudo:validar -- --diversidade` acrescenta avisos de sequências repetidas, falta de mídia, falta de missão e pouca variedade de formatos. Os avisos editoriais não invalidam o acervo legado.

Para disponibilizar em um ambiente existente, após revisar o conteúdo, executar no diretório `backend`:

```sh
npx prisma migrate deploy
npx prisma generate
npx tsx scripts/atualizar-pilotos.ts
# Após conferir a simulação:
npx tsx scripts/atualizar-pilotos.ts --aplicar
```

O atualizador só acrescenta exercícios marcados com `piloto_multimidia_v1` e uma chave `piloto:<slug>:<atividade>`. Reexecuções não duplicam esses itens; edições da professora nesses itens são preservadas. Não remova as tags de identificação. A apresentação atual é mantida; a missão só é incluída se ainda não existir, e os recursos são acrescentados por URL até o limite de quatro. IDs existentes, tentativas, revisões, quizzes e status de publicação não são alterados. Em lições já publicadas, aplicar torna as adições visíveis imediatamente. Não usar `conteudo:importar -- --sobrescrever` para essa atualização, pois esse fluxo substitui exercícios.

Validação de interface: `BASE_URL=http://localhost:3000 npx playwright test e2e/multimidia.spec.ts --project=chromium` usa API simulada e não grava no banco. Cobre apresentação, ordenação, notas e largura de 390 px; reprodução real de mídia externa e comportamento em aparelho físico exigem verificação separada.

- `POST /curso/revisao/:exercicioId`: **409** `{ error, proximaEm }` se o item ainda não venceu (`proximaEm > agora`).
  Sem isso, daria para responder o mesmo item várias vezes seguidas e somar `XP.revisaoCorreta` sem limite.
- `POST /curso/licoes/:id/quiz`: 409 se a lição não tem nenhum item `quiz`. Resposta em formato errado para o tipo → 400
  (nada é gravado). Percentual = média das pontuações (crédito parcial em cloze/match), arredondada.
- `POST /curso/exercicios/:id/verificar`: item errado que já está na revisão volta à caixa 1 sem adiar a data já marcada.
- `POST /curso/modulos/:id/teste`: 201 ao criar a tentativa, 200 ao devolver uma aberta; 409 também se o módulo ainda não
  tem itens de teste. A forma segue um rodízio (próxima forma depois da última usada).
- `POST /curso/tentativas/:id`: `xpGanho`/`bloqueadoAte` como acima; a finalização é atômica (duas chamadas simultâneas → uma recebe 409).
- `PUT /conteudo/licoes/:id`: 400 se algum `id` de exercício não for da lição, se houver `id` repetido ou se não houver
  nenhum item `quiz` (sem quiz a lição nunca poderia ser concluída). Aceita `tagsErro: null` (como o GET devolve) e limpa as tags.
- `PATCH /conteudo/licoes/:id/status` devolve `{ id, status, revisadoPorId, revisadoEm }`;
  `PATCH /conteudo/modulos/:id/status` devolve `{ id, slug, status, licoesAtualizadas }`.
- `GET /curso`: níveis sem nenhum módulo publicado não aparecem. Um módulo publicado sem lições publicadas tem o teste
  disponível direto (todas as 0 lições estão concluídas).
