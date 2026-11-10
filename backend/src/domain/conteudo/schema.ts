import { z } from 'zod';
import { midiaSchema, missaoSchema } from './midia.js';
import { normalizar, tokensFrase } from '../correcao.js';

// Formato do conteúdo do curso. É usado:
//  - pelos arquivos-fonte em prisma/conteudo/<nivel>/*.json (importados pelo seed)
//  - pelo editor da professora (PUT /api/conteudo/licoes/:id)
// Cada exercício é autocorrigível: `conteudo` vai para o navegador, `gabarito` nunca.

const texto = z.string().trim().min(1);
const MARCADOR_LACUNA = '___';

export const ETAPAS = ['controlada', 'semicontrolada', 'producao', 'quiz'] as const;
export const HABILIDADES_TESTE = ['gramatica_vocabulario', 'leitura', 'escrita'] as const;

const base = {
  id: z.number().int().positive().optional(), // presente ao editar um exercício existente
  enunciado: texto,
  explicacao: texto, // feedback em PT exibido depois da resposta
  tagsErro: z.array(texto).optional(),
};

const mcq = z.object({
  ...base,
  tipo: z.literal('mcq'),
  conteudo: z.object({
    midia: midiaSchema.optional(),
    opcoes: z.array(texto).min(2).max(5),
    texto: texto.optional(), // frase/trecho de apoio (ex.: leitura)
  }),
  gabarito: z.object({ correta: z.number().int().min(0) }),
});

const cloze = z.object({
  ...base,
  tipo: z.literal('cloze'),
  conteudo: z.object({
    midia: midiaSchema.optional(),
    texto: texto, // lacunas marcadas com ___
    opcoesPorLacuna: z.array(z.array(texto).min(2)).optional(), // se presente, vira lista de seleção
  }),
  gabarito: z.object({ respostas: z.array(z.array(texto).min(1)).min(1) }), // aceitas por lacuna
});

const wordOrder = z.object({
  ...base,
  tipo: z.literal('word_order'),
  conteudo: z.object({
    midia: midiaSchema.optional(),
    palavras: z.array(texto).min(2), // já embaralhadas
  }),
  gabarito: z.object({ aceitas: z.array(texto).min(1) }),
});

const match = z.object({
  ...base,
  tipo: z.literal('match'),
  conteudo: z.object({
    midia: midiaSchema.optional(),
    esquerda: z.array(texto).min(2).max(8),
    direita: z.array(texto).min(2).max(8), // já embaralhada
  }),
  gabarito: z.object({ pares: z.array(z.number().int().min(0)) }), // pares[i] = índice em `direita` de esquerda[i]
});

const translate = z.object({
  ...base,
  tipo: z.literal('translate'),
  conteudo: z.object({
    midia: midiaSchema.optional(),
    frase: texto,
    direcao: z.enum(['pt-en', 'en-pt']),
  }),
  gabarito: z.object({ aceitas: z.array(texto).min(1) }),
});

const errorCorrection = z.object({
  ...base,
  tipo: z.literal('error_correction'),
  conteudo: z.object({
    midia: midiaSchema.optional(),
    frase: texto, // frase com um erro
  }),
  gabarito: z.object({ aceitas: z.array(texto).min(1) }),
});

const sequence = z.object({
  ...base,
  tipo: z.literal('sequence'),
  conteudo: z.object({ midia: midiaSchema.optional(), trechos: z.array(texto).min(3).max(8) }),
  gabarito: z.object({ ordem: z.array(z.number().int().min(0)) }),
});

export const itemSchema = z
  .discriminatedUnion('tipo', [mcq, cloze, wordOrder, match, translate, errorCorrection, sequence])
  .superRefine((item, ctx) => {
    const erro = (message: string) => ctx.addIssue({ code: 'custom', message });
    switch (item.tipo) {
      case 'sequence': {
        const n = item.conteudo.trechos.length;
        if (new Set(item.conteudo.trechos.map(normalizar)).size !== n) erro('sequence: trechos repetidos');
        if (item.gabarito.ordem.length !== n || [...item.gabarito.ordem].sort((a, b) => a - b).some((v, i) => v !== i)) erro('sequence: ordem precisa ser uma permutação dos índices');
        break;
      }
      case 'mcq': {
        if (item.gabarito.correta >= item.conteudo.opcoes.length) erro('mcq: `correta` fora das opções');
        const norm = item.conteudo.opcoes.map(normalizar);
        if (new Set(norm).size !== norm.length) erro('mcq: opções repetidas');
        break;
      }
      case 'cloze': {
        const lacunas = item.conteudo.texto.split(MARCADOR_LACUNA).length - 1;
        if (lacunas === 0) erro('cloze: o texto não tem lacunas (___)');
        if (item.gabarito.respostas.length !== lacunas)
          erro(`cloze: ${lacunas} lacuna(s) no texto, mas ${item.gabarito.respostas.length} grupo(s) de respostas`);
        const opcoes = item.conteudo.opcoesPorLacuna;
        if (opcoes) {
          if (opcoes.length !== lacunas) erro('cloze: `opcoesPorLacuna` precisa de uma lista por lacuna');
          item.gabarito.respostas.forEach((aceitas, i) => {
            const disponiveis = (opcoes[i] ?? []).map(normalizar);
            if (!aceitas.some((a) => disponiveis.includes(normalizar(a))))
              erro(`cloze: nenhuma resposta aceita da lacuna ${i + 1} está entre as opções`);
          });
        }
        break;
      }
      case 'word_order': {
        const alvo = [...item.conteudo.palavras].map((p) => normalizar(p)).sort().join('|');
        for (const frase of item.gabarito.aceitas) {
          const tokens = tokensFrase(frase).sort().join('|');
          if (tokens !== alvo) erro(`word_order: "${frase}" não usa exatamente as palavras do banco`);
        }
        break;
      }
      case 'match': {
        const n = item.conteudo.esquerda.length;
        if (item.conteudo.direita.length !== n) erro('match: esquerda e direita precisam ter o mesmo tamanho');
        const pares = item.gabarito.pares;
        if (pares.length !== n || [...pares].sort((a, b) => a - b).some((v, i) => v !== i))
          erro('match: `pares` precisa ser uma permutação dos índices de `direita`');
        break;
      }
      case 'error_correction': {
        if (item.gabarito.aceitas.some((a) => normalizar(a) === normalizar(item.conteudo.frase)))
          erro('error_correction: a frase com erro aparece entre as respostas aceitas');
        break;
      }
    }
  });

export const exercicioSchema = itemSchema.and(z.object({ etapa: z.enum(ETAPAS) }));
export const itemTesteSchema = itemSchema.and(
  z.object({ forma: z.number().int().min(1), habilidade: z.enum(HABILIDADES_TESTE) }),
);

export const apresentacaoSchema = z.object({
  recursos: z.array(midiaSchema).max(4).optional(),
  missao: missaoSchema.optional(),
  explicacao: z.array(texto).min(1), // parágrafos em PT (sem markdown)
  regras: z.array(texto).optional(), // tópicos curtos ("I am / you are / he is")
  notaContrastiva: texto.optional(), // armadilha típica de brasileiros
  exemplos: z.array(z.object({ en: texto, pt: texto })).min(3),
  vocabulario: z.array(z.object({ en: texto, pt: texto })).optional(),
});

export const licaoSchema = z
  .object({
    slug: texto,
    ordem: z.number().int().min(1),
    titulo: texto,
    objetivo: texto,
    minutosEstimados: z.number().int().min(5).max(90),
    apresentacao: apresentacaoSchema,
    exercicios: z.array(exercicioSchema).min(1),
  })
  .superRefine((l, ctx) => {
    const quiz = l.exercicios.filter((e) => e.etapa === 'quiz').length;
    if (quiz < 4) ctx.addIssue({ code: 'custom', message: `lição ${l.slug}: o mini-quiz precisa de pelo menos 4 itens` });
    const pratica = l.exercicios.length - quiz;
    if (pratica < 6) ctx.addIssue({ code: 'custom', message: `lição ${l.slug}: precisa de pelo menos 6 exercícios de prática` });
  });

/** Edição pela professora: mesmos campos da lição, exceto slug/ordem. */
export const licaoEdicaoSchema = z.object({
  titulo: texto,
  objetivo: texto,
  minutosEstimados: z.number().int().min(5).max(90),
  apresentacao: apresentacaoSchema,
  exercicios: z.array(exercicioSchema).min(1),
});

export const moduloSchema = z
  .object({
    slug: texto,
    ordem: z.number().int().min(1),
    titulo: texto,
    tema: texto,
    descricao: texto,
    canDos: z.array(texto).min(2),
    gramatica: texto,
    vocabulario: texto,
    funcao: texto,
    pronuncia: texto.optional(),
    licoes: z.array(licaoSchema).min(1),
    teste: z.object({ itens: z.array(itemTesteSchema).min(1) }),
  })
  .superRefine((m, ctx) => {
    const formas = new Map<number, typeof m.teste.itens>();
    for (const item of m.teste.itens) formas.set(item.forma, [...(formas.get(item.forma) ?? []), item]);
    if (formas.size < 2) ctx.addIssue({ code: 'custom', message: `${m.slug}: o teste precisa de pelo menos 2 formas paralelas` });
    for (const [forma, itens] of formas) {
      if (itens.length < 15) ctx.addIssue({ code: 'custom', message: `${m.slug}: forma ${forma} tem ${itens.length} itens (mínimo 15)` });
      for (const h of HABILIDADES_TESTE) {
        if (!itens.some((i) => i.habilidade === h))
          ctx.addIssue({ code: 'custom', message: `${m.slug}: forma ${forma} sem itens de ${h}` });
      }
    }
    const slugs = m.licoes.map((l) => l.slug);
    if (new Set(slugs).size !== slugs.length) ctx.addIssue({ code: 'custom', message: `${m.slug}: slugs de lição repetidos` });
  });

export type Item = z.infer<typeof itemSchema>;
export type ExercicioConteudo = z.infer<typeof exercicioSchema>;
export type ItemTesteConteudo = z.infer<typeof itemTesteSchema>;
export type Apresentacao = z.infer<typeof apresentacaoSchema>;
export type LicaoConteudo = z.infer<typeof licaoSchema>;
export type ModuloConteudo = z.infer<typeof moduloSchema>;
