// Idade e maioridade (LGPD art. 14: menores de 18 precisam de consentimento do responsável).
export const IDADE_MAIORIDADE = 18;

export function idadeEm(nascimento: Date, hoje = new Date()) {
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const m = hoje.getMonth() - nascimento.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) idade--;
  return idade;
}

export function ehMenor(nascimento: Date, hoje = new Date()) {
  return idadeEm(nascimento, hoje) < IDADE_MAIORIDADE;
}
