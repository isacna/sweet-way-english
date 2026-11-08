"use client";

import { useEffect, useState } from "react";
import { Campo, Carregando, classeBotao, classeCampo, erroDaApi, RegiaoAoVivo, Secao } from "@/components/painel/ui";
import { apiFetch, getStoredUser, salvarUsuario } from "@/lib/api";

type Perfil = { id: number; nome: string; email: string; criadoEm: string };
type Msg = { tom: "erro" | "sucesso"; texto: string } | null;

/** Nome, e-mail e senha da professora logada (PATCH /professor/me). */
export function SecaoConta() {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [erroCarga, setErroCarga] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const res = await apiFetch("/professor/me").catch(() => null);
      if (cancelado) return;
      if (!res?.ok) {
        setErroCarga(await erroDaApi(res, "Não foi possível carregar seu perfil."));
        return;
      }
      const d: Perfil = await res.json();
      setPerfil(d);
      setNome(d.nome);
      setEmail(d.email);
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!perfil) return;
    setMsg(null);
    const body: Record<string, string> = {};
    if (nome.trim() !== perfil.nome) body.nome = nome.trim();
    if (email.trim().toLowerCase() !== perfil.email.toLowerCase()) body.email = email.trim();
    if (senha) {
      if (senha.length < 6) return setMsg({ tom: "erro", texto: "A nova senha precisa ter pelo menos 6 caracteres." });
      if (senha !== confirmar) return setMsg({ tom: "erro", texto: "As senhas não coincidem." });
      body.senha = senha;
    }
    if (!nome.trim() || !email.trim()) return setMsg({ tom: "erro", texto: "Nome e e-mail não podem ficar vazios." });
    if (Object.keys(body).length === 0) return setMsg({ tom: "erro", texto: "Nenhuma alteração para salvar." });

    setSalvando(true);
    const res = await apiFetch("/professor/me", { method: "PATCH", body: JSON.stringify(body) }).catch(() => null);
    setSalvando(false);
    if (!res?.ok) {
      setMsg({ tom: "erro", texto: await erroDaApi(res, "Não foi possível salvar.") });
      return;
    }
    const data: Perfil = await res.json();
    setPerfil(data);
    setNome(data.nome);
    setEmail(data.email);
    setSenha("");
    setConfirmar("");
    // Atualiza o cache do usuário (nome no menu do perfil)
    const atual = getStoredUser();
    if (atual) salvarUsuario({ ...atual, nome: data.nome, email: data.email });
    setMsg({
      tom: "sucesso",
      texto: body.senha ? "Perfil e senha atualizados. Outras sessões abertas foram encerradas." : "Perfil atualizado.",
    });
  }

  return (
    <Secao id="conta" titulo="Minha conta" descricao="Seu nome aparece para os alunos nas turmas e nos feedbacks.">
      {!perfil ? (
        erroCarga ? (
          <RegiaoAoVivo mensagem={{ tom: "erro", texto: erroCarga }} />
        ) : (
          <Carregando />
        )
      ) : (
        <form onSubmit={salvar} className="max-w-md space-y-4" noValidate>
          <Campo id="cfg-nome" rotulo="Nome">
            <input id="cfg-nome" value={nome} onChange={(e) => setNome(e.target.value)} required autoComplete="name" className={classeCampo} />
          </Campo>
          <Campo id="cfg-email" rotulo="E-mail" dica="É o seu login.">
            <input
              id="cfg-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={classeCampo}
            />
          </Campo>
          <Campo id="cfg-senha" rotulo="Nova senha" opcional dica="Deixe em branco para manter a atual.">
            <input
              id="cfg-senha"
              type="password"
              autoComplete="new-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className={classeCampo}
            />
          </Campo>
          {senha && (
            <Campo id="cfg-confirmar" rotulo="Confirmar nova senha">
              <input
                id="cfg-confirmar"
                type="password"
                autoComplete="new-password"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                className={classeCampo}
              />
            </Campo>
          )}
          <RegiaoAoVivo mensagem={msg} />
          <button type="submit" disabled={salvando} className={classeBotao("primario", "w-full sm:w-auto")}>
            {salvando ? "Salvando…" : "Salvar alterações"}
          </button>
        </form>
      )}
    </Secao>
  );
}
