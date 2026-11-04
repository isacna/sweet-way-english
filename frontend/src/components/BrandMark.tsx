import Image from "next/image";

/**
 * Marca compacta: o redemoinho do logo (recortado do PNG) + o nome em Fredoka.
 * Legível com 40px de altura, onde o PNG inteiro vira um borrão.
 */
export function BrandMark({ size = "md", className = "" }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const s = { sm: 34, md: 40, lg: 56 }[size];
  // O redemoinho ocupa ~x 158–372 e y 78–292 do PNG 512×512
  const escala = s / 214;
  const lado = Math.round(512 * escala);
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span
        className="relative shrink-0 overflow-hidden rounded-full"
        style={{ width: s, height: s }}
        aria-hidden
      >
        <Image
          src="/logo-sweet.png"
          alt=""
          width={lado}
          height={lado}
          priority
          className="absolute max-w-none"
          style={{ width: lado, height: lado, left: -Math.round(158 * escala), top: -Math.round(78 * escala) }}
        />
      </span>
      <span className="flex flex-col leading-none" aria-hidden>
        <span
          className={`font-display font-semibold tracking-tight text-sky ${
            size === "lg" ? "text-[1.7rem]" : size === "sm" ? "text-base" : "text-lg"
          }`}
        >
          Sweet Way
        </span>
        <span
          className={`font-display font-medium tracking-[0.3em] text-sky-strong ${
            size === "lg" ? "mt-1 text-[0.72rem]" : "mt-0.5 text-[0.56rem]"
          }`}
        >
          ENGLISH
        </span>
      </span>
      <span className="sr-only">Sweet Way English</span>
    </span>
  );
}

/** Só o redemoinho do logo, recortado em círculo. */
export function LogoSwirl({ size = 56, className = "" }: { size?: number; className?: string }) {
  const escala = size / 214;
  const lado = Math.round(512 * escala);
  return (
    <span
      className={`relative inline-block shrink-0 overflow-hidden rounded-full ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <Image
        src="/logo-sweet.png"
        alt=""
        width={lado}
        height={lado}
        className="absolute max-w-none"
        style={{ width: lado, height: lado, left: -Math.round(158 * escala), top: -Math.round(78 * escala) }}
      />
    </span>
  );
}
