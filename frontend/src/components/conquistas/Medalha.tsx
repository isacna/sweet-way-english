import {
  Award,
  BookOpenCheck,
  CalendarCheck,
  Flame,
  Footprints,
  GraduationCap,
  Lock,
  Sparkles,
  Target,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { Conquista } from "@/lib/curso";
import { fracao, textoProgresso } from "./apoio";

type Tom = "uva" | "chama" | "sol";

/** Ícone e cor por conquista; as de nível (`nivel-a1`…) caem no capelo. */
function aparencia(id: string): { Icone: LucideIcon; tom: Tom } {
  if (id.startsWith("nivel-")) return { Icone: GraduationCap, tom: "uva" };
  if (id.startsWith("ofensiva-")) return { Icone: id === "ofensiva-30" ? CalendarCheck : Flame, tom: "chama" };
  if (id.startsWith("xp-")) return { Icone: id === "xp-2000" ? Sparkles : Zap, tom: "sol" };
  const mapa: Record<string, LucideIcon> = {
    "primeira-licao": Footprints,
    "dez-licoes": BookOpenCheck,
    "quiz-perfeito": Target,
    "primeiro-modulo": Trophy,
  };
  return { Icone: mapa[id] ?? Award, tom: "uva" };
}

const discoObtida: Record<Tom, string> = {
  // As cores do redemoinho do logo, na ordem: rosa → violeta → azul
  uva: "bg-[conic-gradient(from_210deg,var(--color-candy-bright),var(--color-grape-bright),var(--color-sky-bright),var(--color-candy-bright))]",
  chama: "bg-[conic-gradient(from_210deg,var(--color-sun),var(--color-flame),var(--color-candy-bright),var(--color-sun))]",
  sol: "bg-[conic-gradient(from_210deg,#ffe08a,var(--color-sun),var(--color-flame),#ffe08a)]",
};
const miolo: Record<Tom, string> = {
  uva: "bg-grape text-white",
  chama: "bg-flame text-white",
  sol: "bg-sun text-[#4a3000]",
};
const barra: Record<Tom, string> = { uva: "bg-grape-bright", chama: "bg-flame", sol: "bg-sun" };

/** O disco da medalha: aro colorido quando obtida; aro tracejado com cadeado quando não. */
export function DiscoMedalha({ conquista, tamanho = "md" }: { conquista: Conquista; tamanho?: "sm" | "md" }) {
  const { Icone, tom } = aparencia(conquista.id);
  const lado = tamanho === "sm" ? "h-11 w-11" : "h-16 w-16";
  const icone = tamanho === "sm" ? "h-5 w-5" : "h-7 w-7";

  if (!conquista.obtida) {
    return (
      <span
        className={`relative flex shrink-0 items-center justify-center rounded-full border-2 border-dashed border-line-strong bg-gray-50 text-ink-faint ${lado}`}
        aria-hidden
      >
        <Icone className={icone} strokeWidth={1.75} />
        <span className="absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full border border-line-strong bg-card">
          <Lock className="h-3 w-3" />
        </span>
      </span>
    );
  }
  return (
    <span className={`flex shrink-0 rounded-full p-[3px] shadow-md ${discoObtida[tom]} ${lado}`} aria-hidden>
      <span
        className={`flex h-full w-full items-center justify-center rounded-full shadow-[inset_0_2px_0_rgb(255_255_255/0.28),inset_0_-3px_0_rgb(0_0_0/0.16)] ring-2 ring-card ${miolo[tom]}`}
      >
        <Icone className={icone} strokeWidth={2.1} />
      </span>
    </span>
  );
}

/** Barra fina com "4 de 10" para as conquistas de contagem ainda não obtidas. */
export function ProgressoConquista({ conquista }: { conquista: Conquista }) {
  if (conquista.obtida || !conquista.progresso) return null;
  const { tom } = aparencia(conquista.id);
  const texto = textoProgresso(conquista.progresso);
  return (
    <div className="mt-2.5 flex items-center gap-2.5">
      <div
        role="progressbar"
        aria-label={`Progresso: ${texto}`}
        aria-valuemin={0}
        aria-valuemax={conquista.progresso.alvo}
        aria-valuenow={conquista.progresso.atual}
        className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-100"
      >
        <div className={`h-full rounded-full ${barra[tom]}`} style={{ width: `${Math.round(fracao(conquista) * 100)}%` }} />
      </div>
      <span className="shrink-0 text-xs font-semibold tabular-nums text-ink-soft">{texto}</span>
    </div>
  );
}

/** Cartão de uma conquista na grade. `ordem` escalona a entrada. */
export function Medalha({ conquista, ordem = 0 }: { conquista: Conquista; ordem?: number }) {
  return (
    <li
      className={`card flex animate-rise items-start gap-4 p-4 ${conquista.obtida ? "" : "bg-transparent shadow-none"}`}
      style={{ animationDelay: `${Math.min(ordem, 12) * 45}ms` }}
    >
      <DiscoMedalha conquista={conquista} />
      <div className="min-w-0 flex-1">
        <p className={`eyebrow ${conquista.obtida ? "text-success-ink" : "text-ink-faint"}`}>
          {conquista.obtida ? "Conquistada" : fracao(conquista) > 0 ? "Em andamento" : "A conquistar"}
        </p>
        <h3 className={`mt-0.5 font-semibold leading-snug ${conquista.obtida ? "text-ink" : "text-ink-soft"}`}>
          {conquista.titulo}
        </h3>
        <p className="mt-0.5 text-sm text-ink-soft">{conquista.descricao}</p>
        <ProgressoConquista conquista={conquista} />
      </div>
    </li>
  );
}
