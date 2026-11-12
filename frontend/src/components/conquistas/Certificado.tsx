"use client";

import { useSyncExternalStore } from "react";
import { BrandMark } from "@/components/BrandMark";
import { dataPorExtenso, formatarCodigo, nomeDoNivel } from "./apoio";
import estilos from "./Certificado.module.css";

const semAssinatura = () => () => {};

/** Endereço do site como a pessoa o abriu ("" no servidor), para montar o link de conferência. */
export function useEnderecoDoSite(): string {
  return useSyncExternalStore(
    semAssinatura,
    () => window.location.origin,
    () => "",
  );
}

/** Caminho público de conferência de um certificado. */
export function caminhoVerificacao(codigo: string) {
  return `/certificado/${codigo}`;
}

/**
 * A folha do certificado. É clara nos dois temas e é o que sai na impressão
 * (`data-imprimir="certificado"`: ver as regras de @media print em globals.css).
 */
export function Certificado({
  nomeAluno,
  nivel,
  emitidoEm,
  codigo,
}: {
  nomeAluno: string;
  nivel: { codigo: string; nome: string };
  emitidoEm: string;
  codigo: string;
}) {
  const site = useEnderecoDoSite();
  const endereco = `${site.replace(/^https?:\/\//, "")}${caminhoVerificacao(codigo)}`;

  return (
    <article data-imprimir="certificado" className={estilos.papel} aria-label={`Certificado de conclusão do nível ${nivel.codigo}`}>
      <span className={estilos.marca} aria-hidden>
        {nivel.codigo}
      </span>

      <div className={estilos.conteudo}>
        <div className={estilos.topo}>
          <BrandMark />
          <div className={estilos.selo} aria-hidden>
            <span className={estilos.seloRotulo}>NÍVEL</span>
            <span className={estilos.seloCodigo}>{nivel.codigo}</span>
          </div>
        </div>

        <div className={estilos.corpo}>
          <p className={estilos.titulo}>Certificado de conclusão</p>
          <p className={estilos.certificamos}>Certificamos que</p>
          <p className={estilos.nome}>{nomeAluno}</p>
          <div className={estilos.fio} aria-hidden />
          <p className={estilos.texto}>
            concluiu o nível{" "}
            <strong>
              {nomeDoNivel(nivel)}
            </strong>{" "}
            do curso de inglês <strong>Sweet Way English</strong>, com aprovação nos testes de todos os módulos.
          </p>
        </div>

        <dl className={estilos.rodape}>
          <div>
            <dt>Emitido em</dt>
            <dd>{dataPorExtenso(emitidoEm)}</dd>
          </div>
          <div>
            <dt>Código de verificação</dt>
            <dd className={estilos.codigo}>{formatarCodigo(codigo)}</dd>
          </div>
          <div>
            <dt>Confira a autenticidade em</dt>
            <dd>{endereco}</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}
