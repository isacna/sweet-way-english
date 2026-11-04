// Parte do tema que o servidor pode importar (sem hooks): a chave do localStorage e o script
// inline do <head> que aplica a preferência antes da primeira pintura. O hook fica em ./tema.ts.

export const CHAVE_TEMA = "sw-tema";

/** Script inline para o <head>: aplica a preferência antes da primeira pintura (sem piscar). */
export const scriptTemaInicial = `try{var t=localStorage.getItem("${CHAVE_TEMA}");if(t==="claro"||t==="escuro")document.documentElement.setAttribute("data-preferencia-tema",t)}catch(e){}`;
