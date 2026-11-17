"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, Settings, Zap, type LucideIcon } from "lucide-react";
import { BrandMark, LogoSwirl } from "./BrandMark";
import { NavbarUser } from "./NavbarUser";
import { iconesNav } from "./navIcons";
import { emModoFoco, itensNavAluno } from "./StudentNav";
import { itensNavProfessor } from "./TeacherNav";
import { totaisDaTrilha, useTrilha } from "@/lib/trilha";

/**
 * Navegação lateral das áreas logadas, a partir de `lg`. Abaixo disso valem o cabeçalho,
 * a barra inferior (aluno) e a faixa de abas (professora).
 * Nas telas de foco do aluno (lição, revisão, teste) encolhe para um trilho só de ícones.
 */
export function BarraLateral({ area, logoUrl }: { area: "aluno" | "professor"; logoUrl?: string | null }) {
  const pathname = usePathname() ?? "";
  const aluno = area === "aluno";
  const inicio = aluno ? "/aluno" : "/professor";
  const itens = aluno ? itensNavAluno : itensNavProfessor;
  const compacta = aluno && emModoFoco(pathname);
  const ativo = (href: string) => (href === inicio ? pathname === inicio : pathname.startsWith(href));

  return (
    <aside
      className={`sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-card py-5 lg:flex ${
        compacta ? "w-[76px] px-3" : "w-64 px-4"
      }`}
    >
      <Link
        href={inicio}
        aria-label="Sweet Way English: início"
        className={`mb-6 flex min-h-[44px] items-center rounded-xl transition-opacity hover:opacity-85 ${
          compacta ? "justify-center" : "px-2"
        }`}
      >
        {compacta ? (
          <LogoSwirl size={40} className="bg-white" />
        ) : logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="Sweet Way English" className="h-11 w-auto max-w-full object-contain object-left" />
        ) : (
          <BrandMark />
        )}
      </Link>

      <nav aria-label="Navegação principal" className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        {!compacta && <p className="eyebrow px-3 pb-1.5 text-ink-faint">Menu</p>}
        {itens.map((item) => (
          <ItemLateral
            key={item.href}
            href={item.href}
            rotulo={item.label}
            Icone={iconesNav[item.icon]}
            ativo={ativo(item.href)}
            compacta={compacta}
          />
        ))}
        {!aluno && (
          <div className="mt-auto pt-4">
            <ItemLateral
              href="/professor/configuracoes"
              rotulo="Configurações"
              Icone={Settings}
              ativo={ativo("/professor/configuracoes")}
              compacta={compacta}
            />
          </div>
        )}
      </nav>

      {aluno && !compacta && <ResumoCurso chave={pathname} />}

      <div className="mt-3 border-t border-line pt-3">
        <NavbarUser variante="lateral" compacto={compacta} validar={false} />
      </div>
    </aside>
  );
}

function ItemLateral({
  href,
  rotulo,
  Icone,
  ativo,
  compacta,
}: {
  href: string;
  rotulo: string;
  Icone: LucideIcon;
  ativo: boolean;
  compacta: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={ativo ? "page" : undefined}
      aria-label={compacta ? rotulo : undefined}
      title={compacta ? rotulo : undefined}
      className={`flex min-h-[44px] items-center gap-3 rounded-xl text-sm font-semibold transition-colors ${
        compacta ? "justify-center" : "px-3"
      } ${
        ativo
          ? "bg-accent text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_1px_2px_rgb(0_0_0/0.18)]"
          : "text-ink-soft hover:bg-gray-100 hover:text-ink"
      }`}
    >
      <Icone className="h-[18px] w-[18px] shrink-0" strokeWidth={ativo ? 2.4 : 2} aria-hidden />
      {!compacta && rotulo}
    </Link>
  );
}

/** Cartão no pé da barra do aluno: ofensiva, XP e quanto do curso já foi feito. */
function ResumoCurso({ chave }: { chave: string }) {
  const { trilha } = useTrilha(chave);
  if (!trilha) return null;
  const { perfil } = trilha;
  const { concluidas, total, percentual } = totaisDaTrilha(trilha);

  return (
    <Link
      href="/aluno/curso"
      className="mt-3 block rounded-2xl border border-line bg-gray-50 p-3.5 transition-colors hover:border-line-strong"
    >
      <span className="flex items-center justify-between text-xs font-semibold text-ink">
        Seu curso
        <span className="tabular-nums text-ink-soft">{percentual}%</span>
      </span>
      <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-gray-200" aria-hidden>
        <span className="block h-full rounded-full bg-accent" style={{ width: `${percentual}%` }} />
      </span>
      <span className="mt-2 block text-xs text-ink-soft">
        {concluidas} de {total} lições
      </span>
      <span className="mt-2.5 flex items-center gap-3 text-xs font-semibold text-ink">
        <span className="inline-flex items-center gap-1">
          <Flame className="h-3.5 w-3.5 fill-flame text-flame" aria-hidden />
          {perfil.ofensivaAtual} {perfil.ofensivaAtual === 1 ? "dia" : "dias"}
        </span>
        <span className="inline-flex items-center gap-1">
          <Zap className="h-3.5 w-3.5 fill-sun text-sun" aria-hidden />
          {perfil.xpHoje}/{perfil.metaDiariaXp} XP hoje
        </span>
      </span>
    </Link>
  );
}
