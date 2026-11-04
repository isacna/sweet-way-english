"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PlayerLicao } from "@/components/curso/PlayerLicao";
import { Aviso, Carregando, classeBotao } from "@/components/curso/ui";
import { apiFetch, getStoredUser } from "@/lib/api";
import { lerErroApi, type LicaoDetalhe } from "@/lib/curso";

type Estado =
  | { tipo: "carregando" }
  | { tipo: "ok"; licao: LicaoDetalhe }
  | { tipo: "bloqueada"; mensagem: string }
  | { tipo: "nao_encontrada" }
  | { tipo: "erro"; mensagem: string };

function CarregadorLicao({ id }: { id: string }) {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>({ tipo: "carregando" });

  useEffect(() => {
    const u = getStoredUser();
    if (!u || u.role !== "aluno") {
      router.replace("/login?tipo=aluno");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch(`/curso/licoes/${encodeURIComponent(id)}`);
        if (cancelled) return;
        if (res.status === 401) {
          router.replace("/login?tipo=aluno");
          return;
        }
        if (res.status === 404) {
          setEstado({ tipo: "nao_encontrada" });
          return;
        }
        if (res.status === 403) {
          setEstado({
            tipo: "bloqueada",
            mensagem: await lerErroApi(res, "Conclua a lição anterior para liberar esta."),
          });
          return;
        }
        if (!res.ok) {
          setEstado({ tipo: "erro", mensagem: await lerErroApi(res, "Não foi possível carregar a lição.") });
          return;
        }
        const licao: LicaoDetalhe = await res.json();
        if (!cancelled) setEstado({ tipo: "ok", licao });
      } catch {
        if (!cancelled) setEstado({ tipo: "erro", mensagem: "Não foi possível conectar ao servidor." });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  if (estado.tipo === "carregando") return <Carregando texto="Carregando a lição…" />;
  if (estado.tipo === "nao_encontrada")
    return <Aviso icone="🔍" titulo="Lição não encontrada" texto="Ela pode ainda não ter sido publicada." />;
  if (estado.tipo === "bloqueada") return <Aviso icone="🔒" titulo="Lição bloqueada" texto={estado.mensagem} />;
  if (estado.tipo === "erro")
    return (
      <Aviso
        titulo="Ops!"
        texto={estado.mensagem}
        acao={
          <>
            <button type="button" onClick={() => window.location.reload()} className={classeBotao("primario")}>
              Tentar de novo
            </button>
            <Link href="/aluno/curso" className={classeBotao("secundario")}>
              Voltar para a trilha
            </Link>
          </>
        }
      />
    );
  return <PlayerLicao licao={estado.licao} />;
}

export default function LicaoPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  // `key` reinicia o player ao navegar para a próxima lição
  return <CarregadorLicao key={id} id={id} />;
}
