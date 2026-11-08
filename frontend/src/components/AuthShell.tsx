import Image from "next/image";
import Link from "next/link";

import { VideoFundo } from "./publico/VideoFundo";
import s from "./publico/AuthShell.module.css";

/**
 * Moldura das telas de entrada (login e cadastro), na linguagem da home:
 * vídeo de fundo fixo, nav com a marca e o formulário num cartão de vidro escuro.
 * `data-tema="escuro"` liga o tema escuro dos tokens (bg-card, text-ink, …).
 */
export function AuthShell({
  link,
  children,
}: {
  /** Link à direita da nav (outra tela de entrada ou volta à home). */
  link: { href: string; rotulo: string };
  children: React.ReactNode;
}) {
  return (
    <div className={s.stage} data-tema="escuro">
      <VideoFundo className={s.video} />
      <div className={s.scrim} aria-hidden />

      <header className={s.nav}>
        <Link href="/home" className={s.brand} aria-label="Sweet Way English, página inicial">
          <span className={s.mark} aria-hidden>
            <Image src="/logo-sweet.png" alt="" width={512} height={512} priority className={s.markImg} />
          </span>
          <span className={s.wordmark} aria-hidden>
            Sweet Way English
          </span>
        </Link>
        <Link href={link.href} className={s.navLink}>
          {link.rotulo}
        </Link>
      </header>

      <main className={s.main}>
        <div className={s.card}>{children}</div>
      </main>
    </div>
  );
}
