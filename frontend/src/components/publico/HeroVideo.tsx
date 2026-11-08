"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import s from "./HeroVideo.module.css";
import { VideoFundo } from "./VideoFundo";

const links = [
  { href: "/cadastro", rotulo: "Curso A1" },
  { href: "/login?tipo=professor", rotulo: "Professoras" },
  { href: "/login?tipo=aluno", rotulo: "Entrar" },
];

// ─── Título que se redigita alternando português e inglês ───────────────────

const TITULOS = [
  { texto: "Inglês do básico ao intermediário, no seu ritmo.", lang: "pt-BR" },
  { texto: "English from beginner to intermediate, at your own pace.", lang: "en" },
] as const;
const PAUSA_MS = 15000;
const ATRASO_LETRA_MS = 100;

const consultaMovimento = "(prefers-reduced-motion: reduce)";
function assinarMovimento(cb: () => void) {
  const mq = window.matchMedia(consultaMovimento);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function TituloAlternado({ className }: { className: string }) {
  const reduzido = useSyncExternalStore(assinarMovimento, () => window.matchMedia(consultaMovimento).matches, () => false);
  const [indice, setIndice] = useState(0);
  const [letras, setLetras] = useState<number>(TITULOS[0].texto.length);
  const [fase, setFase] = useState<"digitando" | "pausa">("pausa");
  const atual = TITULOS[indice];

  useEffect(() => {
    if (reduzido) return;
    if (fase === "pausa") {
      const t = setTimeout(() => {
        setIndice((i) => (i + 1) % TITULOS.length);
        setLetras(0);
        setFase("digitando");
      }, PAUSA_MS);
      return () => clearTimeout(t);
    }
    if (letras < atual.texto.length) {
      const t = setTimeout(() => setLetras((n) => n + 1), ATRASO_LETRA_MS);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setFase("pausa"), 0);
    return () => clearTimeout(t);
  }, [fase, letras, atual.texto.length, reduzido]);

  // Com movimento reduzido, fica só o título em português, inteiro
  const exibido = reduzido ? TITULOS[0] : atual;
  const texto = reduzido ? exibido.texto : exibido.texto.slice(0, letras);
  const digitando = !reduzido && fase === "digitando" && letras < atual.texto.length;

  return (
    <h1 className={`${className} ${s.titulo}`}>
      {/* Leitor de tela: um título estável, sem anunciar letra por letra */}
      <span className={s.srOnly}>{TITULOS[0].texto}</span>
      {/* Reserva a altura do maior texto para a página não pular enquanto digita */}
      <span className={s.tituloMedida} aria-hidden>
        {TITULOS.map((t) => (
          <span key={t.lang}>{t.texto}</span>
        ))}
      </span>
      <span className={s.tituloVisivel} aria-hidden lang={exibido.lang}>
        {texto}
        {digitando && <span className={s.cursor} />}
      </span>
    </h1>
  );
}

// ─── Hero ───────────────────────────────────────────────────────────────────

export function HeroVideo() {
  // A classe de entrada já vem no HTML do servidor (sem "piscar" antes da animação)
  // e sai depois que tudo entrou, para não deixar will-change ligado.
  const [animando, setAnimando] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setAnimando(false), 2600);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className={`${s.stage} ${animando ? s.anim : ""}`}>
      <VideoFundo className={s.video} />

      <div className={s.frame}>
        <input type="checkbox" id="menu-home" className={s.menuToggle} aria-label="Abrir menu" />

        <header className={s.nav}>
          <Link href="/home" className={s.brand} aria-label="Sweet Way English, página inicial">
            <span className={s.mark} aria-hidden>
              <Image src="/logo-sweet.png" alt="" width={512} height={512} priority className={s.markImg} />
            </span>
            <span className={s.wordmark}>Sweet Way English</span>
          </Link>

          <ul className={s.links}>
            {links.map((l) => (
              <li key={l.rotulo}>
                <Link href={l.href}>{l.rotulo}</Link>
              </li>
            ))}
          </ul>

          <Link href="/cadastro" className={s.cta}>
            <span>Criar conta</span>
          </Link>

          <label htmlFor="menu-home" className={s.burger} aria-hidden>
            <span className={s.burgerIcon} />
          </label>
        </header>

        <nav className={s.sheet} aria-label="Menu">
          <div className={s.sheetInner}>
            <div className={s.panel}>
              {links.map((l) => (
                <Link key={l.rotulo} href={l.href}>
                  {l.rotulo}
                </Link>
              ))}
              <Link href="/cadastro" className={s.cta}>
                <span>Criar conta</span>
              </Link>
            </div>
          </div>
        </nav>

        <main className={s.hero}>
          <div className={s.copy}>
            <TituloAlternado className={s.h1} />
            <p className={s.lead}>
              Explicação em português, frases com áudio em inglês americano e uma professora acompanhando você.
            </p>
          </div>
          <div className={s.actions}>
            <Link href="/cadastro" className={s.primary}>
              <span>Começar o curso A1</span>
            </Link>
            <Link href="/login?tipo=aluno" className={s.secondary}>
              <span>Já tenho conta</span>
            </Link>
          </div>
        </main>

        <footer className={s.proof}>10 módulos · 60 lições · do primeiro “hello” ao intermediário</footer>
      </div>
    </div>
  );
}
