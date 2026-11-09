/**
 * Embaralhamento determinístico: a mesma semente (o id do exercício) dá sempre a mesma ordem,
 * sem Math.random no render (o servidor e o navegador desenham igual, e recarregar não muda nada).
 */
export function embaralhar<T>(lista: readonly T[], semente: number): T[] {
  const r = [...lista];
  let s = Math.abs(semente) % 233280;
  for (let i = r.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}
