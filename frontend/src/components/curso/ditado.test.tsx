import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import {
  formatarResposta,
  respostaEmIngles,
  respostaParaEnvio,
  respostaPreenchida,
  type ExercicioCompleto,
  type ItemRenderizavel,
  type Resposta,
} from "@/lib/curso";
import { GabaritoView } from "../conteudo/GabaritoView";
import { avisosExercicio, exercicioParaForm, exercicioParaPayload, exercicioVazio, TIPOS } from "../conteudo/formulario";
import { Exercicio } from "./Exercicio";
import { ExercicioDictation, reiniciarDeteccaoVoz } from "./ExercicioDictation";

const FRASE = "It's cold today.";
const item: ItemRenderizavel = { id: 7, tipo: "dictation", enunciado: "Ouça e escreva.", conteudo: { frase: FRASE } };

type Voz = { lang: string; name: string };

/** Web Speech API de mentira (o jsdom não tem). `vozes` pode mudar depois, com `chegar()`. */
function instalarVoz(vozes: Voz[]) {
  const ouvintes = new Set<() => void>();
  const synth = {
    lista: vozes,
    speak: jest.fn(),
    cancel: jest.fn(),
    getVoices: () => synth.lista,
    addEventListener: (_: string, f: () => void) => ouvintes.add(f),
    removeEventListener: (_: string, f: () => void) => ouvintes.delete(f),
    chegar(novas: Voz[]) {
      synth.lista = novas;
      ouvintes.forEach((f) => f());
    },
  };
  Object.defineProperty(window, "speechSynthesis", { value: synth, configurable: true });
  (globalThis as Record<string, unknown>).SpeechSynthesisUtterance = class {
    lang = "";
    rate = 1;
    voice: unknown = null;
    constructor(public text: string) {}
  };
  return synth;
}

const EN: Voz = { lang: "en-US", name: "Google US English" };
const PT: Voz = { lang: "pt-BR", name: "Google português do Brasil" };

function Ditado({ onSubmit, onPular }: { onSubmit?: () => void; onPular?: () => void }) {
  const [value, onChange] = useState<Resposta | undefined>(undefined);
  return <Exercicio item={item} value={value} onChange={onChange} onSubmit={onSubmit} onPular={onPular} />;
}

beforeEach(() => {
  reiniciarDeteccaoVoz();
  delete (window as unknown as Record<string, unknown>).speechSynthesis;
});

afterEach(() => {
  jest.useRealTimers();
});

describe("ExercicioDictation", () => {
  it("fala a frase só quando o aluno pede, na velocidade normal e devagar", () => {
    const synth = instalarVoz([PT, EN]);
    render(<Ditado />);
    expect(synth.speak).not.toHaveBeenCalled(); // nada de autoplay

    const ouvir = screen.getByRole("button", { name: "Ouvir" });
    expect(ouvir).toHaveFocus();
    fireEvent.click(ouvir);
    expect(synth.speak).toHaveBeenCalledTimes(1);
    expect(synth.speak.mock.calls[0][0]).toMatchObject({ text: FRASE, lang: "en-US", rate: 0.9, voice: EN });

    fireEvent.click(screen.getByRole("button", { name: "Ouvir devagar" }));
    expect(synth.speak.mock.calls[1][0]).toMatchObject({ text: FRASE, rate: 0.6 });
  });

  it("nunca escreve a frase na tela nem em atributos", () => {
    instalarVoz([EN]);
    const { container } = render(<Ditado />);
    expect(container.innerHTML).not.toContain(FRASE);
    expect(container.innerHTML.toLowerCase()).not.toContain("cold");
  });

  it("tem um campo de texto em inglês, sem correção automática, que envia com Enter", () => {
    instalarVoz([EN]);
    const onSubmit = jest.fn();
    const { container } = render(<Ditado onSubmit={onSubmit} />);
    const campo = screen.getByLabelText("Escreva o que você ouviu");
    expect(campo).toBe(container.querySelector("#texto-7"));
    expect(campo).toHaveAttribute("lang", "en");
    expect(campo).toHaveAttribute("autocapitalize", "off");
    expect(campo).toHaveAttribute("autocorrect", "off");
    expect(campo).toHaveAttribute("spellcheck", "false");
    fireEvent.change(campo, { target: { value: "its cold today" } });
    expect(campo).toHaveValue("its cold today");
    fireEvent.keyDown(campo, { key: "Enter" });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("mostra a dica em português e continua podendo ouvir depois da correção", () => {
    const synth = instalarVoz([EN]);
    render(
      <ExercicioDictation
        id={7}
        conteudo={{ frase: FRASE, dica: "Fala do tempo." }}
        value="it is cold today"
        onChange={() => {}}
        disabled
        feedback={{ correto: true, pontuacao: 1, respostaEsperada: FRASE, explicacao: "x" }}
      />
    );
    expect(screen.getByText("Fala do tempo.")).toBeInTheDocument();
    expect(screen.getByLabelText("Escreva o que você ouviu")).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Ouvir" }));
    expect(synth.speak).toHaveBeenCalledTimes(1);
  });

  it("interrompe a fala ao sair do exercício", () => {
    const synth = instalarVoz([EN]);
    const { unmount } = render(<Ditado />);
    unmount();
    expect(synth.cancel).toHaveBeenCalled();
  });
});

describe("ditado sem voz em inglês", () => {
  it("sem speechSynthesis: avisa, não mostra a frase e deixa pular", () => {
    const onPular = jest.fn();
    const { container } = render(<Ditado onPular={onPular} />);
    expect(screen.getByRole("status")).toHaveTextContent("Seu navegador não tem voz em inglês: pule este exercício");
    expect(container.innerHTML).not.toContain(FRASE);
    expect(container.querySelector("#texto-7")).toBeNull();
    expect(screen.queryByRole("button", { name: "Ouvir" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Pular este exercício" }));
    expect(onPular).toHaveBeenCalledTimes(1);
  });

  it("sem onPular (prática da lição), aponta para o botão Pular da tela", () => {
    render(<Ditado />);
    expect(screen.getByRole("status")).toHaveTextContent("use o botão “Pular”");
    expect(screen.queryByRole("button", { name: "Pular este exercício" })).toBeNull();
  });

  it("só vozes de outros idiomas: avisa na hora", () => {
    instalarVoz([PT]);
    render(<Ditado />);
    expect(screen.getByRole("status")).toHaveTextContent("não tem voz em inglês");
  });

  it("lista de vozes vazia: espera, depois avisa; se a voz chegar, o exercício volta", () => {
    jest.useFakeTimers();
    const synth = instalarVoz([]);
    render(<Ditado />);
    // enquanto verifica, o exercício fica disponível
    expect(screen.getByRole("button", { name: "Ouvir" })).toBeInTheDocument();
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(screen.getByRole("status")).toHaveTextContent("não tem voz em inglês");
    act(() => synth.chegar([PT, EN]));
    expect(screen.getByRole("button", { name: "Ouvir" })).toBeInTheDocument();
  });

  it("vozes que chegam antes do prazo evitam o aviso", () => {
    jest.useFakeTimers();
    const synth = instalarVoz([]);
    render(<Ditado />);
    act(() => synth.chegar([{ lang: "en_GB", name: "English" }]));
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByLabelText("Escreva o que você ouviu")).toBeInTheDocument();
  });

  it("“Tentar ouvir mesmo assim” libera o exercício e vale para os próximos", () => {
    const synth = instalarVoz([PT]);
    const { unmount } = render(<Ditado />);
    fireEvent.click(screen.getByRole("button", { name: "Tentar ouvir mesmo assim" }));
    fireEvent.click(screen.getByRole("button", { name: "Ouvir" }));
    expect(synth.speak.mock.calls[0][0]).toMatchObject({ text: FRASE, lang: "en-US" });
    unmount();
    render(<Ditado />);
    expect(screen.getByRole("button", { name: "Ouvir" })).toBeInTheDocument();
  });

  it("quem já respondeu vê a própria resposta, mesmo sem voz", () => {
    render(
      <ExercicioDictation
        id={7}
        conteudo={{ frase: FRASE }}
        value="its cold"
        onChange={() => {}}
        disabled
        feedback={{ correto: false, pontuacao: 0, respostaEsperada: FRASE, explicacao: "x" }}
      />
    );
    expect(screen.getByLabelText("Escreva o que você ouviu")).toHaveValue("its cold");
  });
});

describe("helpers de resposta (lib/curso)", () => {
  it("tratam o ditado como resposta de texto em inglês", () => {
    expect(respostaPreenchida(item, undefined)).toBe(false);
    expect(respostaPreenchida(item, "   ")).toBe(false);
    expect(respostaPreenchida(item, ["It", "is"])).toBe(false);
    expect(respostaPreenchida(item, "It is cold today")).toBe(true);
    expect(respostaParaEnvio(item, undefined)).toBe("");
    expect(respostaParaEnvio(item, "it is cold")).toBe("it is cold");
    expect(formatarResposta(item, "it is cold")).toBe("it is cold");
    expect(formatarResposta(item, undefined)).toBe("—");
    expect(respostaEmIngles(item)).toBe(true);
  });
});

describe("editor da professora", () => {
  const completo = {
    id: 3,
    tipo: "dictation",
    etapa: "semicontrolada",
    enunciado: "Ouça e escreva.",
    explicacao: "A frase é sobre o tempo.",
    tagsErro: ["piloto_ditado_v1"],
    conteudo: { frase: "She is eighteen years old.", dica: "Pode usar algarismos." },
    gabarito: { aceitas: ["She is eighteen years old.", "She is 18 years old."] },
  } as ExercicioCompleto;

  it("oferece o tipo e preserva o conteúdo ao abrir e salvar", () => {
    expect(TIPOS).toContain("dictation");
    const form = exercicioParaForm(completo);
    expect(avisosExercicio(form)).toEqual([]);
    expect(exercicioParaPayload(form)).toEqual(completo);
  });

  it("um ditado novo aceita a própria frase até a professora listar variantes, e não leva mídia", () => {
    const form = { ...exercicioVazio("semicontrolada", "dictation"), enunciado: "Ouça.", explicacao: "x", frase: " Nice to meet you. " };
    form.midia = { tipo: "audio", modo: "voz", titulo: "t", fonte: "f", orientacao: "o", transcricao: "x" };
    const payload = exercicioParaPayload(form);
    expect(payload.conteudo).toEqual({ frase: "Nice to meet you." });
    expect(payload.gabarito).toEqual({ aceitas: ["Nice to meet you."] });
    expect(exercicioParaPayload({ ...form, aceitas: "Nice to meet you.\nNice to meet you!" }).gabarito).toEqual({
      aceitas: ["Nice to meet you.", "Nice to meet you!"],
    });
  });

  it("avisa o que o servidor vai recusar", () => {
    const base = { ...exercicioParaForm(completo) };
    expect(avisosExercicio({ ...base, frase: "" })).toEqual(["Falta a frase que será falada."]);
    expect(avisosExercicio({ ...base, etapa: "quiz" }).join()).toMatch(/mini-quiz/);
    expect(avisosExercicio({ ...base, frase: "She is 18 years old." }).join()).toMatch(/por extenso/);
    expect(avisosExercicio({ ...base, enunciado: "Escreva: she is eighteen years old" }).join()).toMatch(/não podem conter a frase/);
    expect(avisosExercicio({ ...base, dica: "She is eighteen years old!" }).join()).toMatch(/não podem conter a frase/);
    expect(avisosExercicio({ ...base, frase: "one two three four five six seven eight nine ten eleven twelve thirteen" }).join()).toMatch(/longa demais/);
  });

  it("mostra a frase e o gabarito só na visão da professora", () => {
    render(<GabaritoView item={completo} />);
    expect(screen.getByText("She is eighteen years old.", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("She is 18 years old.")).toBeInTheDocument();
    expect(screen.getByText(/Pode usar algarismos\./)).toBeInTheDocument();
    expect(screen.getByText("Ditado (ouvir e escrever)")).toBeInTheDocument();
  });
});
