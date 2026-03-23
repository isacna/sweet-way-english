/** Valor para `input type="datetime-local"` no fuso local. */
export function isoToDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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

/** Rótulo amigável para `status` de submissão retornado pela API. */
export function rotuloStatusSubmissaoPt(status: string): string {
  switch (status) {
    case "pendente":
      return "Aguardando correção";
    case "aprovado":
      return "Aprovada";
    case "reprovado":
      return "Reprovada";
    case "corrigido":
      return "Corrigida (com nota)";
    default:
      return status;
  }
}
