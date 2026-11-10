import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import type { Midia, Resposta } from "@/lib/curso";
import { MidiaLicao } from "./MidiaLicao";
import { ExercicioSequence } from "./ExercicioSequence";
import { MissaoLicao } from "./MissaoLicao";
import { exercicioParaForm, exercicioParaPayload, licaoParaForm, licaoParaPayload } from "../conteudo/formulario";
import type { ExercicioCompleto, LicaoEdicao } from "@/lib/curso";

const midia: Midia = { tipo: "video", modo: "youtube", titulo: "Rotinas", fonte: "Autor", url: "https://www.youtube.com/watch?v=4XLQpRI_wOQ", orientacao: "Observe os gestos.", inicio: 10, fim: 30 };

it("carrega o YouTube somente por ação do aluno e mantém um link de recuperação", () => {
  const { container } = render(<MidiaLicao midia={midia} />);
  expect(container.querySelector('iframe')).toBeNull();
  expect(screen.getByRole('link')).toHaveAttribute('href', midia.url);
  fireEvent.click(screen.getByRole('button', { name: 'Carregar vídeo do YouTube' }));
  expect(screen.getByTitle('Rotinas')).toHaveAttribute('src', expect.stringContaining('youtube-nocookie.com/embed/4XLQpRI_wOQ?start=10&end=30'));
});

it("mostra a transcrição quando um arquivo falha", () => {
  const { container } = render(<MidiaLicao midia={{ ...midia, tipo: 'audio', modo: 'arquivo', url: 'https://example.com/a.mp3', transcricao: 'I work at night.' }} />);
  fireEvent.error(container.querySelector('audio')!);
  expect(screen.getByRole('status')).toHaveTextContent('Não foi possível');
  expect(screen.getByText('I work at night.')).toBeInTheDocument();
});

it("permite montar, remover e recomeçar uma sequência com botões acessíveis", () => {
  function Atividade() {
    const [value, onChange] = useState<Resposta>([]);
    return <ExercicioSequence id={10} conteudo={{ trechos: ['Order.', 'Eat.', 'Pay.'] }} value={value} onChange={onChange} />;
  }
  render(<Atividade />);
  fireEvent.click(screen.getByRole('button', { name: 'Order.' }));
  fireEvent.click(screen.getByRole('button', { name: 'Eat.' }));
  expect(within(screen.getByRole('group', { name: 'Sequência montada' })).getAllByRole('button')).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: 'Remover trecho 1: Order.' }));
  expect(screen.getByRole('button', { name: 'Order.' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: 'Recomeçar sequência' }));
  expect(within(screen.getByRole('group', { name: 'Trechos disponíveis' })).getAllByRole('button')).toHaveLength(3);
});

it("guarda produção pessoal nas notas sem atribuir nota automática", () => {
  const onAnotar = jest.fn();
  render(<MissaoLicao missao={{ titulo: 'Meu dia', enunciado: 'Conte sua rotina.', criterios: ['Usei I.', 'Incluí horários.'], exemplo: 'I work at nine.' }} onAnotar={onAnotar} />);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'I study at night.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar nas minhas notas' }));
  expect(onAnotar).toHaveBeenCalledWith('Meu dia\nI study at night.');
  expect(screen.getByRole('button', { name: 'Guardar nas minhas notas' })).toBeDisabled();
});

it("impede truncar uma produção quando o caderno não tem espaço", () => {
  const onAnotar = jest.fn();
  render(<MissaoLicao missao={{ titulo: 'Meu dia', enunciado: 'Conte sua rotina.', criterios: ['Usei I.', 'Incluí horários.'], exemplo: 'I work at nine.' }} onAnotar={onAnotar} espacoNotas={10} />);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'I study at night.' } });
  expect(screen.getByRole('button', { name: 'Guardar nas minhas notas' })).toBeDisabled();
  expect(screen.getByText(/Não há espaço suficiente/)).toBeVisible();
  expect(onAnotar).not.toHaveBeenCalled();
});

it("preserva mídia, missão e gabarito ao abrir e salvar no editor", () => {
  const ex = { id: 2, tipo: 'sequence', etapa: 'semicontrolada', enunciado: 'Ordene.', explicacao: 'Ordem.', conteudo: { trechos: ['Pay.', 'Order.', 'Eat.'], midia }, gabarito: { ordem: [1, 2, 0] } } as ExercicioCompleto;
  const payload = exercicioParaPayload(exercicioParaForm(ex));
  expect(payload.conteudo.midia).toEqual(midia);
  expect((payload.gabarito.ordem as number[]).map((i) => (payload.conteudo.trechos as string[])[i])).toEqual(['Order.', 'Eat.', 'Pay.']);
  const missao = { titulo: 'Pedido', enunciado: 'Escreva.', criterios: ['Pedi.', 'Agradeci.'], exemplo: 'A tea, please.' };
  const licao = { titulo: 'Café', objetivo: 'Pedir', minutosEstimados: 20, apresentacao: { explicacao: ['Texto'], exemplos: [], recursos: [midia], missao }, exercicios: [ex] } as unknown as LicaoEdicao;
  expect(licaoParaPayload(licaoParaForm(licao)).apresentacao).toMatchObject({ recursos: [midia], missao });
});
