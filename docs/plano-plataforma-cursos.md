# Plano da Plataforma de Cursos — Sweet Way English (A1 → B1)

> Documento de planejamento: **pesquisa → plano → código**.
> Público: o dono do projeto (desenvolvedor) e a professora.
> Data: novembro de 2026. Preços e versões de modelos de IA mudam rápido: confirme cada valor na página oficial antes de fixar planos de assinatura.

---

## Sumário

1. [Resumo executivo e decisões já tomadas](#1-resumo-executivo-e-decisões-já-tomadas)
2. [O que aprendemos com as plataformas famosas](#2-o-que-aprendemos-com-as-plataformas-famosas)
3. [Currículo CEFR A1–B1](#3-currículo-cefr-a1b1)
4. [As 4 metodologias](#4-as-4-metodologias)
5. [Tipos de exercício e sistema de avaliação](#5-tipos-de-exercício-e-sistema-de-avaliação)
6. [Fala e escuta: stack, custos e LGPD](#6-fala-e-escuta-stack-custos-e-lgpd)
7. [Fontes de conteúdo, pipeline de IA e licenças](#7-fontes-de-conteúdo-pipeline-de-ia-e-licenças)
8. [Arquitetura técnica](#8-arquitetura-técnica)
9. [Roadmap em fases](#9-roadmap-em-fases)
10. [Riscos e perguntas em aberto](#10-riscos-e-perguntas-em-aberto)
11. [Referências](#11-referências)

---

## 1. Resumo executivo e decisões já tomadas

### 1.1 De onde partimos

O Sweet Way English hoje é uma plataforma de **gestão de turmas da professora**: turmas, matrículas, atividades, submissões, feedback, materiais de apoio e avisos. Backend em Express + Prisma (SQLite), frontend em Next.js 16.

### 1.2 Para onde vamos

Um **curso de inglês autoguiado do básico ao intermediário** (CEFR **A1 → A2 → B1**, com ponte B1+/B2 depois), com lições, quizzes, testes de módulo, provas de nível, e trabalho de gramática, vocabulário, **escuta e fala**. O aluno escolhe a metodologia que mais combina com ele.

### 1.3 Decisões já tomadas

| Tema | Decisão |
|---|---|
| **Públicos** | (1) alunos da professora, que ela acompanha; (2) o próprio dono, como aluno e administrador; (3) alunos independentes que se cadastram sozinhos (assinatura no futuro). |
| **Conteúdo** | **Híbrido**: currículo baseado no CEFR e em fontes reconhecidas; a IA (Google Gemini) gera rascunhos; **a professora revisa e publica**. Nada é publicado sem aprovação humana. Nunca copiar material protegido por direitos autorais. |
| **Metodologias** | 4 opções: (1) Comunicativa / baseada em tarefas; (2) Gamificada + repetição espaçada; (3) Input compreensível; (4) Gramática estruturada (PPP). |
| **Núcleo de conteúdo único** | O mesmo conteúdo (vocabulário, gramática, textos, exercícios, tarefas) é produzido **uma vez** e reaproveitado pelas 4 metodologias, que mudam apenas a **ordem e a ênfase** dos passos. O teste de módulo é o mesmo para todas, então trocar de metodologia não perde progresso. |
| **Forma de entrega** | Pesquisa (feita) → este plano → código em fases (seção 9). |

### 1.3.1 Decisões do dono (03/11/2026) — prevalecem sobre o restante do documento

| Tema | Decisão | Consequência no plano |
|---|---|---|
| **Menores de 18 anos** | Sim, haverá alunos menores. | `Usuario` guarda data de nascimento e consentimento do responsável (LGPD art. 14). Recursos de IA em tempo real, quando chegarem, ficam desligados para menores até nova decisão. |
| **IA e Fala na 1ª versão** | **Não.** A 1ª versão é 100% determinística. | Sai do MVP: geração com Gemini, TTS, reconhecimento de voz, pronúncia. Conteúdo do A1 é escrito/curado manualmente (seed versionado + editor da professora). Exercícios de escuta ficam para depois. |
| **Pronúncia (atualização)** | Frases em inglês têm botão 🔊 de áudio. | Usa a voz do navegador (Web Speech `speechSynthesis`, en-US): grátis, sem servidor e sem IA. Aparece nos exemplos, no vocabulário, nos textos de leitura e na resposta esperada. Reconhecimento de fala continua fora. |
| **Assinatura** | Indefinida; explorar o mercado antes. | Nada de cobrança/planos no código por enquanto. |
| **Metodologia do MVP** | **Gramática Estruturada (PPP).** | Confirmado. |
| **Usuários** | Unificar `Professor` e `Aluno` em `Usuario`. | Confirmado para a Fase 0. |
| **Hospedagem** | No computador do dono, por enquanto. | SQLite continua; Postgres e armazenamento em nuvem ficam para quando houver produção pública. Refresh token em cookie é dispensável agora: JWT com expiração + segredo obrigatório basta. |
| **Variante** | **Inglês americano.** | Ortografia, vocabulário e (futuramente) vozes en-US. |

### 1.4 Principais recomendações (em uma página)

1. **Fase 0 antes de tudo:** corrigir segurança (cadastro público de professor, JWT sem expiração, uploads sem limite) e **unificar `Professor`/`Aluno` em `Usuario`**, porque todas as tabelas novas precisam de uma única chave de aprendiz.
2. **MVP = A1 com a metodologia de Gramática Estruturada (PPP)**: é a mais fácil de revisar, funciona no A1 e é a mais coberta por correção automática.
3. **Banco de itens único** com tags `cefr`, `habilidade`, `canDo`, `strand`, `tagsErroL1`, correção **sempre no servidor** (gabarito nunca vai para o navegador).
4. **FSRS (`ts-fsrs`)** como camada de memória comum a todas as metodologias.
5. **IA com portões determinísticos** (lista de vocabulário CEFR-J/NGSL, integridade do gabarito, duplicatas) + **juiz cego** + **revisão da professora**.
6. **Fala:** TTS em cache (custo por conteúdo, não por aluno), Web Speech grátis para "repita a frase", Azure Pronunciation Assessment para nota de pronúncia, Gemini só para explicar em português.
7. **Mudar de SQLite para Postgres** antes de abrir cadastro público (Fase 2).
8. **Certificado de "conclusão alinhada ao CEFR"**, nunca "certificado CEFR" ou "Cambridge".

---

## 2. O que aprendemos com as plataformas famosas

### 2.1 Tabela comparativa

| Plataforma | Formato da lição | Progressão / adaptação | Fala e escuta | Destaque a copiar | Ponto fraco |
|---|---|---|---|---|---|
| **Duolingo** | ~15 desafios curtos mistos (traduzir, escolher, ouvir e digitar, falar, associar), em **trilha linear** dividida em unidades com **guidebook** de dicas | Teste de nivelamento adaptativo (~10 min) com **crédito parcial** por tipo de erro; "Jump here" para pular unidade; **Half-Life Regression** para memória; **Birdbrain** (IRT/Elo) estima habilidade e dificuldade | Stories com voz; DuoRadio; Max: *Explain My Answer*, Roleplay, **Video Call com Lily** (não corrige durante, só depois) | Trilha linear com revisão intercalada; crédito parcial; Explain My Answer; relatório pós-conversa | Gamificação otimiza engajamento, não aprendizado; sistema "Energy" (2025) gerou revolta; pouca evidência independente de ganho em fala |
| **Babbel** | 5–10 min: introduz em contexto → treina → revisa → **diálogo** final; dicas de gramática/cultura | Nivelamento curto + metas no cadastro; **Review Manager** (SRS em 4 modos: cartão, escuta, fala, escrita) | "Guided Conversations": ouvir diálogo e repetir falas | Estrutura curta e previsível; revisão em 4 modos | 36% de evasão no estudo da MSU |
| **Busuu** | Cursos alinhados ao CEFR A1–B2 (+C1) com can-dos por nível | **Study Plan** (meta, dias, minutos); "Smart review" | **Correção da comunidade** em produções escritas e faladas | Plano de estudo; correção humana de produção livre (mapeia para a professora); certificado por nível | — |
| **Memrise** | Vídeos curtos de nativos ("Learn with Locals") | SRS herdado com mnemônicos | **MemBot**: role-play com IA | Contexto autêntico em vídeo | Limites agressivos no plano grátis |
| **LingQ** | Leitura/escuta de textos graduados | Cada palavra: **azul (nova) → amarela (aprendendo, 1–4) → conhecida**; contagem de palavras conhecidas como métrica | Áudio + transcrição | Status por palavra por aluno sobre textos graduados (base da metodologia de input) | Pouca produção |
| **ELSA Speak** | Drills curtos de pares mínimos e repetição | — | Nota de pronúncia **por fonema**, colorida; nota geral (pronúncia, fluência, entonação, acento) | Feedback visual por som | Só pronúncia |
| **Speak / Praktika** | **Aprender → praticar → aplicar**: vídeo, Q&A guiado, role-play aberto com IA | Plano de estudo por IA (Praktika) | Conversa com IA com feedback de pronúncia, fluência, gramática | Loop aprender/praticar/aplicar | Q&A repetitivo em níveis altos |
| **Cambly** | Aulas 1:1 de 30 min com nativos, **gravadas** | Cambly Pro: planos estruturados | Conversa real | Atividades geradas a partir da conversa | Qualidade de tutor varia |
| **EF English Live** | 16 níveis A1–C2 | Concluir nível = todas as lições + **prova de fim de nível** → certificado | Aulas em grupo a cada 30 min | **Toda escrita é revisada por professor** — o modelo mais próximo do nosso | Caro |
| **Cambridge One / Write & Improve** | Workbook digital atribuído pelo professor | Correção automática de redação com nota CEFR | — | **"Class View"**: professor cria tarefas, vê trabalho pré-corrigido, sobrescreve | — |
| **British Council LearnEnglish / BBC Learning English** | Recursos por **habilidade × nível**; BBC: cursos de ~30 unidades e micro-formatos (*6 Minute English*) | Teste de nível grátis | Escuta com transcrição | Navegação em 2 eixos (habilidade e nível); fluxo de escuta com transcrição | Conteúdo protegido: só podemos **linkar** |

### 2.2 Padrões a adotar

1. **Um núcleo de conteúdo, vários fluxos** (seção 4.5).
2. **Trilha linear** de unidades com **nó de revisão intercalado** a cada poucas lições e um **guia da unidade em português**.
3. **Nivelamento adaptativo** + "pular unidade" por teste + **crédito parcial** por tipo de erro.
4. **SRS por item**: começar com FSRS (`ts-fsrs`) e registrar logs (`itemId, aluno, data, acerto, latência, tipo`) para calibrar depois. Revisão em 4 modos (cartão, ouvir, falar, escrever).
5. **Elo/IRT simples** ("Birdbrain-lite"): atualiza habilidade do aluno e dificuldade do item a cada resposta; sinaliza itens gerados por IA fáceis ou difíceis demais.
6. **Provas de fim de nível com certificado** (EF) e **can-dos do CEFR** visíveis por nível (Busuu).
7. **Fila de revisão humana**: escrita e fala livres pré-corrigidas pelo Gemini e confirmadas pela professora (Write & Improve / EF / Busuu).
8. **Conversa com IA** limitada à linguagem da unidade, **sem interromper**, com **relatório depois** e "Explique minha resposta" em qualquer erro.
9. **Plano de estudo e hábito**: meta, dias, minutos; ofensiva (streak) **com congelamento**; lembretes gentis.
10. **Painel da professora**: atribuir unidades/testes, ver progresso, nível CEFR e pontos fracos por aluno.

### 2.3 Padrões a evitar

- **Punir o erro bloqueando o estudo** (vidas/energia como alavanca de monetização).
- **Métricas de engajamento como substituto de aprendizado**: XP farm, ligas que premiam repetir lição fácil. XP deve pesar itens novos e produção correta; ligas opcionais.
- **Exercícios só receptivos e de tradução**, sem produção livre — a principal lacuna de fala apontada nas pesquisas sobre o Duolingo.
- **Q&A roteirizado repetitivo** em níveis altos: a partir do B1, tarefas abertas.
- **Conteúdo de IA sem validação**: exigir aprovação da professora e sinalização automática de itens anômalos.
- **Alta evasão**: sessões curtas, plano de estudo, e "cutucadas" da professora para os alunos dela.

---

## 3. Currículo CEFR A1–B1

### 3.1 Referências e regras de modelagem

- **Níveis e descritores:** CEFR Companion Volume (2020). Inclui escalas de **mediação** e uma escala de fonologia baseada em **inteligibilidade, não em sotaque nativo**. Regra: a nota de pronúncia mede inteligibilidade.
- **Inventário de gramática e funções:** *Core Inventory for General English* (British Council/EAQUALS, licença CC).
- **Marcação de nível:** English Grammar Profile (1.200+ can-dos gramaticais) e English Vocabulary Profile (nível por **sentido** da palavra) — apenas para **consulta manual** (licença não comercial). No banco usamos **CEFR-J** e **NGSL** (licenças abertas; ver seção 7).
- **Vocabulário-alvo** (Oxford 3000, revisão 2020, só como referência): ~900 palavras no A1, +800 no A2, +700 no B1, +600 no B2. O nível depende do sentido: *book* (substantivo) é A1, *book* (verbo) é A2. **Modelo de dados:** marcar `(lema, classe, sentido)`, não só o lema.
- **Granularidade:** Pearson GSE (10–90) com subníveis A2+, B1+. Faixas aproximadas (a confirmar): A1 22–29, A2 30–35, A2+ 36–42, B1 43–50, B1+ 51–58, B2 59–66. Sugestão: guardar um inteiro `gse` em cada objetivo.
- **Horas guiadas acumuladas:** A1 ~90–100 h, A2 ~180–200 h, B1 ~350–400 h, B2 ~500–600 h. Mostrar como estimativa ("~X h"), não promessa; autoestudo costuma levar mais.
- **Provas de referência:** formatos do A2 Key e B1 Preliminary como **modelo de tarefas** para nossas provas — itens sempre originais.

### 3.2 Forma comum de cada módulo

- **10 módulos por nível**, cada um com ~6 lições de 25–40 min, um baralho SRS, um quiz de módulo e uma **tarefa final**.
- Cada módulo cobre: 1 bloco de gramática, 1 conjunto de ~70–90 palavras (mínimo de produção: 25–40 itens de vocabulário), 1 função comunicativa e 1 foco de pronúncia.
- Produção mínima por módulo: 1 ponto gramatical, 25–40 itens de vocabulário, 3 textos com áudio, 1 tarefa, ~40 exercícios, 1 checkpoint.

### 3.3 A1 (Breakthrough) — ~90–100 h — ~900 palavras

**Can-dos:** entender cumprimentos, dias, horas, números e preços; ler placas e preencher formulários simples; dar informações pessoais e descrever família e casa; perguntar e responder perguntas simples se o outro falar devagar; escrever frases simples sobre si; dizer "I don't understand" e pedir repetição.

**Ordem gramatical:** *to be* → pronomes, possessivos, 's → *this/that*, plurais, *a/an* → *there is/are* → presente simples (+, −, ?, -s) → advérbios de frequência → *can/can't* → imperativo → preposições de lugar → *in/on/at* (tempo) → *like* + -ing → *I'd like* → contáveis/incontáveis com *How much/many* → presente contínuo → passado de *be* → passado simples (regulares e irregulares comuns) → *going to* → comparativos/superlativos (exposição).

**Pronúncia:** alfabeto (confusão de nomes das letras *e/i*, *g/j*, *a/e*); -s de 3ª pessoa /s z ɪz/; /iː/ × /ɪ/ (*live/leave*); sem [i] epentético no fim (*Facebook*, não "Facebooki"); /h/ × r português (*red/head*); acento em números (*thirTEEN* × *THIRty*).

| # | Tema | Gramática | Vocabulário | Função comunicativa | Tarefa final |
|---|---|---|---|---|---|
| 1 | Hello! | *be*, pronomes, *a/an* | cumprimentos, alfabeto, números 1–20 | cumprimentar, soletrar o nome | Gravar autoapresentação de 30 s |
| 2 | My people | possessivos, 's, *this/that* | família | apresentar a família | Legendar e descrever uma foto de família |
| 3 | Where I'm from | *be* ?/−, países | países e nacionalidades, números | nacionalidade, idade, telefone | Preencher ficha de cadastro |
| 4 | My day | presente simples +, horas | rotina diária, dias | dizer as horas | Escrever a rotina da semana |
| 5 | Do you…? | presente simples ?/−, advérbios de frequência | hábitos, tempo livre | perguntar sobre hábitos | Entrevistar um colega (ou bot de IA) |
| 6 | Food & café | contáveis/incontáveis, *I'd like*, *how much* | comida e bebida, preços | pedir comida, perguntar preço | Role-play pedindo num café |
| 7 | My town | *there is/are*, preposições de lugar, imperativo | cidade, lojas | dar direções | Descrever um trajeto num mapa |
| 8 | Abilities & free time | *can/can't*, *like* + -ing | hobbies, esportes | gostos e preferências | Post de perfil online |
| 9 | Right now | presente contínuo | roupas, cores, clima | descrever uma cena | Descrever uma imagem (áudio) |
| 10 | Yesterday & tomorrow | *was/were*, passado simples, *going to* | expressões de tempo | contar o fim de semana, planos | **Prova A1** (mini estilo Key) |

### 3.4 A2 (Waystage) — ~180–200 h acumuladas — +800 palavras (~1.700)

**Can-dos:** falar de trabalho, lazer, fim de semana passado e planos; fazer, aceitar e recusar convites; manter uma conversa curta; entender conversas lentas e avisos curtos (estação, aeroporto, previsão do tempo); achar informação em anúncios, horários e sites; escrever mensagens, convites e uma narrativa com *first / then / after that / finally*.

**Ordem gramatical:** presente simples × contínuo → presente contínuo para futuro → passado simples (irregulares, Wh-) → passado contínuo → *will* × *going to* → comparativos e superlativos → *much/many/a lot of*, *some/any* → artigo definido → verbo + -ing / infinitivo → *have to / must / should* → *could* para pedidos → **presente perfeito** (*ever/never*, *just/yet/already*) → condicionais zero e primeira → advérbios de tempo, lugar e movimento.

**Pronúncia:** finais -ed /t d ɪd/ (o erro clássico "work-ed"); consoantes finais sem [i] (*hot dog*, *stop*); s + consoante inicial (*school*, não "eschool"); /p t k/ aspirados; /d t/ antes de /i/ sem palatalizar (*different*, não "djifferent"); /l/ escuro final (*school*, não "schoow"); acento de frase em Wh-questions.

| # | Tema | Gramática | Vocabulário | Função comunicativa | Tarefa final |
|---|---|---|---|---|---|
| 1 | Routines vs now | presente simples × contínuo | trabalho, rotina | descrever hábitos e momento atual | Vídeo-diário |
| 2 | Last holiday | passado simples, irregulares, sequenciadores | viagem, transporte | contar uma história no passado | História de viagem narrada |
| 3 | When it happened | passado contínuo + passado simples | incidentes, clima | narrar um incidente | Recontar um incidente |
| 4 | Plans & invitations | *going to*, presente contínuo para futuro | lazer, eventos | convidar, aceitar, recusar; sugerir (*Why don't we…?*) | Convite/aceite/recusa por mensagem |
| 5 | Shopping & comparing | comparativos, superlativos, *much/many* | compras, objetos (*It's made of…*) | comparar, comprar | Comparar dois produtos |
| 6 | Health & advice | *should, have to, must* | saúde, corpo | dar conselhos | Resposta num fórum de conselhos |
| 7 | Travel & services | *will* (ofertas), *could*, pedidos educados | serviços (banco, médico, hotel) | pedir serviços | Role-play de hotel ou bilheteria |
| 8 | Experiences | presente perfeito (*ever/never*, *just/yet*) | experiências, mídia, tecnologia | falar de experiências | Pesquisa "Have you ever…?" |
| 9 | If… | condicionais zero e primeira | cidade, educação, moradia | dar dicas | Lista de dicas para guia da cidade |
| 10 | Review + exam | revisão | — | — | **Prova A2** modelada nos 3 papers do Key |

### 3.5 B1 (Threshold) — ~350–400 h acumuladas — +700 palavras (~2.400)

**Can-dos:** iniciar, manter e encerrar conversas sobre temas familiares; dar e pedir opinião, concordar e discordar com educação; telefonemas simples; descrever experiências e sentimentos em detalhe; justificar opiniões; fazer uma apresentação curta preparada; entender as ideias principais de conversas e artigos curtos; escrever textos conectados, e-mails e uma carta formal curta; estratégias de circunlocução ("a thing you use for…"). **Mediação (CV 2020):** resumir em inglês um texto ou gráfico curto em português — ótimo para brasileiros e barato de gerar.

**Ordem gramatical:** presente perfeito × passado simples → *for/since*, presente perfeito contínuo → passado perfeito → tempos narrativos → *will/going to* para previsão, futuro contínuo → modais de probabilidade (*might, may, can't be*) → *should have* → segunda e terceira condicionais → voz passiva simples → discurso indireto → orações relativas (definidoras) → *used to* → question tags → *too/enough* → phrasal verbs → conectores (*because of, so, although, however, on the other hand*).

**Marcadores de discurso:** *By the way… / Anyway… / So, as I was saying… / I see what you mean, but… / Are you saying that…? / Do you mind if I…?*

**Pronúncia:** /θ ð/ (*think* não é "sink"/"fink"); schwa e formas fracas (*to, for, can, was*); fala conectada (*wanna/gonna* só para reconhecer); acento contrastivo; entonação em perguntas e tags; /æ/–/e/ (*bad/bed*) e /ʌ/–/ɑː/.

| # | Tema | Gramática | Vocabulário | Função comunicativa | Tarefa final |
|---|---|---|---|---|---|
| 1 | Life so far | presente perfeito × passado simples, *for/since* | vida, marcos | narrar experiências | Apresentação de linha do tempo pessoal |
| 2 | Stories | tempos narrativos, passado perfeito | sentimentos, personalidade | contar histórias com emoção | Escrever uma história de 150 palavras |
| 3 | Work & study | presente perfeito contínuo, -ing/to | trabalho e carreira | falar de si profissionalmente | Simulação de entrevista de emprego |
| 4 | The future | *will/going to*/futuro contínuo, *may/might* | meio ambiente | especular, prever | Debate de previsões |
| 5 | Imagine | segunda condicional, *wish* (prévia) | dinheiro e consumo | hipóteses | Dilemas "What would you do?" |
| 6 | Regrets | terceira condicional, *should have* | relacionamentos | lamentar, aconselhar, desculpar-se | Coluna de conselhos |
| 7 | News & media | voz passiva, discurso indireto | entretenimento, cultura, mídia | relatar, resumir | Relatar uma notícia |
| 8 | People & places | orações relativas, *used to* | lugares, problemas de viagem | descrever, reclamar | Descrever um lugar que você ama |
| 9 | Opinions | conectores, marcadores de discurso | colocações, linguagem coloquial | argumentar, concordar/discordar | Redação de opinião + apresentação de 2 min |
| 10 | Mediation + exam | resumo PT→EN | — | mediar | **Prova B1** modelada nos 4 papers do Preliminary |

### 3.6 Ponte B1+ / B2 (~500–600 h, ~600 palavras B2)

- **Gramática B2:** passado perfeito contínuo; futuro perfeito (e contínuo); condicionais mistas; *wish*; dedução no passado (*can't have, might have*); todas as passivas; relativas não definidoras; discurso indireto completo.
- **Funções B2:** pesar prós e contras; chegar a uma decisão; resumir várias fontes; gerenciar turnos (*Let's get back to…*, *That's a good point*).
- **Na plataforma:** módulos-ponte B1+ que reciclam a gramática do B1 com input mais longo e de estilo autêntico.

### 3.7 Erros típicos de brasileiros (semente para tags de erro e prompts de feedback)

**Pronúncia**

| Erro | Exemplo | Nível em que trabalhar |
|---|---|---|
| Vogal inserida (epêntese de [i]) no fim e antes de s+consoante | "lapitop", "eschool", "big-i" | A1–A2 |
| *th* vira /s z/ ou /f t d/ | *think* → "sink"/"tink" | B1 (exposição desde A1) |
| *r* soa como /h/; /h/ inicial omitido | *red/head* | A1 |
| /l/ escuro final vira /w/ | "schoow" | A2 |
| /p t k/ sem aspiração | — | A2 |
| /iː/–/ɪ/, /æ/–/e/, schwa: lê-se a vogal da grafia | *ship/sheep*, *bad/bed* | A1–B1 |
| -ed sempre como sílaba /ɪd/; -s sempre igual | "work-ed" | A1–A2 |
| Palatalização de /t d/ antes de /i/ | "djifferent" | A2 |
| /m/ final nasalizado em vez de fechado | — | A2 |
| Acento na sílaba errada | "deVElop", "comFORtable" | todos |

**Falsos cognatos:** *actually* ≠ atualmente; *pretend* ≠ pretender; *push* ≠ puxar. Também (da memória do pesquisador, a confirmar): *parents* ≠ parentes; *lunch* ≠ lanche; *college* ≠ colégio; *library* ≠ livraria; *eventually* ≠ eventualmente; *assist* ≠ assistir; *realize* ≠ realizar; *costume* ≠ costume; *fabric* ≠ fábrica; *novel* ≠ novela; *legend* ≠ legenda; *exquisite* ≠ esquisito.

**Gramática e léxico** (corpus de aprendizes brasileiros: erros mais frequentes são escolha lexical, sobretudo preposições, tempo/aspecto, determinantes e formação de pergunta/negativa):

| Erro | Correto | Tag sugerida |
|---|---|---|
| "I have 20 years" | *I am 20* | `have_idade` |
| "Is raining" | *It's raining* | `sujeito_omitido` |
| "You like?" / "I no like" | *Do you like…? / I don't like* | `do_support` |
| "She work" | *She works* | `terceira_pessoa_s` |
| "The people are…" (genérico) | *People are…* | `artigo_generico` |
| "make a question", "make a party" | *ask a question*, *have/throw a party* | `make_do` |
| "depend of", "married with", "arrive in the airport", "in Monday" | *depend on*, *married to*, *arrive at*, *on Monday* | `preposicao` |
| "since 3 years" | *for 3 years* | `for_since` |
| "I'm living here since 2020" | *I've lived here since 2020* | `presente_perfeito` |
| "explain me", "discuss about" | *explain to me*, *discuss* | `regencia_verbal` |
| "reds cars" | *red cars* | `adjetivo_plural` |
| "informations", "advices" | *information*, *advice* | `incontavel` |
| "more good" | *better* | `comparativo` |
| "when I will arrive" | *when I arrive* | `will_em_subordinada` |
| "She said me" | *She told me* | `say_tell` |

**Ações na plataforma:** marcar todo item com `cefr`, `gse`, `habilidade`, `grammar_id`, `lexis_ids` (lema+classe+sentido) e `tagsErroL1`; incluir as tags e notas contrastivas PT-BR nos prompts do Gemini; fazer revisão SRS das tags de erro que **cada aluno** realmente comete.

---

## 4. As 4 metodologias

### 4.0 Fundamentos comuns

- **CEFR como espinha dorsal**: todo conteúdo tem nível e descritor can-do. O CV 2020 propõe a abordagem **orientada para a ação** (o aluno como agente social).
- **Quatro vertentes de Nation (Four Strands)**: um curso equilibrado divide o tempo de forma aproximadamente igual entre **input com foco no significado**, **output com foco no significado**, **foco linguístico** e **fluência**. Regra: toda atividade tem exatamente um `strand`; o aluno vê um **medidor de 4 barras**; se uma vertente ficar abaixo de ~15% em 2 semanas, o sistema sugere atividades.

### 4.1 Comunicativa / Baseada em tarefas (CLT/TBLT)

- **Princípios (Ellis 2003):** a tarefa tem foco no significado, uma **lacuna** (de informação, opinião ou raciocínio), o aluno usa os próprios recursos e há um **resultado não linguístico** (lista, plano, decisão). A gramática vem **depois** do uso.
- **Fluxo (modelo de Willis):**
  1. **Pré-tarefa:** tema, 6–10 frases-chave, gravação-modelo de nativos fazendo a tarefa.
  2. **Tarefa:** ex. "Planeje um fim de semana em São Paulo para um amigo visitante: escolha 3 lugares e justifique". Autoguiado: role-play com IA (Gemini) ou diálogo ramificado.
  3. **Planejamento:** rascunho do relatório com dicas/dicionário.
  4. **Relato:** áudio ou texto; Gemini dá feedback por rubrica.
  5. **Foco linguístico 1 (análise):** perceber a estrutura-alvo na transcrição do modelo.
  6. **Foco linguístico 2 (prática):** drills da estrutura.
- **Exercícios:** lacuna de informação com IA, role-play, resolução de problemas, ranquear/decidir, relato falado, e-mail/mensagem, escuta em quebra-cabeça.
- **Progresso:** checklists can-do pontuados por rubrica (cumprimento da tarefa, fluência, precisão, repertório); IA pontua primeiro, professora confere por amostragem; portfólio de gravações.
- **Pontos fortes:** fala, transferência para a vida real, motivação de adultos, alinhamento com o CEFR.
- **Pontos fracos:** difícil no A1; depende da qualidade do role-play com IA; precisão pode fossilizar.
- **Perfil:** adultos com objetivo (trabalho, viagem), extrovertidos, quem já sabe algo (A2+).

### 4.2 Gamificada + repetição espaçada (SRS)

- **Evidências:** efeito de espaçamento (Cepeda et al. 2006: 839 avaliações, 317 experimentos); prática de recuperação supera reestudo (Karpicke & Roediger 2008); meta-análise de gamificação no ensino de inglês: efeito médio g = 0,517 (11 casos, 610 participantes), com muita variação; estudos de eficácia do Duolingo são em sua maioria da própria empresa e sem evidência equivalente de fala.
- **Algoritmos:** Leitner (caixas, simples); SM-2 (fator de facilidade por cartão; intervalos 1 e 6 dias); **FSRS** (Dificuldade, Estabilidade, Recuperabilidade; agenda revisão para probabilidade-alvo, ex. 0,9; supera SM-2 na maioria das coleções do benchmark aberto). **Recomendação:** `ts-fsrs` (MIT, Node) com `stability`, `difficulty`, `due`, `reps`, `lapses`, `state` por aluno por item.
- **Fluxo:**
  1. Fila diária de revisão (≤ ~10 min).
  2. Novo "nó" com 5–8 itens (micro-explicação + exemplos).
  3. 10–15 itens rápidos: ouvir e escolher, montar frase, traduzir PT↔EN, digitar o que ouviu, falar a frase.
  4. XP / coroa.
  5. Itens entram na fila SRS.
- **Mecânicas:** ofensiva com congelamento, XP, ligas (opcionais), desbloqueio — **sempre secundárias à recuperação**. Erros **voltam na mesma sessão**.
- **Progresso:** taxa de retenção (recuperabilidade FSRS), itens dominados, ofensiva, checkpoints por unidade.
- **Pontos fortes:** retenção de vocabulário e chunks, hábito, sessões curtas no celular.
- **Pontos fracos:** pouca produção extensa; dá para "jogar" pelo XP; platô "sei palavras, não converso".
- **Perfil:** pouco tempo (10–15 min/dia), precisa de motivação extrínseca, iniciantes absolutos.

### 4.3 Input compreensível (CI)

- **Princípios:** Krashen (i+1) — aquisição vem de mensagens compreendidas (crítica: vago; input é necessário mas não suficiente — daí a hipótese do output de Swain); **cobertura de ~98% de palavras conhecidas** para leitura extensiva fluente (Hu & Nation 2000); leitura extensiva eficaz em EFL inclusive para alunos desmotivados (Mason & Krashen 1997); **shadowing** melhora escuta, sobretudo em níveis baixos (Hamada; estudos pequenos); leitura/escuta **estreita** (vários textos do mesmo tema reciclam vocabulário).
- **Fluxo (estilo LingQ):**
  1. Escolher texto/áudio graduado; a plataforma mostra "você conhece 96%".
  2. Ouvir uma vez para a ideia geral + 2 perguntas de gist.
  3. Ler com **toque-para-glosar** (glosa em PT; adiciona ao SRS).
  4. Reouvir com transcrição e fazer **shadowing** de 3–5 frases.
  5. 3 perguntas de compreensão + 1 resposta pessoal de uma linha.
  6. Conjunto estreito: 3–5 textos do mesmo tema.
- **Exercícios:** leitores graduados, diálogos, micro-podcasts, story-asking (TPRS), ditado, shadowing, ouvir e ordenar, marcação de status de palavra.
- **Progresso:** palavras lidas e minutos ouvidos, contagem de palavras conhecidas, % de compreensão por nível, checkpoints de leitura/escuta.
- **Pontos fortes:** baixa ansiedade, prazeroso, escuta e gramática implícita, escala bem com textos gerados por IA (validados contra lista CEFR).
- **Pontos fracos:** fala demora; precisa de muito conteúdo; fraca em precisão sem algum foco na forma.
- **Perfil:** quem gosta de séries/podcasts/histórias, introvertidos, ansiosos para falar, A2+ (no A1 precisa de muito apoio visual).

### 4.4 Gramática estruturada (PPP / explícita / estilo Callan)

- **Evidências:** Norris & Ortega (2000), 49 amostras: instrução explícita d ≈ 1,13 × implícita d ≈ 0,54, efeitos duradouros (ressalva: medidas favoreciam o explícito); Spada & Tomita (2010), 41 estudos: explícita melhor para traços simples e complexos, inclusive em produção livre. Ponto fraco do PPP: alunos muitas vezes não usam a forma na produção livre. Callan/Método Direto: sem tradução, pergunta rápida → resposta em frase completa, repetição em espiral (fontes de baixa qualidade; tratar como indicativo).
- **Fluxo:**
  1. **Apresentação:** cartão da regra em PT e EN, nota contrastiva para brasileiros ("*I have 20 years* ✗ → *I am 20*"), linha do tempo, 5 exemplos com áudio.
  2. **Prática controlada:** lacuna, transformação, múltipla escolha, achar o erro — com explicação imediata.
  3. **Prática semicontrolada:** montar frases, tradução guiada.
  4. **Drill oral estilo Callan:** o áudio pergunta "Is the book on the table?", o aluno responde em frase completa; reconhecimento de voz confere; segunda passada mais rápida.
  5. **Produção:** prompt curto de escrita/fala que exige a forma; feedback de IA focado nela.
  6. **Mini-quiz.**
- **Progresso:** % de acerto por ponto gramatical (domínio: ≥85% no mini-quiz + checagem atrasada de 7 dias via SRS), testes de unidade, cobertura do programa.
- **Pontos fortes:** claro, previsível, mensurável; adultos que querem "a regra"; preparação para provas.
- **Pontos fracos:** saber regra sem fluência; menos engajamento; pouca escuta.
- **Perfil:** analíticos, quem teve inglês na escola e "nunca aprendeu a gramática", foco em prova.

### 4.5 Um núcleo de conteúdo, quatro fluxos

**Ativos do núcleo por módulo** (ex.: "A2-M4: Fazendo planos / *going to*"):

| Ativo | Campos |
|---|---|
| `VocabItem` | lema, glosa PT, áudio, exemplo, nível CEFR, frequência, imagem |
| `GrammarPoint` | regra (PT/EN), nota contrastiva PT, exemplos, erros comuns |
| `Text` (2–4 por módulo) | diálogo/história/artigo graduado, áudio, transcrição com timestamps, lista de palavras, nível |
| `Task` | objetivo, tipo de lacuna, resultado, rubrica, prompt de role-play, áudio-modelo |
| `ExerciseItem` | tipo, ativos ligados, `strand`, habilidade |
| `Checkpoint` | 10–20 itens ligados aos can-dos do módulo |

Todo ativo tem `cefr`, `strand`, `habilidade` e `status` (`rascunho_ia → revisado → publicado`).

**Fluxos = receitas ordenadas de tipos de passo que selecionam do núcleo:**

| Passo | Comunicativa (TBLT) | Gamificada (SRS) | Input compreensível | Gramática estruturada |
|---|---|---|---|---|
| 1 | Intro da tarefa + áudio-modelo (Text) | Fila SRS do dia | Áudio do texto, gist | Apresentação do GrammarPoint |
| 2 | Tarefa (role-play com IA) | Micro-intro de VocabItems | Leitura com glosa → SRS | ExerciseItems controlados |
| 3 | Planejamento (dicas = vocabulário) | ExerciseItems rápidos (todos os tipos) | Shadowing de frases do Text | Drill oral Callan (Q/A do Text) |
| 4 | Relato (falar/escrever, rubrica) | XP / ofensiva | Conjunto estreito: outros Texts | Produção (mini Task) |
| 5 | Foco linguístico: GrammarPoint a partir da transcrição | "Chefão" = Checkpoint | Compreensão + resposta pessoal | Mini-quiz |
| Inclinação | Output | Foco linguístico + fluência | Input | Foco linguístico |
| **Comum** | **Mesmo Checkpoint; todos alimentam o SRS** | | | |

- O progresso é salvo **por módulo e por can-do**, não por fluxo → trocar de metodologia não perde nada.
- **Guarda de equilíbrio:** cada fluxo injeta pelo menos um passo de outra vertente — TBLT ganha mini revisão SRS; SRS ganha um texto curto por unidade; CI ganha uma tarefa de fala por módulo; Gramática ganha um texto de escuta.

### 4.6 Questionário de recomendação (6 perguntas, ~1 min)

Pontuação: **T** (tarefas), **G** (gamificada), **I** (input), **S** (estruturada).

| # | Pergunta | Respostas → pontos |
|---|---|---|
| 1 | Quanto tempo por dia? | <15 min → G+2 · 15–30 min → G+1, I+1, S+1 · >30 min → T+1, I+1 |
| 2 | Objetivo principal? | conversar/trabalho/viagem → T+2 · entender séries/música/podcasts → I+2 · prova/escola/"aprender a gramática certo" → S+2 · criar hábito diário → G+2 |
| 3 | "Quando aprendo, prefiro…" | entender a regra primeiro → S+2 · tentar e errar → T+2 · ouvir/ler muito até "clicar" → I+2 · desafios curtos com pontos → G+2 |
| 4 | Ansiedade ao falar (1–5) | 4–5 → I+1, G+1 · 1–2 → T+1 |
| 5 | Nível atual | nivelamento rápido de 10 itens ou autoavaliação · no A1: T−1 |
| 6 | O que te motiva? | ofensivas/rankings → G+1 · relatórios de progresso → S+1 |

**Resultado:** recomenda a maior pontuação, mostra a segunda como alternativa (uma linha explicando como cada uma "é na prática") e oferece "**Experimente uma lição de cada**". Troca a qualquer momento nas configurações. Após 2 semanas, sugere reavaliar se o medidor de vertentes estiver desequilibrado ou o engajamento cair.

---

## 5. Tipos de exercício e sistema de avaliação

### 5.1 Tipos de exercício por prioridade

| Prioridade | Tipo | Correção |
|---|---|---|
| **P0 (MVP)** | Múltipla escolha (com imagem/áudio) | auto |
| P0 | Lacuna digitada (tolerância, alternativas, crédito parcial) | auto |
| P0 | Montar frase com banco de palavras | auto |
| P0 | Ouvir e escolher; **ditado** | auto (ditado por palavra, Levenshtein ≤1) |
| P0 | Associar pares (palavra ↔ tradução/áudio/imagem) | auto |
| P0 | Tradução PT→EN e EN→PT com várias respostas aceitas | auto |
| P0 | Compreensão de leitura/escuta (texto + áudio + transcrição) | auto |
| P0 | Cartão SRS (reconhecimento, depois produção) | auto |
| **P1** | Falar/repetir a frase e **shadowing** | Web Speech ou Azure |
| P1 | Completar diálogo (Guided Conversation) | auto |
| P1 | Correção de erro (ótimo para falsos cognatos e erros L1) | auto |
| P1 | Leitor graduado com status por palavra | — |
| P1 | Teste de unidade e prova de nível (cronometrados) | misto |
| **P2** | Role-play com IA (texto ou voz) + relatório | IA |
| P2 | Escrita livre corrigida por IA + fila da professora | IA → professora |
| P2 | Resposta falada (30–60 s) transcrita e pontuada + fila | IA → professora |
| P2 | Pares mínimos para brasileiros (ship/sheep, th/f) | Azure |
| P2 | Histórias e podcasts com perguntas embutidas | auto |

### 5.2 Arquitetura de avaliação em 4 camadas

Todas as camadas usam **um único banco de itens** marcado com CEFR, habilidade e can-do.

#### Camada 0 — Nivelamento (adaptativo, ~15–20 min, correção automática)

Teste adaptativo em **3 estágios** (multi-stage, como o EF SET — muito mais simples de construir que CAT item a item):

| Estágio | Itens | Conteúdo |
|---|---|---|
| 1 — roteador (dificuldade A2) | 12 | 6 sim/não de vocabulário (com pseudo-palavras para penalizar chute, como o DET), 3 de gramática, 3 de escuta |
| 2 — um de 3 painéis (A1, A2, B1) | 12 | C-test, cloze de múltipla escolha, 4 de escuta, 2 ditados |
| 3 — um de 4 painéis | 8 | fronteiras A1/A2, A2/B1, B1/B2 |

- Opcional: 1 item de repetição (*elicited imitation*) + gravação de 30 s "apresente-se", pontuados por IA como **estimativa** de fala.
- **Saída:** banda CEFR **por habilidade** (como Linguaskill) + unidade inicial sugerida. O aluno pode sempre começar mais baixo.
- Refazer a cada 30 dias (vale o melhor). A professora pode sobrescrever.

#### Camada 1 — Quizzes de lição (formativo, 5–10 itens)

- Só tipos de correção automática.
- **Feedback imediato e elaborado** (o quê / como / por quê), com nota contrastiva em PT.
- **Tentativas ilimitadas, sem impacto em nota.**
- **Domínio:** ≥80% nos itens do can-do marca a lição como concluída (mastery learning de Bloom/Guskey: 80–90%). Itens errados vão para a fila SRS.

#### Camada 2 — Teste de módulo (25–30 itens, ~20–25 min)

| Parte | Peso | Itens |
|---|---|---|
| Vocabulário/gramática (cloze MC, cloze aberto, ordenar) | 40% | 10–12 |
| Leitura (MC, associação) | 20% | 5–6 |
| Escuta (MC, lacuna, ditado) | 25% | 6–8 |
| Produção | 15% | 1 escrita curta + 1 fala |

- **Aprovação:** ≥75% no geral **e** ≥60% em cada habilidade.
- **Reprovação:** espera de 24 h; lições de reforço atribuídas automaticamente para os can-dos que falharam; reteste com **forma paralela** (sem repetir itens se o banco tiver ≥3× de cobertura).
- **Limite:** 3 tentativas; depois, a professora é avisada (alunos dela) ou abre-se um caminho de revisão (independentes).

#### Camada 3 — Prova de fim de nível (simulado ~50% do tamanho do Cambridge)

| Nível | Leitura (e escrita objetiva) | Escrita | Escuta | Fala | Tempo |
|---|---|---|---|---|---|
| **A1** (sem equivalente Cambridge adulto) | 20 itens (MC com imagem, associação, ordenar palavras) | 1 formulário/mensagem, 20–30 palavras | 15 itens, toca 2× | 3 prompts: dados pessoais, descrever imagem, 1 pergunta | ~45 min |
| **A2** (mini Key) | 20 itens (tipos das partes 1, 2, 4, 5 do Key) | E-mail 25+ palavras (/15) + história por imagens 35+ (/15) | 15 itens em 3 partes | Entrevista (4 perguntas) + discussão com parceiro de IA | ~60 min |
| **B1** (mini Preliminary) | 20 itens (MC, associação, texto lacunado, cloze MC e aberto) | E-mail ~100 palavras (/20) + artigo ou história (/20) | 15 itens em 4 partes | Entrevista, descrição de foto (1 min), discussão, pergunta de opinião | ~75 min |

- **Pesos:** como Cambridge (A2: L&E 50 / Escuta 25 / Fala 25; B1: 25% cada).
- **Aprovação:** ≥70% ponderado e ≥50% em cada habilidade. **Faixas:** 70–79 Aprovado, 80–89 Mérito, ≥90 Distinção ("acima do nível").
- **Pré-requisito:** todos os módulos do nível aprovados. Máx. 2 tentativas a cada 14 dias, forma nova a cada vez.
- **Produção:** nota da IA + **confirmação obrigatória da professora** antes do certificado. Independentes: fila de revisão, ou resultado só-IA rotulado "provisório".

### 5.3 Matriz de correção

| Tipo | Correção | Observações |
|---|---|---|
| mcq, V/F, associação, ordenar, imagem | auto | exato |
| cloze aberto, ditado, lacuna | auto tolerante | normaliza caixa e pontuação; lista de variantes; ditado por palavra com Levenshtein ≤1 (configurável) |
| c_test | auto | por lacuna + variantes |
| escrita curta | IA → professora | rubrica **Conteúdo / Realização comunicativa / Organização / Linguagem**, 0–5 cada; Gemini recebe a rubrica + 3 textos-âncora por faixa e devolve JSON |
| fala / descrição de imagem | IA → professora | transcrição (Gemini) → rubrica **Gramática e vocabulário / Pronúncia / Interação / Global**, 0–5; subnotas Azure só como feedback |
| repetição / leitura em voz alta | auto (ASR) | taxa de palavras iguais à referência; a IA nunca decide aprovação sozinha |

- Registrar em toda resposta: `avaliador` (`auto` / `ia` / `professor`), versão do modelo, hash do prompt e confiança.
- **Amostrar ~10%** das respostas pontuadas por IA para correção dupla pela professora e acompanhar o **kappa ponderado quadrático (QWK)**; meta realista ~0,72.
- **Rubricas: parafrasear, nunca copiar** (escalas do CoE precisam de permissão; descritores Cambridge são protegidos).
- **IA é provisória:** a concordância LLM–humano é "altamente dependente do contexto" (meta-análise de 65 estudos, 2025) e varia por L1 (Yancey et al., 2023).

### 5.4 Banco de itens e randomização

- Cada item: `cefr`, `habilidade`, `canDo[]`, `dificuldade` (Elo, inicializada pelo CEFR: A1 = −1,5, A2 = −0,5, B1 = 0,5, B2 = 1,5 logits), `exposicoes`, `status` (`rascunho_ia → revisao → publicado → aposentado`).
- **Testlets** (itens que compartilham um texto/áudio) são sorteados **inteiros**; opções embaralhadas (exceto quando ordenadas).
- Formas montadas a partir de um **blueprint** `{habilidade, cefr, canDo, qtd, faixaDificuldade}`, sem repetição e excluindo itens vistos nos últimos 60 dias.
- **Cobertura antes de lançar:** ≥3 formas paralelas por teste de módulo, ≥4 por prova de nível.
- **Aposentar/reescrever** item quando: exposição > ~30% da coorte, p-valor > 0,95 ou < 0,2, ou ponto-bisserial < 0,15. Estatísticas noturnas.
- **Elo online** (Pelánek 2016) com recalibração Rasch offline quando o item tiver ~200 respostas (Elo pode ser enviesado).

### 5.5 Antifraude (proporcional, baixo risco)

- Tempo por seção **controlado no servidor**; gabarito **nunca** vai ao cliente.
- Registrar trocas de aba e eventos de colar em escrita (sinalizar, não bloquear).
- Fala: gravação no navegador (sem upload de arquivo) + "nonce" falado aleatório ("diga o número 47").
- Escrita: checagem de probabilidade de texto gerado por IA e comparação com outras notas (escrita ≥2 faixas acima da fala → sinalizar para a professora).
- Prova de nível: foto opcional da webcam no início; modo supervisionado pela professora para os alunos dela.

### 5.6 Feedback

- **Quizzes:** feedback por item na hora, motivo em PT + resposta-modelo em EN + link para a micro-lição (Shute 2008: feedback elaborado, em pedaços pequenos).
- **Testes e provas:** sem feedback por item até enviar; depois, desempenho por habilidade e can-do com links "pratique isto". Gabarito de prova **nunca** é mostrado.
- **Escrita e fala:** nota por critério, 2 pontos fortes, 2 correções e versão corrigida do texto do aluno.

### 5.7 SRS (memória) — transversal

- `ts-fsrs` em todas as metodologias; respostas erradas em lições e testes criam ou "lapsam" cartões.
- Modos de cartão: `reconhecimento`, `producao`, `escuta`, `fala`.
- Cartões também para **tags de erro L1** que o aluno comete.
- Prática de recuperação **igualmente espaçada** favorece retenção de longo prazo (Karpicke & Roediger 2007): toda lição termina com quiz e os itens errados voltam depois.

### 5.8 Certificado

- Emitido quando a prova de nível é aprovada **e confirmada pela professora** (ou caminho só-IA, rotulado como tal).
- PDF com QR code apontando para `/verificar/{id}` + credencial **Open Badges 3.0** (`OpenBadgeCredential`, `achievement.criteria` = can-dos cobertos, `alignment` → nível CEFR), verificável sem chamar nosso servidor.
- Redação: "**Conclusão de curso – alinhado ao CEFR A2**". **Nunca** "certificado CEFR A2" ou "Cambridge".

---

## 6. Fala e escuta: stack, custos e LGPD

### 6.1 Stack recomendada

| Capacidade | MVP gratuito | Pago ("Pro" / alunos da professora) |
|---|---|---|
| **TTS das lições** (pré-gerado, em cache) | Google Cloud TTS **Chirp 3 HD** dentro de 1M caracteres grátis/mês, ou Gemini Flash TTS no tier grátis **só para autoria** | `gemini-3.8-flash-tts` ou Chirp 3 HD, gerado uma vez por conteúdo |
| **TTS na hora** (palavra solta) | `speechSynthesis` do navegador como fallback | mesmo pipeline em cache, sob demanda |
| **STT** ("diga a frase", respostas livres) | Web Speech API (Chrome/Edge/Safari) + fallback digitado | `gemini-3.5-flash-lite` com áudio ou `gpt-4o-mini-transcribe` |
| **Nota de pronúncia** | Azure Speech **F0** (5 h de áudio/mês) + diff por palavra | **Azure Pronunciation Assessment** (roteirizado, fonemas, prosódia) |
| **Tutor de conversa** | nenhum, ou chat de texto com Gemini + respostas em TTS | **Gemini Live API** (`gemini-3.8-live`), com limite de minutos/mês |
| **Explicação em PT-BR** | Gemini Flash-Lite transforma o JSON do Azure em dicas | igual |

**Por quê:**
- Google TTS: Chirp 3 HD US$30/1M caracteres após 1M grátis; Neural2 $16/1M após 1M; Standard $4/1M após 4M.
- Gemini Flash TTS: $9/1M tokens de áudio hoje, **$18 a partir de 01/01/2027** (Flash-Lite TTS: $6 → $12). A 25 tokens/s ≈ **US$0,81 por hora de áudio** (US$1,62 depois). Vantagem: controle de estilo e ritmo por prompt (versão lenta para A1).
- ElevenLabs: ~$0,05–0,10/1k caracteres (1,5–3× o Chirp) — só para voz de marca. OpenAI `gpt-4o-mini-tts`: ~$0,015/min — sem motivo para um segundo fornecedor.
- `speechSynthesis` do navegador varia por sistema e soa robótico: só fallback.

### 6.2 Reconhecimento de voz (STT)

**Web Speech API (grátis):**
- No Chrome o áudio **vai para um servidor** — avisar na política de privacidade.
- Safari parcial (14.1+, `webkitSpeechRecognition`); Firefox desativado por padrão.
- Modo on-device experimental; Android e ChromeOS sem suporte on-device (maio/2026).
- **Não é ferramenta de avaliação:** autocorrige para palavras prováveis — um brasileiro que diz "tree" no lugar de "three" costuma ser transcrito como "three". Usar só para **inteligibilidade** ("a frase foi entendida?").
- Detectar suporte (`window.SpeechRecognition || window.webkitSpeechRecognition`); sem suporte → MediaRecorder + STT no servidor, ou digitação.

**STT no servidor:**
- **Gemini Flash-Lite** (áudio): $0,30/1M tokens, ~32 tokens/s → ~**$0,0006/min**; pode julgar a resposta na mesma chamada ("usou passado simples?").
- `gpt-4o-mini-transcribe`: ~$0,003/min. Deepgram Nova-3: ~$0,0048/min (só se precisar de legendas < 300 ms). Whisper self-hosted: exige GPU — pular por ora.

### 6.3 Avaliação de pronúncia (núcleo do módulo de fala)

**Azure Pronunciation Assessment:**
- Notas: Accuracy (fonema, sílaba, palavra, texto), Fluency, Completeness, **Prosody** (só en-US) e PronScore.
- Erros por palavra: `Mispronunciation` (<60), `Omission`, `Insertion`, `UnexpectedBreak`, `MissingBreak`, `Monotone`.
- Fonemas em IPA com `NBestPhonemes` → diz **o que foi dito no lugar** (ex.: /t/ em vez de /θ/).
- Roteirizado (leitura, shadowing) × não roteirizado (fala livre: rodar STT primeiro e depois avaliação roteirizada sobre a transcrição).
- Áudio > 30 s exige modo contínuo (desliga `EnableMiscue`). SDK JS; amostra Node `pronunciationAssessment.js`.
- Preço = preço de STT; F0 com 5 h grátis/mês; pago ~**$1,32/h (~$0,022/min)** em tempo real (confirmar na calculadora).

**Alternativas:** SpeechSuper (~$0,004–0,008/requisição, mínimo ~$20/mês — avaliar na Fase 3); open source (wav2vec2 + alinhamento + GOP — exige GPU e calibração, não para MVP). **LLM sozinho não basta** para nota fonêmica (GPT-4o zero-shot funciona em palavra/frase, mas fonema "continua desafiador").

**Decisão:** o **Azure dá a nota**; o **Gemini só traduz o JSON em coaching em PT-BR**. Ex.: "Você disse /t/ em *think*; coloque a língua entre os dentes."

**Alvos específicos para brasileiros:** /θ ð/ → /t f d/; vogal extra no fim ("Facebook-i"); /ɪ/–/iː/ e /æ/–/ɛ/; -ed como sílaba; /h/ inicial × r português; /m/ final nasalizado. Mapear o IPA do Azure para esses alvos.

### 6.4 Gravação e upload

- **MediaRecorder** sondando formatos: `audio/webm;codecs=opus` (Chrome, Firefox, Safari 18.4+), fallback `audio/mp4` (Safari 14.1–18.3).
- Azure quer **WAV PCM 16 kHz mono**: transcodificar com ffmpeg no backend **ou** capturar PCM com AudioWorklet e gerar WAV no navegador (evita ffmpeg no Docker e corrige duração ausente no WebM do Chrome).
- **Fluxo simples:** navegador grava → POST multipart para `/api/fala/gravacoes` (Multer já existe) → backend chama Azure → salva notas → responde.
- **Fluxo de baixa latência:** backend emite token Azure de curta duração; navegador transmite via SDK JS (áudio não passa pelo nosso servidor).
- **Não salvar voz em `./uploads`** — essa pasta é pública (`GET /uploads/*`). Usar `./private-audio` e servir por rota autenticada (aluno vê as suas; professora, as da turma).
- Limites: 15–30 s por enunciado no cliente; rate limit por usuário/dia.

### 6.5 Tutor de conversa (Gemini Live)

- WebSocket com interrupção (barge-in), transcrição dos dois lados, 70 idiomas; entrada PCM 16 kHz, saída 24 kHz.
- Conexão do cliente com **tokens efêmeros** (`client.authTokens.create`: 30 min de validade, 1 min para iniciar, `uses: 1`), travados em modelo e system prompt via `liveConnectConstraints`; `sessionResumption` para reconectar a cada 10 min.
- Preço `gemini-3.8-live`: ~$0,005/min entrada, ~$0,018/min saída → role-play de 10 min ≈ **$0,15–0,25**.
- Pedagogia: system prompt com nível CEFR, vocabulário/gramática da lição e cenário ("pedir num café, A2, use *would like*"); **recast** em vez de sermão; depois da sessão, a transcrição vai para Flash-Lite gerar relatório de erros; frases-chave passam por Azure. **Guardar transcrições, não áudio.**

### 6.6 Exercícios de escuta e fala (mesmo núcleo)

- **Escuta:** áudio em cache em 2 velocidades (normal + lenta via instrução de ritmo no TTS, **não** `playbackRate`); timestamps por frase para transcrição clicável; gist → detalhe → revelar transcrição; a partir de A2/B1, alternar sotaques (en-US, en-GB, en-AU, en-IN).
- **Ditado:** frase até 3×; normalizar caixa, pontuação, contrações e números; diff por token (Levenshtein/WER) com destaque. Evidência modesta mas positiva.
- **Shadowing:** frase a frase (play → grava → Azure roteirizado → cores por palavra + prosódia), depois shadowing simultâneo do clipe inteiro. Revisão de Oxford (44 estudos): ganhos em compreensibilidade, fluência e prosódia, mas não em sons individuais → combinar com **pares mínimos**.
- **Por metodologia:** Gamificada → drills de 10 s com XP e SRS das palavras mal pronunciadas; CI → escuta graduada + shadowing; Comunicativa → role-plays com tutor Live; PPP → drills controlados, ditado e leitura em voz alta.

### 6.7 Cache (custo de TTS por conteúdo, não por aluno)

- Chave: `sha256(texto | voz | modelo | estilo | velocidade)`.
- Gerar áudio **ao publicar** a lição (a professora ouve antes de publicar).
- Disco local → S3/R2 + CDN depois; Opus/MP3 a 48 kbps (~0,36 MB/min).
- **Custo único estimado do curso A1–B1** (~300 lições × 3k caracteres ≈ 0,9M caracteres, ~50 h de áudio): ~**US$0 no Chirp 3 HD** dentro das cotas grátis (senão ~$27); ~$40 no Gemini 3.8 Flash TTS (~$80 após jan/2027).

### 6.8 Custo por aluno ativo/mês

Premissas: 20 dias de estudo; 25 enunciados avaliados/dia de ~5 s (≈42 min); 60 min de STT livre; tutor limitado a 60 min.

| Item | MVP gratuito | Pago |
|---|---|---|
| TTS (cache) | ~$0 | ~$0,01 |
| STT | $0 (Web Speech) | ~$0,04 (Flash-Lite) |
| Pronúncia (Azure) | $0 dentro de 5 h/mês **no total** (≈7 alunos nesse uso) | ~$0,90 |
| Texto de feedback (LLM) | ~$0 | ~$0,05 |
| Tutor Live (60 min) | não oferecido | ~$1,50–2,50 |
| **Total** | **~$0** | **≈ US$2,5–3,5 (≈ R$14–20)**; ≈ $1 sem tutor |

**Controles de orçamento:** cotas mensais por usuário (tutor e avaliação); pontuar só a última tentativa (as anteriores usam Web Speech grátis); preço batch para análises da professora.

### 6.9 Privacidade e LGPD

- **Gravações de voz são dados pessoais.** Se usadas para **identificar** a pessoa (voiceprint), são dado biométrico sensível (**art. 11**, consentimento específico e destacado). Gravação de prática é zona cinzenta; a consulta da ANPD sobre biometria fechou em ago/2025 sem regra final. Tratar com cautela: **opt-in explícito do microfone**, finalidade declarada ("avaliação de pronúncia"), **nunca** identificação de locutor.
- **Não enviar voz real pelo tier grátis do Gemini:** no tier grátis o Google usa os dados "para melhorar produtos"; no pago, não. **Em produção, chaves pagas.**
- **Menores (art. 14):** consentimento de responsável para crianças (<12) e tratamento no melhor interesse; tutor desligado por padrão para menores.
- **Termos do Gemini API:** usuários 18+ e proíbe apps "direcionados ou com probabilidade de acesso" por menores de 18. Geração offline pela professora (adulta) é ok; recursos de IA em tempo real para alunos precisam de **bloqueio por idade** ou termos do **Vertex AI**.
- **Transferência internacional (art. 33):** Google e Microsoft processam fora do Brasil → cláusulas contratuais (DPAs) e aviso na política. Azure tem região Brazil South (confirmar disponibilidade de pronunciation assessment).
- **Minimização:** apagar áudio bruto após pontuar (ex.: 30 dias, cron em `expiraEm`), manter só notas e transcrições; permitir guardar "amostras de progresso" (dia 1 × dia 90) com chave "manter"; exportação e exclusão de dados (art. 18); gravações visíveis só ao aluno e à professora dele.

---

## 7. Fontes de conteúdo, pipeline de IA e licenças

### 7.1 Fontes utilizáveis no produto (licença aberta ou domínio público)

| Fonte | Licença | Uso |
|---|---|---|
| **Tatoeba** | por frase; padrão **CC-BY 2.0 FR**; áudios com licenças variadas (alguns NC) | pares EN↔PT para exemplos, cloze e tradução; guardar `autor` e `licença` por linha; só áudio com uso comercial permitido |
| **VOA Learning English** | **domínio público**, uso comercial com crédito a learningenglish.voanews.com; **exceto AP, Reuters, AFP** | melhor fonte legal de áudio/texto graduado real (~A2–B1) para input, shadowing, ditado; checar item a item se não é de agência |
| **NGSL 1.2** (2.809 palavras) e **NAWL 1.2** (957) | Creative Commons, uso comercial permitido; NAWL **CC BY-SA 4.0** | lista de frequência aberta para o verificador de nível; se publicada/modificada, mantém BY-SA |
| **CEFR-J Wordlist v1.5/1.6** (A1–B2 com subníveis) e **CEFR-J Grammar Profile** | uso em pesquisa **e comercial** com citação (Tono Lab, TUFS) | **ativo-chave**: única lista aberta com nível CEFR A1–B2; fonte do `nivel` de palavras e gramática |
| **Wikibooks / Simple English Wikipedia / Wiktionary** | CC BY-SA 4.0 (Wikibooks também GFDL); algumas mídias são fair use | referência e textos adaptados; derivados ficam BY-SA, separados do conteúdo próprio |
| **Lingua Libre / Wikimedia Commons (áudio)** | CC BY-SA 4.0 | pronúncias humanas de palavras soltas; creditar o gravador |
| **Mozilla Common Voice (EN)** | **CC0**; proíbe tentar identificar locutores; datasheets antigos proíbem re-hospedar | variedade de sotaques; dados para testar ASR |
| **Project Gutenberg** | domínio público nos EUA; **remover a licença PG e qualquer menção a "Project Gutenberg"** | clássicos para simplificar em leitores B1; checar status no Brasil por autor |
| **LibriVox** | domínio público nos EUA, uso comercial permitido | audiolivros pareados com Gutenberg (B1+) |
| **StoryWeaver** | livros **CC BY 4.0**; read-alongs e vídeos **CC BY-NC-ND** (fora) | histórias em 4 níveis; tom infantil para adultos |
| **Livros abertos** | *Advanced Academic Grammar for ESL* (CC BY 4.0); *A Digital Workbook for Beginning ESOL* (CC BY 4.0); vários são **NC** (ex. *College ESL Writers*) | só CC BY ou BY-SA; NC fora se houver assinatura |
| **Imagens** | Unsplash (comercial sem atribuição); Pixabay (proíbe redistribuir avulsas); Openverse (checar uma a uma) | guardar `fonte`, `licença` e `atribuição` em toda mídia |

### 7.2 Só como referência (não copiar nem embarcar)

- **CEFR / Companion Volume (Conselho da Europa):** reprodução exige permissão escrita (publishing@coe.int). Usar para desenhar o programa e **parafrasear** os can-dos.
- **English Vocabulary/Grammar Profile (Cambridge):** só uso **não comercial**; "English Profile informed" exige permissão. Conferência manual, fora do banco.
- **Oxford 3000/5000:** licenciadas comercialmente pela OUP. Não importar (CEFR-J + NGSL cobrem quase tudo).
- **Pearson GSE:** livre para professores, sem licença de reuso encontrada. Guia de planejamento apenas.
- **Duolingo:** conteúdo proprietário, scraping proibido. Copiar ideias de UX, nunca conteúdo.
- **BBC Learning English / British Council LearnEnglish:** protegidos; além do uso em sala, exige permissão. Só **linkar**.
- **Forvo:** API não comercial sem plano pago, **cache proibido**, links expiram em 2 h. Usar TTS + Lingua Libre.
- **Cambridge (provas) e Callan:** imitar só os **formatos** (não protegidos), nunca itens ou textos.

### 7.3 IA e direitos autorais

- O Google não reivindica propriedade do que o Gemini gera, pode dar saídas parecidas a outros e o usuário responde pelo uso.
- Usar **tier pago**: no grátis, prompts podem ser lidos por revisores humanos e usados para treino.
- US Copyright Office (jan/2025): prompt sozinho não cria autoria → **edições substanciais da professora fortalecem a titularidade**; registrar toda edição humana como diff.
- Restrição de idade do Gemini API (18+): ver 6.9.

### 7.4 Modelos e preços (página oficial, nov/2026)

| Uso | Modelo | Preço (US$/1M tokens, entrada/saída) | Notas |
|---|---|---|---|
| Rascunhos | **Gemini 3.8 Flash** | $0,75 / $3,75 | sobe para $1,50 / $7,50 em **01/01/2027**; Batch API −50% |
| Checagens e classificação baratas | **Gemini 3.1 Flash-Lite** | $0,25 / $1,50 | |
| Juiz rigoroso para provas | **Gemini 3.1 Pro Preview** | $2 / $12 | |
| — | Gemini 4 Argon | $2 / $10 | sobe para $4 / $20 em 01/12/2026 |
| TTS | Gemini 3.8 Flash TTS | ~$0,00225 por 10 s | Flash-Lite TTS ~$0,0015 |
| Imagens | Nano Banana 2 Lite | $0,0336 / imagem 1K | $0,0168 batch; sem tier grátis |

- **Gemini 2.5 Flash e 2.5 Pro estão depreciados** (redirecionados em 01/12/2026): não construir sobre eles.
- Saída estruturada com JSON Schema (`enum`, `minimum/maximum`, `minItems/maxItems`, `required`). **`minLength`, `maxLength` e `uniqueItems` são ignorados** → validar com Zod depois. Schemas muito aninhados dão erro 400 → **um tipo de átomo por chamada**.

### 7.5 Pipeline de produção (fila de jobs no backend)

1. **Semente do programa (humano + IA, uma vez):** módulos do nível com can-do parafraseado, ponto gramatical (CEFR-J Grammar Profile), tema e 8–15 palavras-alvo do CEFR-J no nível ou abaixo. **A professora aprova o programa.**
2. **Geração restrita:** o prompt inclui nível, **lista de vocabulário permitido** (CEFR-J até o nível + alvos da unidade, ~1.500 lemas), estruturas proibidas, notas de interferência do PT-BR, 1–2 exemplos-ouro e o JSON Schema. Pesquisas mostram que só "pedir nível CEFR" deriva e simplifica demais A1/A2, e que prompts mais simples funcionam melhor → daí os portões do passo 3.
3. **Portões automáticos determinísticos (TypeScript):**
   - **Perfil de vocabulário:** lematizar (ex. `wink-nlp`) e exigir ≥95% de tokens no nível ou abaixo (98% para leitura extensiva); só palavras-alvo acima do nível; palavras fora da lista sinalizadas para regenerar.
   - **Tamanho e sintaxe:** comprimento de frase e de texto dentro do limite do nível; Flesch-Kincaid como sinal secundário.
   - **Integridade do gabarito:** MCQ com exatamente uma resposta, presente nas opções, opções únicas; cloze bate com a frase-fonte; ordenar reconstrói a frase; `translate_pt_en` com ≥2 respostas aceitas.
   - **Duplicatas:** embeddings (Gemini Embedding, $0,20/1M), rejeitar similaridade > 0,92 com o banco.
4. **Juiz LLM (outro modelo e outro prompt):** resolve o item **sem ver o gabarito**; se divergir ou achar duas respostas válidas → fila humana (só ~53% dos distratores do ChatGPT foram considerados prontos por professores, Bitew et al.). Depois pontua 1–5: adequação CEFR, naturalidade, adequação cultural para brasileiros, correção da explicação em PT. **Pro para itens de prova**, Flash-Lite para drills.
5. **Mídia:** TTS para todo texto, frase e palavra (en-US e en-GB, lenta e normal); imagens do Nano Banana 2 Lite com prompt de estilo fixo, ou Unsplash/Pixabay; licença em cada linha.
6. **Revisão humana:** estados `rascunho → verificado_auto → em_revisao → alteracoes_pedidas → aprovado → publicado → arquivado`. A tela da professora mostra os alertas inline (palavras fora do nível destacadas, divergências do juiz) e permite editar, regenerar campo e aprovar; **aprovação em lote** para drills que passaram em todos os portões.
7. **Versionamento:** `VersaoConteudo` imutável (JSON, versão-pai, modelo, id e versão do prompt, quem editou, diff). Lições apontam para versões publicadas → histórico do aluno continua válido. Prompts versionados no banco para achar e regenerar itens de um prompt ruim.
8. **Ciclo de feedback:** p-valor e discriminação por item; p > 0,95 ou < 0,2 ou discriminação negativa → revisão automática.

### 7.6 Custo de IA para A1–B1

Premissas: ~120 unidades; 1 texto + 1 diálogo, ~40 exercícios, 15 itens de vocabulário e 1 nota de gramática por unidade, mais banco de testes ≈ **6.000 itens**; ~2,5 tentativas de geração por átomo aproveitado.

| Item | Volume | Custo (preços Flash 2027, padrão) |
|---|---|---|
| Geração (Flash) | ~15M entrada / ~10M saída | ≈ **$100** (≈ $50 em batch) |
| Juiz (Flash-Lite drills; Pro para ~1.500 itens de prova) | ~20M / 3M | ≈ **$40** |
| TTS (~25 h) | 9.000 × 10 s | ≈ **$20–40** |
| Imagens (~1.000) | Nano Banana 2 Lite | ≈ **$17–34** |
| Embeddings | ~10M | ≈ **$2** |
| **Total IA** | | **≈ $200–250** (< $150 se feito em batch antes de 01/01/2027) |

> **O custo real é a revisão humana:** ~1–1,5 h por unidade → **120–180 horas da professora** para A1–B1 completo. Alertas automáticos e aprovação em lote são as principais alavancas para reduzir isso.

> Nota de dimensionamento: a pesquisa de conteúdo sugere ~40 unidades por nível; o currículo da seção 3 usa 10 módulos × ~6 lições (≈60 lições por nível). Os números são compatíveis se "unidade" ≈ "lição"; os custos acima valem como ordem de grandeza.

### 7.7 Recomendações práticas

1. Importar **CEFR-J (vocabulário e gramática), NGSL/NAWL e Tatoeba EN–PT** como tabelas-semente primeiro — todas as checagens dependem delas.
2. Construir os **verificadores determinísticos antes** da engenharia de prompt.
3. Gerar com **Gemini 3.8 Flash via Batch**, de preferência antes da duplicação de preço de jan/2027. Não usar 2.5.
4. `AtribuicaoFonte` para todo conteúdo de terceiros e **página de créditos gerada automaticamente**.
5. VOA e LibriVox para escuta autêntica; TTS para o resto. Não usar Forvo, BBC ou British Council.
6. Resolver a **questão dos menores** agora (ver seção 10).

---

## 8. Arquitetura técnica

### 8.1 Fatos do código atual que moldam o desenho

- **Não existe middleware `requireRole`** (o CLAUDE.md diz que existe): cada controller faz `if (req.user.role !== 'professor')`. Rotas usam `as any`.
- **Qualquer pessoa pode virar professor:** `POST /api/auth/register/professor` é público e todo professor acessa `/admin/*`. **É a falha mais grave hoje.**
- **JWT:** sem `expiresIn`; segredo de fallback `'sweet-way-secret-key'` fixo em `auth.ts`, `AuthController.ts` e no `docker-compose.yml`.
- **Login ambíguo:** procura `Professor` e depois `Aluno`; o mesmo e-mail pode existir nas duas tabelas.
- **Uploads:** Multer sem `limits` nem `fileFilter`; nome `${Date.now()}-${originalname}`; tudo em `./uploads` é público.
- `zod@4` instalado mas não usado; `server.ts` não exporta `app` (o teste de integração monta o próprio app em volta do `router` — bom padrão); `PORT` fixo; Prisma 7 com adapter better-sqlite3 (enums já funcionam).
- **Frontend:** páginas `'use client'` chamando `apiFetch`; auth em `localStorage`; **sem guarda de rota**.

### 8.2 Modelo de dados (Prisma)

#### Usuários: unificar as tabelas (Fase 0)

Toda tabela nova precisa de uma FK de aprendiz, e agora há três tipos de aprendiz (alunos da professora, independentes e o dono, que é aluno **e** admin). Com tabelas separadas, cada nova tabela teria duas FKs anuláveis ou uma FK polimórfica. O banco ainda é pequeno: migrar agora é barato.

```prisma
enum Papel { aluno professor admin }

model Usuario {
  id                   Int       @id @default(autoincrement())
  nome                 String
  email                String    @unique
  senhaHash            String
  papel                Papel     @default(aluno)
  dataNascimento       DateTime? // LGPD art.14 / Gemini 18+
  consentimentoAudioEm DateTime?
  tokenVersao          Int       @default(0) // incrementar = revogar todos os JWTs
  criadoEm             DateTime  @default(now())
  perfil               PerfilAprendiz?
  turmasProfessor      Turma[]   @relation("ProfessorTurmas")
  matriculas           Matricula[]
  submissoes           Submissao[]
  feedbacks            Feedback[]
}

// em Turma (para a professora atribuir um curso/nível à turma)
// cursoId Int?
```

**Passos da migração:** (1) criar `Usuario`; (2) copiar `Professor` mantendo ids; (3) copiar `Aluno` com ids novos, registrando antigo→novo em `_mapaAluno`; (4) reescrever `Matricula.alunoId`, `Submissao.alunoId`, `Turma.professorId`, `Feedback.professorId`; (5) remover `Professor` e `Aluno`; (6) marcar a conta do dono como `admin`.

**Mudanças de código:** `promoteAluno` vira `UPDATE papel` (acaba a perda de dados do copiar-e-apagar); login com uma busca só; payload do JWT `{ sub, papel, v: tokenVersao }`. **Aluno independente** = `Usuario(papel=aluno)` sem `Matricula`.

#### Currículo (núcleo único)

```prisma
enum StatusConteudo { rascunho_ia verificado_auto em_revisao alteracoes_pedidas aprovado publicado arquivado }
enum Habilidade { listening reading speaking writing grammar vocabulary }
enum Strand { input output foco_linguistico fluencia } // 4 vertentes de Nation

model Curso {
  id     Int     @id @default(autoincrement())
  slug   String  @unique
  titulo String
  niveis Nivel[]
}

model Nivel { // A1, A2, B1, (B1+)
  id             Int      @id @default(autoincrement())
  cursoId        Int
  codigoCefr     String
  ordem          Int
  horasEstimadas Int
  gseMin         Int?
  gseMax         Int?
  canDos         CanDo[]
  modulos        Modulo[]
  curso          Curso    @relation(fields: [cursoId], references: [id])
  @@unique([cursoId, codigoCefr])
}

model CanDo { // descritores parafraseados, ex. "A2.R.03"
  id          Int        @id @default(autoincrement())
  codigo      String     @unique
  nivelId     Int
  habilidade  Habilidade
  descricaoPt String
  descricaoEn String
  gse         Int?
  nivel       Nivel      @relation(fields: [nivelId], references: [id])
}

model Modulo { // 10 por nível
  id              Int             @id @default(autoincrement())
  nivelId         Int
  ordem           Int
  titulo          String
  tema            String
  pontoGramatical String          // chave grammar_id (estilo CEFR-J/EGP)
  funcao          String
  focoPronuncia   String
  status          StatusConteudo  @default(rascunho_ia)
  licoes          Licao[]
  atomos          AtomoConteudo[]
  nivel           Nivel           @relation(fields: [nivelId], references: [id])
  @@unique([nivelId, ordem])
}

model Licao {
  id               Int            @id @default(autoincrement())
  moduloId         Int
  ordem            Int
  titulo           String
  minutosEstimados Int
  canDoCodigos     Json           // string[]
  status           StatusConteudo @default(rascunho_ia)
  modulo           Modulo         @relation(fields: [moduloId], references: [id])
  @@unique([moduloId, ordem])
}
```

#### Átomos de conteúdo (uma tabela, corpo JSON versionado; lições **não** são guardadas por metodologia)

```prisma
enum TipoAtomo { texto vocab nota_gramatical exercicio tarefa clipe_audio }

model AtomoConteudo {
  id                Int            @id @default(autoincrement())
  tipo              TipoAtomo
  moduloId          Int
  licaoId           Int?           // null = pool do módulo (SRS / banco de testes)
  cefr              String
  habilidade        Habilidade
  strand            Strand
  tagsErroL1        Json           @default("[]") // ["do_support","have_idade",...]
  versaoPublicadaId Int?           // ponteiro usado pelos players
  status            StatusConteudo @default(rascunho_ia)
  versoes           VersaoConteudo[]
  modulo            Modulo         @relation(fields: [moduloId], references: [id])
  @@index([moduloId, tipo, status])
}

model VersaoConteudo { // imutável
  id               Int      @id @default(autoincrement())
  atomoId          Int
  numero           Int
  corpo            Json     // discriminado por tipo; exercício: {type, prompt, payload, feedback}
  gabarito         Json?    // NUNCA serializado para alunos
  origem           String   // ai_gemini | professor | importado
  modelo           String?
  promptTemplateId Int?
  editadoPorId     Int?
  diff             Json?
  flagsVerificacao Json?    // saída dos verificadores e do juiz
  criadoEm         DateTime @default(now())
  atomo            AtomoConteudo @relation(fields: [atomoId], references: [id])
  @@unique([atomoId, numero])
}
```

Um schema zod compartilhado em `backend/src/domain/exercicios/schemas.ts` (`discriminatedUnion` por `type`: `mcq`, `cloze`, `word_order`, `match`, `dictation`, `listen_select`, `translate_pt_en`, `speak_repeat`, `short_writing`, `speaking_prompt`, …) valida `corpo` em **toda escrita** — obrigatório, pois o banco não valida JSON.

**Formato de item (referência):**

```jsonc
{
  "type": "mcq",
  "prompt": { "en": "Choose the correct answer.", "pt": "Escolha a resposta correta." },
  "stimulus": { "groupId": "tst_123", "text": "...", "audio": { "url": "...", "maxPlays": 2, "transcript": "..." } },
  "payload": { "options": [{ "id": "a", "text": "went" }, { "id": "b", "text": "goed" }], "shuffle": true },
  "scoring": { "mode": "auto", "maxPoints": 1, "partialCredit": "none", "rubricId": null },
  "feedback": {
    "correct": { "pt": "Isso! Passado de 'go' é irregular." },
    "byOption": { "b": { "pt": "'goed' não existe: 'go' é irregular → 'went'." } },
    "remediationLessonId": "les_045"
  }
}
// gabarito (separado, só servidor):
// { "correct": ["a"], "accepted": {"1": ["went"]}, "tolerance": {"caseInsensitive": true, "levenshtein": 1, "ignorePunct": true} }
```

#### Fluxos de metodologia (configuração, não conteúdo)

```prisma
enum Metodologia { comunicativa gamificada input_compreensivel gramatica_estruturada }

model FluxoMetodologia {
  id          Int         @id @default(autoincrement())
  metodologia Metodologia
  versao      Int
  passos      Json // [{tipo:"apresentacao_gramatica", seleciona:{tipo:"nota_gramatical"}}, {tipo:"exercicios", filtro:{strand:"foco_linguistico"}, qtd:8}, ...]
  @@unique([metodologia, versao])
}
```

`LicaoService.montar(licaoId, metodologia)` lê os átomos publicados e o fluxo e devolve a lista ordenada de passos. Todos os fluxos terminam no **mesmo checkpoint do módulo**.

#### Avaliação

```prisma
enum TipoAvaliacao { quiz_licao teste_modulo exame_nivel nivelamento }
enum Avaliador { auto ia professor }

model ItemBanco { // visão "de prova" sobre átomos de exercício
  id              Int     @id @default(autoincrement())
  atomoId         Int     @unique
  canDoCodigos    Json
  grupoTestletId  String?
  dificuldadeElo  Float   @default(0)
  exposicoes      Int     @default(0)
  pValor          Float?
  pontoBisserial  Float?
  aposentado      Boolean @default(false)
}

model BlueprintAvaliacao {
  id             Int           @id @default(autoincrement())
  tipo           TipoAvaliacao
  nivelId        Int?
  moduloId       Int?
  secoes         Json // [{habilidade, cefr, canDos[], qtd, tipos[], faixaDificuldade}]
  regraAprovacao Json // {geral:0.75, minPorHabilidade:0.6}
  tempoLimiteSeg Int?
  maxTentativas  Int?
  cooldownHoras  Int?
}

model Tentativa {
  id                     Int           @id @default(autoincrement())
  usuarioId              Int
  blueprintId            Int?
  licaoId                Int?
  tipo                   TipoAvaliacao
  metodologia            Metodologia?
  itensForma             Json          // lista congelada de ids de VersaoConteudo
  iniciadaEm             DateTime      @default(now())
  expiraEm               DateTime?
  enviadaEm              DateTime?
  pontuacao              Float?
  resultadoPorHabilidade Json?
  cefrEstimado           String?
  aprovado               Boolean?
  flagsIntegridade       Json          @default("[]")
  confirmadoPorId        Int?          // confirmação da professora (prova de nível)
  respostas              Resposta[]
  @@index([usuarioId, tipo])
}

model Resposta {
  id                Int       @id @default(autoincrement())
  tentativaId       Int
  versaoId          Int
  resposta          Json
  pontos            Float?
  maxPontos         Float
  avaliador         Avaliador @default(auto)
  tipoErro          String?
  latenciaMs        Int?
  metaIa            Json?     // {modelo, promptHash, confianca, rubrica}
  overrideProfessor Json?
  gravacaoId        Int?
  tentativa         Tentativa @relation(fields: [tentativaId], references: [id])
}

model Certificado {
  id          String   @id @default(cuid())
  usuarioId   Int
  nivelId     Int
  tentativaId Int      @unique
  obv3        Json     // Open Badges 3.0
  emitidoEm   DateTime @default(now())
}

model Rubrica {
  id       Int    @id @default(autoincrement())
  cefr     String
  criterios Json  // [{chave, faixas:[{nota:0-5, descricaoPt, descricaoEn}]}]
  ancoras  Json   // [{respostaId, notas}]
}
```

O nivelamento é uma `Tentativa(tipo=nivelamento)` contra um blueprint de 3 estágios; o resultado vai para `PerfilAprendiz`.

#### Estado do aprendiz

```prisma
model PerfilAprendiz {
  usuarioId           Int          @id
  metodologia         Metodologia?
  respostasOnboarding Json?
  nivelAtualId        Int?
  nivelamentoCefr     Json?        // bandas por habilidade
  metaMinutosDia      Int?
  diasSemana          Int?
  ofensivaAtual       Int          @default(0)
  ofensivaRecorde     Int          @default(0)
  congelamentos       Int          @default(0)
  ultimaAtividadeEm   DateTime?
  xp                  Int          @default(0)
  habilidadeElo       Float        @default(0)
  usuario             Usuario      @relation(fields: [usuarioId], references: [id])
}

model ProgressoLicao {
  usuarioId       Int
  licaoId         Int
  status          String    @default("nao_iniciada") // em_andamento | concluida
  melhorPontuacao Float?
  passoAtual      Int       @default(0)
  concluidaEm     DateTime?
  @@id([usuarioId, licaoId])
}

model DominioCanDo { // independente de metodologia
  usuarioId    Int
  canDoCodigo  String
  dominio      Float
  atualizadoEm DateTime @updatedAt
  @@id([usuarioId, canDoCodigo])
}

model RevisaoSRS { // Card do ts-fsrs
  id            Int       @id @default(autoincrement())
  usuarioId     Int
  atomoId       Int
  modo          String    @default("reconhecimento") // reconhecimento|producao|escuta|fala
  due           DateTime
  stability     Float
  difficulty    Float
  elapsedDays   Int
  scheduledDays Int
  reps          Int
  lapses        Int
  state         Int
  lastReview    DateTime?
  @@unique([usuarioId, atomoId, modo])
  @@index([usuarioId, due])
}

model LogRevisao {
  id         Int      @id @default(autoincrement())
  revisaoId  Int
  rating     Int
  latenciaMs Int?
  em         DateTime @default(now())
}

model StatusPalavra { // CI: 0 nova .. 4 conhecida
  usuarioId Int
  lema      String
  status    Int
  @@id([usuarioId, lema])
}
```

#### Mídia, IA e revisão

```prisma
model AssetAudio {
  id         Int    @id @default(autoincrement())
  hash       String @unique // sha256(texto|voz|modelo|estilo|velocidade)
  voz        String
  modelo     String
  velocidade String
  caminho    String
  duracaoMs  Int
  timepoints Json?
}

model Gravacao {
  id             Int      @id @default(autoincrement())
  usuarioId      Int
  atomoId        Int?
  caminhoPrivado String   // ./private-audio, nunca ./uploads
  mime           String
  duracaoMs      Int
  transcricao    String?
  pontuacoes     Json?    // Azure / Gemini
  manter         Boolean  @default(false)
  expiraEm       DateTime
}

model TarefaRevisao { // fila única da professora: conteúdo + produções de alunos
  id            Int      @id @default(autoincrement())
  tipo          String
  atomoId       Int?
  respostaId    Int?
  atribuidaAId  Int?
  status        String
  criadoEm      DateTime @default(now())
}

model PromptTemplate {
  id     Int    @id @default(autoincrement())
  chave  String
  versao Int
  texto  String
  schema Json
  @@unique([chave, versao])
}

model AtribuicaoFonte {
  id      Int     @id @default(autoincrement())
  atomoId Int?
  fonte   String
  licenca String
  autor   String?
  url     String?
}

model ListaPalavra { // CEFR-J, NGSL
  id    Int    @id @default(autoincrement())
  lema  String
  pos   String
  nivel String
  fonte String
  @@unique([lema, pos, fonte])
}

model UsoIa {
  id        Int      @id @default(autoincrement())
  usuarioId Int?
  recurso   String
  unidades  Int
  custoUsd  Float
  em        DateTime @default(now())
}
```

Os modelos atuais (`Atividade`, `Submissao`, `Feedback`, `MaterialApoio`, `Aviso`) continuam como camada de **gestão de turma**. Com o tempo, `Atividade` ganha `licaoId`/`blueprintId` para a professora **atribuir** conteúdo do curso.

#### SQLite ou Postgres

- **SQLite serve até o fim da Fase 1** (uma professora, dezenas de alunos, um volume Docker). Prisma 7 em SQLite suporta `Json` (como TEXT, sem filtro por caminho) e enums.
- **Migrar para Postgres no início da Fase 2**, antes do cadastro público: SQLite tem um único escritor; Postgres indexa JSON (`jsonb` + GIN), tem backup e recuperação ponto-a-ponto e `pgvector` para duplicatas.
- Para manter a migração barata: nada de SQL bruto; todo acesso a JSON em TypeScript; serviço `postgres` no `docker-compose.yml` atrás de um *profile* desde já.

### 8.3 API (tudo em `/api`, validado com zod, `requireRole`)

| Área | Endpoints |
|---|---|
| Auth | `POST /auth/register` (sempre `aluno`), `POST /auth/login` → JWT de acesso (15 min) + refresh em cookie httpOnly, `POST /auth/refresh`, `POST /auth/logout`, `GET /me`; `POST /admin/usuarios` (admin cria professores) |
| Onboarding | `GET /onboarding/perguntas`, `POST /onboarding` → metodologia recomendada + segunda opção, `PATCH /me/perfil` |
| Nivelamento | `POST /nivelamento/iniciar`, `POST /nivelamento/:tentativaId/responder` (servidor roteia os estágios), `POST /nivelamento/:id/finalizar` |
| Catálogo | `GET /cursos/:slug/trilha`, `GET /modulos/:id`, `GET /licoes/:id/player?metodologia=` (passos montados, **sem gabarito**) |
| Prática | `POST /licoes/:id/passos/:idx/responder` → `{correto, pontos, feedbackPt, explicacao}`, `POST /licoes/:id/concluir` |
| Testes | `POST /avaliacoes/:blueprintId/iniciar` (monta forma, aplica cooldown e limite), `PUT /tentativas/:id/respostas/:versaoId`, `POST /tentativas/:id/enviar`, `GET /tentativas/:id/resultado` |
| SRS | `GET /revisao/fila?limite=`, `POST /revisao/:id/avaliar {rating, latenciaMs}` |
| Fala | `POST /fala/gravacoes` (multipart, só áudio, ≤2 MB, ≤30 s), `GET /fala/gravacoes/:id/audio` (stream autenticado de `./private-audio`), `POST /fala/avaliar-pronuncia`, `GET /audio/:hash` (TTS em cache) |
| Palavras (CI) | `PUT /palavras/:lema/status`, `GET /textos/:atomoId/cobertura` (% conhecido) |
| Autoria (professor/admin) | `POST /autoria/modulos/:id/gerar {tipo, qtd}` (enfileira job Gemini), `GET /autoria/jobs/:id`, `GET /autoria/atomos?status=em_revisao`, `PATCH /autoria/atomos/:id` (nova versão), `POST /autoria/atomos/:id/regenerar-campo`, `POST /autoria/atomos/:id/transicao {para}`, `POST /autoria/licoes/:id/publicar` (dispara TTS) |
| Fila de revisão | `GET /revisoes`, `POST /revisoes/:id/decidir {aceitar|override, pontos, comentario}` |
| Análises da professora | `GET /professor/turmas/:id/progresso` (nível, módulos, domínio de can-dos, vertentes, retenção SRS, última atividade), `GET /professor/alunos/:id/progresso`, `POST /turmas/:id/atribuicoes` |
| Certificados | `GET /certificados/:id`, público `GET /verificar/:id` |

Toda correção acontece no servidor, em `domain/exercicios/corrigir.ts`: uma função pura por tipo (Levenshtein para cloze e ditado), fácil de testar.

### 8.4 Telas (frontend)

**Antes de novas páginas:** guarda de rota por papel (`middleware.ts` lendo um cookie `papel` não-httpOnly só para UX, ou hook `useSessao()`); `lib/api/` tipado por área sobre o `apiFetch`.

| Caminho | Para quê |
|---|---|
| `(main)/cadastro` | Cadastro com data de nascimento, termos e consentimento LGPD |
| `(main)/aluno/onboarding` | 6 perguntas, amostra "experimente cada método", depois nivelamento |
| `(main)/aluno/nivelamento` | Teste de nivelamento |
| `(main)/aluno/trilha` | Trilha estilo Duolingo por nível |
| `(main)/aluno/licao/[id]` | Player de lição |
| `(main)/aluno/revisao` | Sessão SRS |
| `(main)/aluno/teste/[blueprintId]` | Teste cronometrado |
| `(main)/aluno/progresso` | Domínio de can-dos, medidor de vertentes, ofensiva |
| `(main)/aluno/certificados` | Certificados |
| `(main)/aluno/configuracoes` | Trocar metodologia, consentimento de áudio |
| `(main)/professor/conteudo` | Árvore de módulos |
| `(main)/professor/conteudo/modulos/[id]` | Editor de átomos |
| `(main)/professor/revisoes` | Fila única (conteúdo + produções de alunos) |
| `(main)/professor/turmas/[id]/progresso` | Análises da turma |
| `(main)/verificar/[id]` | Verificação pública de certificado |

**Componentes** (`src/components/curso/`):
- **`LicaoPlayer`**: máquina de estados sobre os passos do `/player`; `PassoRenderer` por tipo; barra de progresso, botão "verificar", folha de feedback em PT.
- **`exercicios/`**: `MultiplaEscolha`, `Lacuna`, `OrdenarPalavras`, `Associar`, `Ditado`, `OuvirSelecionar`, `TraduzirPtEn`, `FalarRepetir`, `EscritaCurta`, `RespostaFalada` — contrato comum `{corpo, onResponder(resposta)}`. Primeiro alvo de testes Jest + RTL.
- **`ModoTeste`**: envolve os renderizadores com timer do servidor e sem feedback por item.
- **`Gravador`** (`useGravador` sobre MediaRecorder, limite 30 s, prompt de consentimento) e `useReconhecimentoFala` (detecção de Web Speech).
- **`AudioPlayer`**: velocidade normal/lenta, transcrição, replay por frase (estende `AssetPreview`).
- **`LeitorGlossado`**: tocar palavra → glosa, cor de status, "adicionar ao SRS".
- **`CartaoSRS`**: vira o cartão e grava nota em 4 botões.
- **Professora:** `EditorAtomo` (formulário gerado do schema zod, fallback JSON, alertas inline), `DiffVersoes`, `PainelRevisao` (aprovar/rejeitar por teclado).
- **Gráficos:** uma biblioteca pequena (Recharts).

### 8.5 Serviços (`backend/src/services/`)

- **`ia/gemini.ts`**: wrapper fino sobre `@google/genai` — modelo por chamada, resposta em JSON Schema, revalidação zod, retries, log de custo em `UsoIa`, hash do prompt; prompts vêm de `PromptTemplate`; **só chave paga; a chave nunca vai ao cliente**.
- **`ia/gerador.ts`**: (1) prompt restrito → (2) portões determinísticos (`verificadores/`: cobertura de vocabulário com `wink-nlp`, tamanho, gabarito, duplicatas) → (3) juiz cego → (4) `VersaoConteudo` com `status=em_revisao` + tarefa de revisão.
- **`ia/avaliadorProducao.ts`**: pontua escrita e fala com rubrica e âncoras e cria `TarefaRevisao`; nota provisória até a professora confirmar (provas de nível).
- **`jobs/`**: geração, TTS e estatísticas noturnas fora do request — tabela de jobs no SQLite com worker in-process; BullMQ/pg-boss após Postgres.
- **`fala/tts.ts`**: hash → `AssetAudio` → Chirp 3 HD ou Gemini TTS → `./media/tts/{hash}.mp3`; roda ao publicar.
- **`fala/pronuncia.ts`**: Azure (roteirizado, IPA) → mapeamento para alvos brasileiros → dicas em PT via Flash-Lite.
- **`srs/fsrs.ts`**: wrappers `ts-fsrs`; erros em lições e testes criam/lapsam cartões.
- **`adaptativo/elo.ts`**: atualiza habilidade do aluno e dificuldade do item a cada resposta.
- **Feature flags:** todo recurso de IA em tempo real para menores de 18 desligado, salvo permissão por `Usuario.dataNascimento`.

### 8.6 Segurança e dívida técnica (Fase 0, antes de qualquer código do curso)

1. **Fechar o autocadastro de professor**: remover `register/professor`; só admin cria professores.
2. **JWT:** falhar na inicialização se `JWT_SECRET` faltar ou tiver < 32 caracteres; ler o segredo em um só módulo (`config/env.ts`, env validado com zod); `expiresIn: '15m'` + refresh rotativo em cookie httpOnly SameSite; checagem de `tokenVersao`; remover o default do `docker-compose.yml`.
3. **`requireRole(...papeis)`** em todas as rotas, `admin` em `/admin/*`, tipar `AuthRequest` e remover os `as any`.
4. **Validação de entrada:** middleware `validate({body, params, query})` com zod + handler central de erros.
5. **Uploads:** `limits` (10 MB arquivos, 2 MB áudio), checar MIME e magic bytes, nome com UUID, diretório privado para gravações.
6. **Endurecimento geral:** `helmet`, `cors({origin: APP_ORIGIN})`, `express-rate-limit` em auth e IA, `PORT` do ambiente, exportar `createApp()` de `app.ts` para supertest cobrir o app real.
7. **Migração `Usuario`** e correção do `promoteAluno`.
8. **Atualizar o CLAUDE.md** (hoje diz que `requireRole` existe).

---

## 9. Roadmap em fases

Um desenvolvedor; estimativas aproximadas.

> **Ajuste pelas decisões de 03/11/2026 (seção 1.3.1):** na Fase 1 saem a geração com Gemini, o verificador de IA e o cache de TTS, e os tipos `dictation`/`listen_select`. Ficam os tipos determinísticos (`mcq`, `cloze`, `word_order`, `match`, `translate` com respostas aceitas), o conteúdo A1 semeado/curado e o editor + fila de revisão da professora. Na Fase 2, o Postgres só entra quando houver hospedagem pública; cobrança continua fora até a pesquisa de mercado.

| Fase | Duração | Escopo | Entrega | Testes |
|---|---|---|---|---|
| **0 — Fundações** | 2–3 semanas | Seção 8.6 completa; migração `Usuario`; `createApp`; env com zod; pasta `domain/`; profile Postgres no compose; hook de sessão e guarda de rota no frontend | Tudo que existe hoje funcionando igual, sobre a nova autenticação | Testes Vitest atuais verdes; supertest para auth, papéis e limites de upload; teste da migração numa cópia do banco de seed |
| **1 — MVP A1** ✅ implementada (ver 9.1) | 6–8 semanas | **Metodologia: Gramática Estruturada (PPP).** Modelos de currículo + A1 módulos 1–10 semeados (títulos e can-dos); átomos/versões com estados; tipos P0 (mcq, cloze, word_order, match, translate, dictation, listen_select); correção no servidor; quizzes (≥80%); teste de módulo (75%/60%, formas paralelas); `ProgressoLicao`/`DominioCanDo`; ofensiva e XP básicos; cache de TTS. Geração Gemini atrás do verificador CEFR-J/NGSL; editor e fila de revisão da professora (**nada publicado sem aprovação**). Frontend: `trilha`, `LicaoPlayer`, `ModoTeste`, progresso do aluno, tabela de progresso da turma | **10 módulos A1 × 6 lições** usáveis pelos alunos da professora e pelo dono | Testes de tabela para cada função `corrigir` e cada schema zod; montador de formas (sem repetição, testlets inteiros); Gemini mockado no wrapper com JSON golden; primeiros testes Jest; Playwright: login → lição → quiz → progresso |
| **2 — Retenção e nivelamento** | 4–5 semanas | Migrar para Postgres; FSRS + página `revisao`; **fluxo Gamificado** (mesmos átomos); questionário de onboarding com metodologia trocável; nivelamento adaptativo (3 estágios); Elo; estatísticas noturnas de itens com alertas; **cadastro público** | Alunos independentes podem entrar | Testes de propriedade do agendamento FSRS; roteamento do nivelamento; carga nos endpoints de tentativa |
| **3 — Escuta e fala** | 5–6 semanas | `Gravador`, consentimento e rota de áudio privada; repetição com Web Speech; Azure com coaching em PT; shadowing; **fluxo de Input Compreensível** (leitor glossado, `StatusPalavra`, % de cobertura); cron de expiração de gravações; exportação e exclusão LGPD | Módulo de fala e terceira metodologia | Corpus de fixtures de áudio (mapeamento Azure testado contra JSON gravado); MediaRecorder mockado no Jest; matriz manual de dispositivos (Chrome, Safari, Android) |
| **4 — Produção e provas** | 4–6 semanas | Escrita e fala curtas pontuadas por IA com fila da professora; **prova de fim de nível A1**; certificado Open Badges + página de verificação; flags de integridade; **fluxo Comunicativo/TBL** com role-play de texto (Gemini) e relatório pós-conversa | Curso A1 completo, 4 metodologias, certificado | QWK na amostra de ~10% com correção dupla; snapshot dos prompts de rubrica |
| **5+ — A2 → B1, tutor e monetização** | contínuo | Produção de conteúdo A2 e B1 (sobretudo tempo de revisão: ~120–180 h por conjunto de nível); tutor Gemini Live com tokens efêmeros e cotas; assinaturas (Stripe/Mercado Pago) com cotas de `UsoIa`; mídia em S3/CDN; módulos-ponte B1+ | Curso A1–B1 e modelo de assinatura | — |

### 9.1 Situação da Fase 1 — implementada (03/11/2026)

**Entregue** (conforme as decisões da seção 1.3.1: sem IA, sem áudio, tudo determinístico, inglês americano):

- **Conteúdo A1 completo, escrito e versionado em JSON** (`backend/prisma/conteudo/a1/m01.json` … `m10.json`): 10 módulos × 6 lições = 60 lições, **865 exercícios** em ordem PPP (controlada → semicontrolada → produção → mini-quiz de 4–5 itens) e **360 itens de teste** (2 formas paralelas de 18 itens por módulo: 10 gramática/vocabulário, 4 leitura com textos originais, 4 escrita). Validação com `npm run conteudo:validar` (schema zod + portões de gabarito, inclusive banco de palavras do `word_order`); importação com `npm run conteudo:importar` (entra como `revisao`; idempotente; `--sobrescrever` só sob pedido). O seed importa o curso; `SEED_PUBLICAR_CONTEUDO=1` publica direto (demonstração).
- **Tipos de exercício:** `mcq` (com texto de leitura opcional), `cloze` (digitado ou com lista por lacuna), `word_order`, `match`, `translate` (pt→en), `error_correction`. Correção só no servidor (`domain/correcao.ts`), com normalização de contrações/pontuação/maiúsculas e lista de respostas aceitas; o gabarito nunca vai ao navegador do aluno antes da resposta.
- **Progresso:** domínio de lição ≥ 80% no mini-quiz; teste de módulo ≥ 75% no geral e ≥ 60% por habilidade, 24 h de espera após reprovação, rodízio de formas; desbloqueio sequencial (lição → lição, teste → próximo módulo); XP e ofensiva (fuso de Brasília); revisão espaçada **Leitner (5 caixas)** com página `/aluno/curso/revisao` (antecipada da Fase 2; o FSRS fica para depois).
- **Aluno:** `/aluno/curso` (trilha, XP, ofensiva, revisões, cards de metodologia — só "Gramática estruturada" ativa), player da lição, mini-quiz, revisão, teste do módulo, card "Continuar" no painel. **Cadastro público** `/cadastro` (antecipado da Fase 2) com consentimento do responsável para menores (LGPD art. 14), também no cadastro feito pela professora.
- **Professora:** `/professor/conteudo` (fila de revisão e publicação por lição ou módulo inteiro — **nada aparece ao aluno sem publicação**), editor completo da lição (apresentação + exercícios dos 6 tipos, "Testar" o gabarito sem salvar), visualização do teste por forma, `/professor/progresso` (tabela por aluno × módulo).
- **API:** contrato em `docs/api-curso.md` (com as notas de implementação).
- **Testes:** backend Vitest 290 testes (domínio, controllers, integração de rotas/papéis); E2E de API (87 verificações, incluindo os 1.225 gabaritos do curso aceitos pelo corretor e a ausência de gabarito nas respostas do aluno); ida e volta de todo o conteúdo pelo formulário do editor sem perda; Playwright `frontend/e2e/curso.spec.ts` (cadastro → login → lição com os 6 tipos → quiz → teste do módulo → editor e progresso da professora), rodando no projeto `curso` (`E2E_CURSO=1`).

**Ficou para depois:** geração de conteúdo com IA e verificador CEFR-J/NGSL; TTS, `dictation`/`listen_select` e qualquer áudio; `DominioCanDo` (o progresso é por lição/teste, não por can-do); átomos com versões (o conteúdo editado sobrescreve a lição; o histórico fica no git dos JSON e em `atualizadoEm`/`revisadoEm`); testes Jest de componentes do frontend (só Playwright); edição dos itens de teste pela interface (só leitura; editar no JSON e reimportar com `--sobrescrever`, que também substitui as lições editadas na interface); alunos que se cadastram sozinhos e não estão em nenhuma turma não aparecem em `/professor/progresso`; as outras três metodologias (aparecem como "Em breve").

**Sempre:** todo PR roda `tsc`, Vitest e Jest no CI (o workflow do GitHub já existe; incluir o frontend); smoke tests Playwright contra `docker compose up`; **script de CI que carrega todo átomo publicado** e valida contra os schemas zod e os portões de gabarito.

---

## 10. Riscos e perguntas em aberto

### 10.1 Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| **Tempo de revisão da professora** (120–180 h por nível) | Alto: é o gargalo real do conteúdo | Portões automáticos, juiz cego, aprovação em lote, começar só com A1 |
| **Qualidade da IA** (distratores ambíguos, deriva de nível, simplificação excessiva no A1/A2) | Itens ruins publicados | Portões determinísticos + juiz + revisão + estatísticas de item pós-publicação |
| **Menores de idade** (termos do Gemini 18+; LGPD art. 14) | Bloqueio legal de recursos de IA em tempo real | Data de nascimento no cadastro, feature flags, consentimento de responsável, avaliar Vertex AI |
| **Voz e LGPD** | Dado pessoal, possivelmente biométrico | Opt-in, pasta privada, expiração de 30 dias, sem identificação de locutor, chaves pagas |
| **Licenciamento** | Uso indevido de material protegido | Só fontes da seção 7.1; `AtribuicaoFonte`; página de créditos; nunca copiar Cambridge/Oxford/BBC/Duolingo |
| **Custos de IA e mudança de preços** (Gemini dobra em 01/01/2027) | Orçamento | Geração em batch antes de jan/2027, cache de TTS, cotas por usuário, log `UsoIa` |
| **Escopo grande para um desenvolvedor** | Atrasos | Fases curtas com entregas utilizáveis; uma metodologia por fase |
| **Evasão de aprendizes autônomos** (36% no estudo Babbel) | Baixa conclusão | Sessões curtas, plano de estudo, ofensiva com congelamento, cutucadas da professora |
| **Gamificação virando fim em si** | Aprende-se menos | XP ponderado por novidade e produção; ligas opcionais; medidor de vertentes |
| **Notas de IA tratadas como oficiais** | Credibilidade e risco jurídico | Rótulo "provisório", confirmação da professora, redação "alinhado ao CEFR" |
| **Precisão de STT/pronúncia** (Web Speech autocorrige; Azure pode errar para mais ou menos) | Feedback enganoso | Web Speech só para inteligibilidade; Azure como sinal de feedback, não nota final |
| **SQLite com muitos escritores** | Travamentos | Postgres antes do cadastro público |

### 10.2 Perguntas em aberto para o dono decidir

1. **Há alunos menores de 18 anos** entre os alunos da professora? Se sim, aceitamos recursos de IA desligados para eles ou migramos para Vertex AI?
2. **Orçamento mensal** para IA e fala (Azure, Gemini pago)? Tutor Live entra só num plano pago?
3. **Monetização:** quando e como cobrar dos independentes (assinatura, freemium, preço)? Os alunos da professora pagam à parte?
4. **Disponibilidade da professora** para revisão: quantas horas por semana? Isso define o ritmo de publicação.
5. **Confirmar a escolha do MVP:** começar por **Gramática Estruturada (PPP)** no A1 ou outra metodologia?
6. **Migrar `Professor`/`Aluno` para `Usuario` já na Fase 0** — de acordo?
7. **Hospedagem e mídia:** onde rodar em produção (VPS, nuvem)? Quando mover áudio para S3/R2?
8. **Certificado:** a professora assina/confirma todos? Alunos independentes recebem certificado "só IA, provisório" ou precisam de revisão paga?
9. **Variante de inglês padrão:** americano, britânico ou ambos (com rotação de sotaques a partir do A2)?
10. **Marca e voz:** usar voz padrão do Google ou investir numa voz de marca (ElevenLabs)?
11. **Nome dos níveis e da trilha** na interface (ex.: "Nível A1 – Básico 1")?
12. **Professora como único revisor** ou haverá outros professores/revisores?
13. **Pontos a verificar antes de implementar:** faixas GSE, níveis EGP de estruturas específicas, partes do Speaking do B1, preços de terceiros (ElevenLabs, Deepgram, SpeechSuper, OpenAI) e disponibilidade do Azure na região Brazil South.

---

## 11. Referências

### CEFR, currículo e níveis
- CEFR – nova escala de controle fonológico (Piccardo, CoE): https://rm.coe.int/the-new-scale-for-phonological-control-piccardo-/1680788b29
- Wang & Zheng 2025: https://eprints.soton.ac.uk/502262/
- Descritores CEFR (CoE): https://www.coe.int/web/common-european-framework-reference-languages/cefr-descriptors
- CV e abordagem orientada para a ação (CoE): https://rm.coe.int/the-cefr-companion-volume-and-the-action-oriented-approach/1680a88678
- CEFR CV – front matter (permissões): https://rm.coe.int/16809ea0d4
- CoE Tabela 3 (aspectos qualitativos da fala): https://www.coe.int/en/web/common-european-framework-reference-languages/table-3-cefr-3.3-common-reference-levels-qualitative-aspects-of-spoken-language-use
- Core Inventory (Eaquals): https://www.eaquals.org/resources/the-core-inventory-for-general-english/
- Core Inventory – pôsteres: https://www.eaquals.org/wp-content/uploads/Core-Inventory-Posters-2018-update.pdf
- Core Inventory – PDF completo: https://www.eaquals.org/wp-content/uploads/EAQUALS_British_Council_Core_Curriculum_April2011.pdf
- Validação do Core Inventory (Jones 2015): https://www.britishcouncil.org/research-insight/validating-core-inventory-general-english
- English Grammar Profile (Cardiff/IJCL): https://orca.cardiff.ac.uk/166496/1/ijcl.14086.oke.pdf
- Text Inspector – EVP: https://textinspector.com/help/lexis-evp/
- English Profile (Wikipedia): https://en.wikipedia.org/wiki/English_Profile
- English Profile: https://www.englishprofile.org/
- Oxford 3000 (blog OUP): https://teachingenglishwithoxford.oup.com/2019/11/11/oxford-3000%EF%B8%8F-eltoc/amp
- Listas CEFR (Oxford Learner's Dictionaries): https://www.oxfordlearnersdictionaries.com/about/wordlists/cefr
- GSE – visão geral dos objetivos: https://www.pearsoncanadaschool.com/content/dam/websites/pearson-canada-school/assets/documents/literacy/gse/gse-learning-objectives-overview.pdf
- GSE – objetivos para adultos: https://www.pearsoncanadaschool.com/content/dam/websites/pearson-canada-school/assets/documents/literacy/gse/gse-learning-objectives-adult-general-english.pdf
- GSE – recursos Pearson: https://www.pearson.com/languages/why-pearson/the-global-scale-of-english/resources.html
- Horas guiadas (Cambridge): https://support.cambridgeenglish.org/hc/en-gb/articles/202838506-Guided-learning-hours
- Horas até o B2 (EC): https://ecenglish.com/en/blog/english/how-long-to-learn-english-to-b2-level/

### Provas e avaliação
- A2 Key – handbook: https://www.cambridgeenglish.org/images/504505-a2-key-handbook-2020.pdf
- B1 Preliminary – atualização 2020: https://www.cambridgeenglish.org/images/update-2020-b1-preliminary.pdf
- A2 Key – formato: https://www.cambridgeenglish.org/exams-and-tests/qualifications/key/format/
- A2 Key (British Council RO): https://www.britishcouncil.ro/en/a2-key-a2-key-schools-ket
- B1 Preliminary – formato: https://www.cambridgeenglish.org/exams-and-tests/qualifications/preliminary/format/
- Avaliação de escrita B1: https://Www.cambridgeenglish.org/Images/231794-cambridge-english-assessing-writing-performance-at-level-b1.pdf
- Checklist de escrita B1 para professores: https://www.cambridgeenglish.org/Images/652769-b1-preliminary-for-schools-writing-checklist-for-teachers.pdf
- Avaliação de fala A2: https://www.cambridgeenglish.org/Images/563269-a2-key-for-schools-speaking-assessing-speaking-performance.pdf
- DET – manual técnico: https://www.peb.ufrj.br/images/documentos/DET-technical_manual-V01.pdf
- DET – whitepaper de pontuação 2024: https://duolingo-papers.s3.amazonaws.com/reports/Duolingo_whitepaper_test_scoring_2024_v1.pdf
- EF SET FAQ: https://efset.org/faq
- EF SET – arquitetura adaptativa: https://open-exam-prep.com/study-guides/ef-set-50/exam-architecture-and-scoring/adaptive-testing-and-irt
- Linguaskill: https://en.wikipedia.org/wiki/Linguaskill
- Linguaskill – brochura: https://www.cambridgeenglish.org/nl/Images/linguaskill-brochure-for-employers.pdf
- Mastery learning: https://en.wikipedia.com/wiki/Mastery_learning
- Mastery learning (Columbia College): https://excellence.columbia.ca/?p=4017
- Roediger & Karpicke 2006: https://psychology.ecu.edu/wp-content/pv-uploads/sites/216/2019/03/Roediger-Karpicke-2006.pdf
- Karpicke & Roediger 2007: https://Www.Gwern.net/doc/psychology/spaced-repetition/2007-karpicke.pdf
- Shute 2008 (feedback): https://myweb.fsu.edu/vshute/pdf/shute%202008_b.pdf
- Elo em educação (Pelánek 2016): https://www.fi.muni.cz/~xpelanek/publications/CAE-elo.pdf
- Crítica ao Elo: https://pmc.ncbi.nlm.nih.gov/articles/PMC12784335
- Yancey et al., BEA 2023: https://aclanthology.org/2023.bea-1.49
- Meta-análise LLM × humano 2025: https://arxiv.org/abs/2512.14561v2
- Aydın et al. (QWK L2 turco): https://pubdata.leuphana.de/entities/publication/ffaebdfe-a161-4979-975c-2ab15c3d4961
- Open Badges 3.0: https://standards.1edtech.org/open-badges/specifications/standards/v3p0/cert

### Plataformas
- Duolingo – nova home: https://blog.duolingo.com/new-duolingo-home-screen-design
- DuoRadio: https://blog.duolingo.com/duoradio-listening-practice
- Redesign 2022 (appleosophy): https://appleosophy.com/2022/08/30/new-duolingo-design-begins-rolling-out-to-ios-users/
- Duolingo Jump ahead: https://duolingoguides.com/duolingo-jump-ahead/
- Crédito parcial no nivelamento: https://blog.duolingo.com/partial-credit-improvements-to-duolingos-placement-test/
- Half-life regression (ACL 2016): https://aclanthology.org/P16-1174
- HLR – código: https://www.github.com/duolingo/halflife-regression
- Como o Duolingo aprende: https://blog.duolingo.com/how-we-learn-how-you-learn
- Birdbrain: https://blog.duolingo.com/learning-how-to-help-you-learn-introducing-birdbrain
- Duolingo Score: https://blog.duolingo.com/duolingo-score/
- Streak: https://blog.duolingo.com/how-duolingo-streak-builds-habit
- Energy (Android Authority): https://androidauthority.com/quitting-duolingo-energy-system-3599842
- Duolingo Max: https://investors.duolingo.com/news-releases/news-release-details/duolingo-max-shows-future-ai-education
- Video Call: https://blog.duolingo.com/video-call
- Loewen et al. 2019 (ReCALL): https://www.cambridge.org/core/journals/recall/article/abs/mobileassisted-language-learning-a-duolingo-case-study/A4D7C8F71782A37D258C19F357DDBCBE
- Revisão CALL-EJ: https://callej.org/index.php/journal/article/download/419/347/1013
- Eficácia Duolingo: https://blog.duolingo.com/results-duolingo-efficacy-studies
- Duolingo ToS (scraping): https://conductatlas.com/platform/duolingo/duolingo-terms-of-service/provision/CA-P-022936/reproduction-or-scraping-of-service-content-prohibited/
- Como o Babbel funciona: https://www.babbel.com/how-babbel-works
- Babbel – memorização: https://support.babbel.com/hc/en-us/articles/360037496932-Memorizing-vocabulary
- Babbel – SRS: https://www.babbel.com/spaced-repetition-language-learning
- Estudo MSU (Babbel): https://msutoday.msu.edu/news/2019/new-study-gives-insight-on-effectiveness-of-language-learning-apps
- Busuu – cursos: https://www.busuu.com/en/it-works/courses
- Busuu for Business (PDF): https://business.busuu.com/hubfs/Admin%20Portal/Learners%20-%20self-paced%20learning%20and%201_1%20and%20group%20Live%20Lessons.pdf
- Memrise: https://www.memrise.com/learn-german
- Memrise (App Store): https://apps.apple.com/US/app/id635966718
- LingQ – palavras novas: https://lingq-support.groovehq.com/help/how-do-you-know-which-words-are-new-to-me
- LingQ – guia rápido: https://lingq-support.groovehq.com/help/lingq-quick-start-guide
- ELSA Score: https://medium.com/@elsaspeak/discover-your-elsa-score-an-ai-powered-visualization-of-your-english-speaking-proficiency-in-369f46dba6bc
- ELSA – eficácia: https://elsaspeak.com/en/efficacy
- Speak: https://speak.com/
- Speak – review (Languatalk): https://languatalk.com/blog/speak-app-review/
- Praktika – feedback: https://intercom.help/praktika-ai/en/articles/11684894-feedback-features
- Cambly – método: https://www.cambly.com/english/method
- EF English Live – B1: https://englishlive.ef.com/en/method/levels-and-certificates/b1-course/
- EF – escrita: https://englishlive.ef.com/blog/study-tips/boost-english-writing-skills-online/
- Cambridge One – catálogo: https://online.flippingbook.com/view/382617513/73/
- Write & Improve – professores: https://writeandimprove.com/teachers
- Write & Improve – Class View: https://help.writeandimprove.com/en/articles/3293806-how-to-see-your-students-writing-in-class-view
- LearnEnglish – mapa: https://learnenglish.britishcouncil.org/sitemap
- LearnEnglish – teste: https://learnenglish.britishcouncil.org/test-your-english
- British Council – termos: https://www.britishcouncil.org/terms

### Metodologias e aquisição
- TBLT (critérios de Ellis): https://en.wikipedia.org/wiki/Task-based_language_teaching
- Ellis (capítulo Cambridge): https://cambridge.org/core/services/aop-cambridge-core/content/view/C65EF4A6A41CD294E763457590FA4EA2/stamped-9780521157049c11_p212-235_CBO.pdf/macro_and_microevaluations_of_taskbased_teaching.pdf
- Willis (JALT TLT): https://jalt-publications.org/tlt/articles/2333-task-based-learning-what-kind-adventure
- Willis – resumo TBL: https://www2.vobs.at/Ludescher/Grammar/task_based_learning.htm
- Nation – Four Strands: https://vuw-web.matrix.squiz.cloud/lals/resources/paul-nations-resources/paul-nations-publications/publications/documents/yamamoto-four-strands.pdf
- Four Strands (TESL Ontario): https://contact.teslontario.org/?p=2244
- Cepeda et al. 2006 (PubMed): https://pubmed.ncbi.nlm.nih.gov/16719566/
- Cepeda et al. 2006 (PDF): https://www.evullab.org/pdf/CepedaPashlerVulWixtedRohrer-PB-2006.pdf
- Karpicke & Roediger 2008 (Science): https://www.brucehayes.org/Teaching/papers/2008_Roediger_Karpicke_Science.pdf
- Meta-análise de gamificação (MDPI 2023): https://www2.mdpi.com/2071-1050/15/14/11325
- Anki – algoritmo: https://docs.ankiweb.net/faqs/what-spaced-repetition-algorithm.md
- ABC do FSRS: https://github.com/open-spaced-repetition/fsrs4anki/wiki/ABC-of-FSRS
- Benchmark SRS: https://expertium.github.io/Benchmark.html
- Crítica ao i+1 (Frontiers 2025): https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2025.1636777/pdf
- Guia de leitura extensiva (ERF): https://www.slideshare.net/slideshow/guide-to-extensivereadingweb/25367377
- JALT ERJ: https://er.jalt.org/sites/default/files/ERJ/erj_issue_9.1.pdf
- Mason & Krashen 1997: https://benjamins.com/catalog/itl.117-118.04mas
- Shadowing (JALT TLT 38.1): https://jalt-publications.org/sites/default/files/pdf-article/38.1tlt_art1.pdf
- Shadowing (Second Language 8): https://www.jstage.jst.go.jp/article/secondlanguage/8/0/8_27/_article/-char/en
- Norris & Ortega 2000: https://www.deepdyve.com/lp/wiley/does-type-of-instruction-make-a-difference-substantive-findings-from-a-9dzVAhpcHv/
- Goo et al.: https://www.degruyterbrill.com/document/doi/10.1075/sibil.48.18goo/html
- Spada & Tomita 2010: https://www.eas.utoronto.ca/node/790
- PPP (TeachingEnglish): https://www.teachingenglish.org.uk/professional-development/teachers/teaching-knowledge-database/n-p/ppp
- Método Direto/Callan: https://dspace.uzhnu.edu.ua/jspui/bitstream/lib/52810/1/direct.docx

### Erros de brasileiros
- Pronunciation Studio: https://pronunciationstudio.com/portuguese-speakers-english-pronunciation-errors/
- Epêntese (John & Cardoso 2017): https://www.redalyc.org/pdf/4783/478355306003.pdf
- Tese UFJF: https://repositorio.ufjf.br/jspui/handle/ufjf/4821
- Gabble (TOEFL para brasileiros): https://gabble.ai/blog/toefl-for-brazilian-students-common-challenges
- London School – Brazinglish: https://londonschool.com/blog/from-brazinglish-to-english-part-1
- Corpus de aprendizes (UFMG): https://periodicos.ufmg.br/index.php/germanicos/article/view/8357/5881
- Tese PUC-SP: https://tede2.pucsp.br/bitstream/handle/13575/1/Wendel%20Mendes%20Dantas.pdf

### Fala, escuta e custos
- Gemini – áudio: https://ai.google.dev/gemini-api/docs/audio?lang=node
- Gemini – preços: https://aistudio.google.com/docs/pricing
- Gemini – saída estruturada: https://aistudio.google.com/docs/structured-output
- Gemini Live API: https://aistudio.google.com/docs/live-api
- Gemini – tokens efêmeros: https://aistudio.google.com/docs/live-api/ephemeral-tokens
- Gemini – termos: https://aistudio.google.com/docs/terms
- Google TTS – preços: https://cloud.google.com/text-to-speech/pricing
- ElevenLabs (ModelsLab): https://modelslab.com/elevenlabs-api-pricing
- ElevenLabs (TechJack): https://techjacksolutions.com/ai-tools/elevenlabs/elevenlabs-pricing/
- OpenAI TTS (s-anand): https://www.s-anand.net/blog/openai-tts-cost/
- OpenAI transcrição (costgoat): https://costgoat.com/pricing/openai-transcription
- Deepgram (smallest.ai): https://smallest.ai/blog/deepgram-pricing-plans-cost-what-you-get-in-2026
- MDN SpeechRecognition: https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition
- MDN processLocally: https://developer.mozilla.org/docs/Web/API/SpeechRecognition/processLocally
- caniuse speech recognition: https://caniuse.com/speech-recognition
- blink-dev (on-device): https://go.mail-archive.com/blink-dev@chromium.org/msg16525.html
- Azure Pronunciation Assessment (ferramenta): https://learn.microsoft.com/en-us/azure/ai-services/speech-service/pronunciation-assessment-tool
- Azure Pronunciation Assessment (how-to): https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-pronunciation-assessment
- Azure – Q&A sobre notas: https://learn.microsoft.com/en-us/answers/questions/1680083/cognitive-services-pronunciation-assessment-always
- Azure Speech – preços: https://azure.microsoft.com/en-us/pricing/details/speech/
- Azure – Q&A sobre preço: https://learn.microsoft.com/en-us/answers/questions/5608069/pricing-and-usage-of-pronunciation-assessment-feat
- SpeechSuper (SaaSworthy): https://www.saasworthy.com/product/speechsuper/pricing
- wav2vec2 + GOP: https://arxiv.org/pdf/2311.07037
- Avaliação de GOP: https://arxiv.org/pdf/2506.12067
- LMMs em avaliação de pronúncia: https://arxiv.org/abs/2503.11229
- Gravação no navegador (addpipe): https://blog.addpipe.com/recording-audio-in-the-browser-using-pure-html5-and-minimal-javascript.md
- MDN isTypeSupported: https://developer.mozilla.org/docs/Web/API/MediaRecorder/isTypeSupported_static
- Ditado (Kindai): https://kindai.repo.nii.ac.jp/records/14254
- Ditado (CJAL): https://www.degruyterbrill.com/document/doi/10.1515/CJAL-2021-0026/html
- Shadowing – revisão Oxford: https://ora.ox.ac.uk/objects/uuid:3104cae1-3a6b-400a-b173-de44384238d2
- Shadowing × ditado (Yamada 2017): https://u-sacred-heart.repo.nii.ac.jp/record/825/files/inronshu39_1-yamada_azusa.pdf

### LGPD
- Consulta ANPD – biometria: https://www.gov.br/participamaisbrasil/ts-dados-biometricos
- Confidata – LGPD e biometria: https://confidata.com.br/blog/lgpd-dados-biometricos-reconhecimento-facial-digital

### Fontes de conteúdo e licenças
- Tatoeba – termos: https://tatoeba.org/en/terms_of_use
- VOA Learning English – política: https://learningenglish.voanews.com/p/6861.html
- NGSL: https://www.newgeneralservicelist.com/
- NAWL: https://www.newgeneralservicelist.com/new-academic-word-list
- CEFR-J (espelho e termos): https://github.com/openlanguageprofiles/olp-en-cefrj
- CEFR-J – download: http://www.cefr-j.org/download.html
- Wikibooks – copyright: https://en.wikibooks.org/wiki/Wikibooks:COPY
- Wikimedia – FAQ CC 4.0: https://meta.wikimedia.org/wiki/Terms_of_use/Creative_Commons_4.0/FAQ
- Lingua Libre: https://en.wikipedia.org/wiki/Lingua_Libre
- Common Voice – datasheet: https://datacollective.mozillafoundation.org/datasets/cmn1pv5hi00uto1072y1074y7
- Project Gutenberg – licença: https://www.gutenberg.org/policy/license.html
- LibriVox – domínio público: https://librivox.org/pages/public-domain/
- StoryWeaver: https://storyweaver.org.in/about
- Livros abertos ESOL (FSCJ): https://guides.fscj.edu/oers/ESOL
- Pixabay × Unsplash: https://licenseorg.com/compare/pixabay-vs-unsplash
- OUP – licenciamento: https://mynewsdesk.com/uk/oxford-university-press/news/oxford-university-press-signs-licensing-agreement-with-south-korean-app-developer-445209
- Forvo – termos da API: https://api.forvo.com/documentation/general-information
- US Copyright Office – IA parte 2: https://blogs.loc.gov/copyright/2025/02/inside-the-copyright-offices-report-copyright-and-artificial-intelligence-part-2-copyrightability/

### Geração de conteúdo com IA
- Controle de nível CEFR em LLMs: https://arxiv.org/html/2505.08351v2
- EMNLP Findings 2025: https://preview.aclanthology.org/author-page-yu-wang-polytechnic/2025.findings-emnlp.828.pdf
- ANLP 2026: https://www.anlp.jp/proceedings/annual_meeting/2026/pdf_dir/Q4-9.pdf
- Distratores gerados por ChatGPT (Bitew et al.): https://arxiv.org/abs/2307.16338v1
