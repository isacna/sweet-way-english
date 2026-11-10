import { z } from 'zod';

const texto = z.string().trim().min(1);
const urlSegura = texto.refine((valor) => {
  try {
    const url = new URL(valor);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch { return false; }
}, 'Use uma URL HTTPS completa.');

/** Mídia fica dentro do JSON de conteúdo, sem alterar os IDs ou o progresso. */
export const midiaSchema = z.object({
  tipo: z.enum(['audio', 'video', 'musica']),
  modo: z.enum(['arquivo', 'youtube', 'link', 'voz']),
  titulo: texto,
  fonte: texto,
  url: urlSegura.optional(),
  transcricao: texto.optional(),
  orientacao: texto,
  inicio: z.number().int().min(0).optional(),
  fim: z.number().int().positive().optional(),
}).superRefine((m, ctx) => {
  const erro = (message: string) => ctx.addIssue({ code: 'custom', message });
  if (m.modo === 'voz') {
    if (m.tipo !== 'audio' || !m.transcricao) erro('Voz do navegador exige áudio e transcrição.');
    if (m.url || m.inicio !== undefined || m.fim !== undefined) erro('Voz do navegador não usa URL nem trecho.');
  } else if (!m.url) erro('Informe a URL da mídia.');
  if (m.modo === 'arquivo' && !m.transcricao) erro('Arquivo de mídia exige transcrição acessível.');
  if (m.modo === 'youtube') {
    if (m.tipo === 'audio') erro('YouTube exige vídeo ou música.');
    try {
      const u = new URL(m.url ?? '');
      if (!['www.youtube.com', 'youtube.com'].includes(u.hostname) || u.pathname !== '/watch' || !/^[\w-]{11}$/.test(u.searchParams.get('v') ?? '')) erro('Use o endereço youtube.com/watch?v= do vídeo.');
    } catch { erro('URL do YouTube inválida.'); }
  }
  if (m.modo === 'link' && (m.inicio !== undefined || m.fim !== undefined)) erro('Links externos não controlam trechos.');
  if (m.fim !== undefined && m.fim <= (m.inicio ?? 0)) erro('O fim deve ser maior que o início.');
});

export const missaoSchema = z.object({
  titulo: texto,
  enunciado: texto,
  criterios: z.array(texto).min(2).max(6),
  exemplo: texto,
});
