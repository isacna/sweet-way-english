import type { ExercicioConteudo, LicaoConteudo } from './schema.js';

export const MODULOS_PILOTO = ['a1-m01', 'a1-m02', 'a1-m04', 'a1-m06', 'a2-m02'];
export const TAG_PILOTO = 'piloto_multimidia_v1';
/** Piloto de ditado (A1-M01 e A1-M02): um item `dictation` por lição, na prática semicontrolada. */
export const TAG_PILOTO_DITADO = 'piloto_ditado_v1';
const TAGS_PILOTO = [TAG_PILOTO, TAG_PILOTO_DITADO];

type Existente = { ordem: number; tagsErro: unknown };

/** Nunca substitui exercícios existentes, mesmo que tenham sido editados pela professora. */
export function planejarPiloto(licao: LicaoConteudo, exercicios: Existente[], apresentacao: unknown) {
  const tags = new Set(exercicios.flatMap((e) => Array.isArray(e.tagsErro) ? e.tagsErro.filter((t): t is string => typeof t === 'string') : []));
  const novos: ExercicioConteudo[] = licao.exercicios.filter((e) =>
    e.tagsErro?.some((t) => TAGS_PILOTO.includes(t)) && !e.tagsErro.some((t) => t.startsWith('piloto:') && tags.has(t)),
  );
  const atual = (apresentacao && typeof apresentacao === 'object' && !Array.isArray(apresentacao) ? apresentacao : {}) as Record<string, unknown>;
  const recursos = Array.isArray(atual.recursos) ? [...atual.recursos] : [];
  for (const recurso of licao.apresentacao.recursos ?? []) {
    if (recursos.length >= 4) break;
    if (!recursos.some((r) => r && typeof r === 'object' && 'url' in r && r.url === recurso.url)) recursos.push(recurso);
  }
  return {
    novos,
    ordemInicial: Math.max(0, ...exercicios.map((e) => e.ordem)) + 1,
    apresentacao: {
      ...atual,
      ...(recursos.length ? { recursos } : {}),
      ...(atual.missao ? {} : licao.apresentacao.missao ? { missao: licao.apresentacao.missao } : {}),
    },
  };
}

/** Avisos editoriais não bloqueiam o conteúdo legado. */
export function auditarDiversidade(licoes: LicaoConteudo[]): string[] {
  const avisos: string[] = [];
  const sequencias = new Map<string, string[]>();
  for (const l of licoes) {
    const assinatura = l.exercicios.map((e) => `${e.etapa}:${e.tipo}`).join('|');
    sequencias.set(assinatura, [...(sequencias.get(assinatura) ?? []), l.slug]);
    if (!l.apresentacao.recursos?.length && !l.exercicios.some((e) => e.conteudo.midia || e.tipo === 'dictation')) avisos.push(`${l.slug}: sem mídia de apoio ou escuta.`);
    if (!l.apresentacao.missao) avisos.push(`${l.slug}: sem missão pessoal com autoavaliação.`);
    const pratica = l.exercicios.filter((e) => e.etapa !== 'quiz');
    if (new Set(pratica.map((e) => e.tipo)).size < 3) avisos.push(`${l.slug}: menos de 3 formatos na prática.`);
  }
  for (const slugs of sequencias.values()) {
    if (slugs.length >= 3) avisos.push(`Sequência idêntica em ${slugs.length} lições: ${slugs.join(', ')}.`);
  }
  return avisos;
}
