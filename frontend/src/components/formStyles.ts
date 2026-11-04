/**
 * Classes compartilhadas dos formulários de entrada (login e cadastro), feitas para o
 * cartão de vidro escuro do AuthShell. Campos grandes (≥ 48px), bons para toque.
 */
export const classeCampo =
  "block min-h-[48px] w-full rounded-[12px] border border-white/15 bg-black/30 px-4 py-3 text-base text-white placeholder:text-white/55 transition-[border-color,box-shadow,background-color] hover:border-white/25 focus:border-[#f8b285] focus:bg-black/40 focus:outline-none focus:ring-[3px] focus:ring-[#f8b285]/30 focus-visible:outline-none";

export const classeRotulo = "mb-1.5 block text-sm font-medium text-white/90";

/** Ação principal: o botão violeta da home (branco sobre #7448f0 = 5.4:1). */
export const classeBotaoAcao =
  "inline-flex min-h-[50px] items-center justify-center gap-2 rounded-[14px] bg-[linear-gradient(163deg,#8a63f6_0%,#7448f0_50%,#6236dc_100%)] px-6 text-base font-semibold tracking-[-0.01em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_3px_16px_rgba(98,54,220,0.42)] transition-[filter,transform] hover:brightness-[1.07] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:brightness-100 disabled:active:scale-100";

/** Link secundário em branco suave, sublinhado ao passar o mouse. */
export const classeLinkSuave =
  "inline-flex min-h-[44px] items-center rounded-md font-semibold text-white underline decoration-white/30 underline-offset-4 transition-colors hover:decoration-white";

/** Avisos dentro do cartão escuro. */
export const classeAvisoErro =
  "rounded-[12px] border border-[#ff8a9b]/30 bg-[#ff5a6e]/15 px-4 py-3 text-sm font-medium text-[#ffb3be]";
export const classeAvisoSucesso =
  "rounded-[12px] border border-[#6fdba3]/30 bg-[#22c373]/15 px-4 py-3 text-sm font-medium text-[#9eedc4]";
