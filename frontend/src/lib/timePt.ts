export function tempoRelativoPt(data: string | Date): string {
  const d = typeof data === "string" ? new Date(data) : data;
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "Agora";
  if (s < 3600) return `Há ${Math.floor(s / 60)} min`;
  if (s < 86400) return `Há ${Math.floor(s / 3600)} h`;
  if (s < 172800) return "Ontem";
  if (s < 604800) return `Há ${Math.floor(s / 86400)} dias`;
  return d.toLocaleDateString("pt-BR");
}
