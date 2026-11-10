"use client";

import type { Midia, Missao } from "@/lib/curso";
import { Campo, classeInput } from "./ui";

export const novaMidia = (): Midia => ({ tipo: "audio", modo: "voz", titulo: "", fonte: "Sweet Way English — texto original", orientacao: "Ouça primeiro; depois, consulte a transcrição se precisar.", transcricao: "" });

export function EditorMidia({ valor, onChange }: { valor: Midia; onChange: (v: Midia) => void }) {
  const set = <K extends keyof Midia>(campo: K, v: Midia[K]) => onChange({ ...valor, [campo]: v });
  return (
    <div className="space-y-3 rounded-xl border border-line p-4">
      <Campo rotulo="Formato da mídia"><select aria-label="Formato da mídia" className={classeInput} value={valor.tipo} onChange={(e) => set("tipo", e.target.value as Midia["tipo"])}><option value="audio">Áudio</option><option value="video">Vídeo explicativo / cena</option><option value="musica">Música</option></select></Campo>
      <Campo rotulo="Reprodução"><select aria-label="Reprodução" className={classeInput} value={valor.modo} onChange={(e) => onChange({ ...valor, modo: e.target.value as Midia["modo"], inicio: undefined, fim: undefined, url: undefined, ...(e.target.value === "voz" ? { tipo: "audio" as const } : {}) })}><option value="voz">Voz do navegador</option><option value="arquivo">Arquivo HTTPS de áudio / vídeo</option><option value="youtube">Vídeo do YouTube</option><option value="link">Abrir na fonte externa</option></select></Campo>
      {([['titulo', 'Título'], ['fonte', 'Autor / fonte'], ['orientacao', 'O que o aluno deve observar']] as const).map(([campo, rotulo]) => <Campo key={campo} rotulo={rotulo}><input aria-label={rotulo} className={classeInput} value={valor[campo]} onChange={(e) => set(campo, e.target.value)} /></Campo>)}
      {valor.modo !== "voz" && <Campo rotulo="URL HTTPS"><input type="url" aria-label="URL HTTPS" className={classeInput} value={valor.url ?? ""} onChange={(e) => set("url", e.target.value)} /></Campo>}
      {['arquivo', 'youtube'].includes(valor.modo) && <div className="grid grid-cols-2 gap-3">{([['inicio', 'Início (segundos)'], ['fim', 'Fim (segundos)']] as const).map(([campo, rotulo]) => <Campo key={campo} rotulo={rotulo}><input aria-label={rotulo} type="number" min="0" step="1" className={classeInput} value={valor[campo] ?? ""} onChange={(e) => set(campo, e.target.value === "" ? undefined : Number(e.target.value))} /></Campo>)}</div>}
      <Campo rotulo="Transcrição" dica="Obrigatória para arquivo e voz do navegador. Para fontes externas, use somente texto autorizado; legendas podem ficar na fonte."><textarea aria-label="Transcrição" className={classeInput} rows={4} value={valor.transcricao ?? ""} onChange={(e) => set("transcricao", e.target.value || undefined)} /></Campo>
    </div>
  );
}

export function EditorMissao({ valor, onChange }: { valor: Missao; onChange: (v: Missao) => void }) {
  return <div className="space-y-3 rounded-xl border border-line p-4">
    {([['titulo', 'Título da missão'], ['enunciado', 'Tarefa pessoal'], ['exemplo', 'Exemplo de resposta']] as const).map(([campo, rotulo]) => <Campo key={campo} rotulo={rotulo}><textarea aria-label={rotulo} className={classeInput} rows={campo === 'titulo' ? 1 : 3} value={valor[campo]} onChange={(e) => onChange({ ...valor, [campo]: e.target.value })} /></Campo>)}
    <Campo rotulo="Critérios de autoavaliação" dica="De 2 a 6 critérios, um por linha."><textarea aria-label="Critérios de autoavaliação" className={classeInput} rows={4} value={valor.criterios.join('\n')} onChange={(e) => onChange({ ...valor, criterios: e.target.value.split('\n') })} /></Campo>
  </div>;
}
