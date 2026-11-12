"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Check, Link2, Printer, ScrollText } from "lucide-react";
import { Certificado, caminhoVerificacao, useEnderecoDoSite } from "@/components/conquistas/Certificado";
import { Aviso } from "@/components/curso/ui";
import { Cabecalho, Carregando, classeBotao } from "@/components/painel/ui";
import { apiFetch } from "@/lib/api";
import type { CertificadoNivel } from "@/lib/curso";

type Estado =
  | { fase: "carregando" }
  | { fase: "erro" }
  | { fase: "ausente" }
  | { fase: "pronto"; item: CertificadoNivel & { certificado: NonNullable<CertificadoNivel["certificado"]> } };

function PaginaCertificado({ codigo }: { codigo: string }) {
  const router = useRouter();
  const site = useEnderecoDoSite();
  const [estado, setEstado] = useState<Estado>({ fase: "carregando" });
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // A lista do próprio aluno: só abre aqui um certificado que é dele (e nunca gera 404 no console)
      const res = await apiFetch("/curso/certificados").catch(() => null);
      if (cancelled) return;
      if (res?.status === 401) {
        router.replace("/login?tipo=aluno");
        return;
      }
      if (!res?.ok) {
        setEstado({ fase: "erro" });
        return;
      }
      const { niveis } = (await res.json()) as { niveis: CertificadoNivel[] };
      if (cancelled) return;
      const alvo = codigo.toUpperCase().replace(/[\s-]/g, "");
      const item = niveis.find((n) => n.certificado?.codigo === alvo);
      setEstado(item?.certificado ? { fase: "pronto", item: { ...item, certificado: item.certificado } } : { fase: "ausente" });
    })();
    return () => {
      cancelled = true;
    };
  }, [codigo, router]);

  if (estado.fase === "carregando") return <Carregando className="mx-auto max-w-5xl" texto="Abrindo o certificado…" />;
  if (estado.fase !== "pronto") {
    const voltar = (
      <Link href="/aluno/curso/conquistas" className={classeBotao("primario")}>
        Ver minhas conquistas
      </Link>
    );
    return estado.fase === "erro" ? (
      <Aviso titulo="Não foi possível abrir o certificado" texto="Confira a conexão e tente de novo." acao={voltar} />
    ) : (
      <Aviso
        icone={<ScrollText className="h-9 w-9 text-grape" />}
        titulo="Certificado não encontrado"
        texto="Este código não corresponde a um certificado da sua conta."
        acao={voltar}
      />
    );
  }

  const { nivel, certificado } = estado.item;

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(`${site}${caminhoVerificacao(certificado.codigo)}`);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Sem permissão para a área de transferência: o endereço está impresso no certificado
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 print:max-w-none print:space-y-0">
      <Cabecalho
        voltar={{ href: "/aluno/curso/conquistas", rotulo: "Conquistas" }}
        eyebrow={`Nível ${nivel.codigo} concluído`}
        titulo="Seu certificado"
        descricao="Parabéns! Imprima, salve em PDF ou envie o link para quem quiser conferir."
        acoes={
          <>
            <button type="button" onClick={() => window.print()} className={classeBotao("primario")}>
              <Printer aria-hidden className="h-4 w-4" />
              Imprimir / salvar em PDF
            </button>
            <button type="button" onClick={copiarLink} className={classeBotao("secundario")}>
              {copiado ? <Check aria-hidden className="h-4 w-4" /> : <Link2 aria-hidden className="h-4 w-4" />}
              <span aria-live="polite">{copiado ? "Link copiado" : "Copiar link de verificação"}</span>
            </button>
          </>
        }
      />

      <Certificado nomeAluno={certificado.nomeAluno} nivel={nivel} emitidoEm={certificado.emitidoEm} codigo={certificado.codigo} />

      <p data-nao-imprimir className="text-sm text-ink-soft">
        Na janela de impressão, escolha a orientação <strong className="font-semibold text-ink">paisagem</strong> e, para guardar
        o arquivo, o destino <strong className="font-semibold text-ink">Salvar como PDF</strong>. Qualquer pessoa confere o
        certificado em{" "}
        <Link href={caminhoVerificacao(certificado.codigo)} className="font-semibold text-accent underline underline-offset-2">
          {site.replace(/^https?:\/\//, "")}
          {caminhoVerificacao(certificado.codigo)}
        </Link>
        .
      </p>
    </div>
  );
}

export default function CertificadoPage() {
  const params = useParams<{ codigo: string }>();
  const codigo = params?.codigo ?? "";
  // key: o estado recomeça ao trocar de certificado
  return <PaginaCertificado key={codigo} codigo={codigo} />;
}
