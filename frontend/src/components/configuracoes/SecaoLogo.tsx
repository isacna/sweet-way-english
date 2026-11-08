"use client";

import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Campo, classeArquivo, classeBotao, erroDaApi, RegiaoAoVivo, Secao } from "@/components/painel/ui";
import { apiFetch } from "@/lib/api";

type Msg = { tom: "erro" | "sucesso"; texto: string } | null;

/** A API devolve a URL absoluta (APP_URL); a página usa o caminho relativo `/api/configuracoes/logo?v=…`. */
function logoRelativo(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.replace(/^https?:\/\/[^/]+/i, "");
}

/** Logo da escola (admin): a imagem é pública, aparece no cabeçalho antes do login. */
export function SecaoLogo() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [logoAtual, setLogoAtual] = useState<string | null>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [previa, setPrevia] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const res = await apiFetch("/configuracoes").catch(() => null);
      if (cancelado || !res?.ok) return;
      const d = await res.json();
      setLogoAtual(logoRelativo(d.logoUrl));
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  // A prévia local é uma object URL: libera ao trocar de arquivo ou sair da página
  useEffect(() => {
    if (!arquivo) return;
    const url = URL.createObjectURL(arquivo);
    queueMicrotask(() => setPrevia(url));
    return () => URL.revokeObjectURL(url);
  }, [arquivo]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!arquivo) return;
    setMsg(null);
    setEnviando(true);
    const form = new FormData();
    form.append("logo", arquivo);
    const res = await apiFetch("/configuracoes/logo", { method: "PATCH", body: form }).catch(() => null);
    setEnviando(false);
    if (!res?.ok) {
      setMsg({ tom: "erro", texto: await erroDaApi(res, "Não foi possível enviar o logo.") });
      return;
    }
    const data = await res.json();
    setLogoAtual(logoRelativo(data.logoUrl));
    setArquivo(null);
    setPrevia(null);
    if (inputRef.current) inputRef.current.value = "";
    setMsg({ tom: "sucesso", texto: "Logo atualizado. Pode levar até um minuto para aparecer no cabeçalho." });
    router.refresh();
  }

  const mostrar = (arquivo && previa) || logoAtual || "/logo-sweet.png";

  return (
    <Secao id="aparencia" titulo="Logo da escola" descricao="Aparece no cabeçalho de todas as páginas, inclusive antes do login.">
      <div className="grid gap-5 sm:grid-cols-[14rem_minmax(0,1fr)] sm:items-start">
        <figure className="space-y-2">
          <div className="flex h-28 items-center justify-center rounded-2xl border border-dashed border-line-strong bg-gray-50 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element -- URL pública do backend ou object URL local */}
            <img
              src={mostrar}
              alt="Logo atual da escola"
              onError={(e) => {
                // Logo inacessível: mostra o padrão em vez do ícone de imagem quebrada
                if (!e.currentTarget.src.endsWith("/logo-sweet.png")) e.currentTarget.src = "/logo-sweet.png";
              }}
              className="max-h-20 w-auto max-w-full object-contain"
            />
          </div>
          <figcaption className="text-xs text-ink-soft">{arquivo ? "Prévia do novo logo" : "Logo atual"}</figcaption>
        </figure>
        <form onSubmit={enviar} className="space-y-4">
          <Campo id="cfg-logo" rotulo="Novo logo" dica="PNG, JPEG, GIF ou WebP. De preferência com fundo transparente.">
            <input
              id="cfg-logo"
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              onChange={(e) => {
                setMsg(null);
                setArquivo(e.target.files?.[0] ?? null);
              }}
              className={classeArquivo}
            />
          </Campo>
          <RegiaoAoVivo mensagem={msg} />
          <button type="submit" disabled={enviando || !arquivo} className={classeBotao("primario", "w-full sm:w-auto")}>
            <Upload aria-hidden className="h-4 w-4" />
            {enviando ? "Enviando…" : "Enviar logo"}
          </button>
        </form>
      </div>
    </Secao>
  );
}
