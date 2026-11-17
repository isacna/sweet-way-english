import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "../styles/globals.css";
import { scriptTemaInicial } from "@/lib/temaScript";

// Inter variável (eixo óptico 14–32). A variável fica no <html>: o Tailwind resolve --font-sans e
// --font-display no :root, e no <body> ela não existiria ali (a fonte cairia na do sistema).
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  axes: ["opsz"],
});

export const metadata: Metadata = {
  title: "Sweet Way English",
  description:
    "Curso de inglês do básico ao intermediário, no seu ritmo, com explicação em português e uma professora acompanhando.",
  icons: {
    icon: "/logo-sweet.png",
    shortcut: "/logo-sweet.png",
    // iOS: ícone opaco de 180px (o PNG do logo é transparente e ficaria com fundo preto)
    apple: { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
  },
  // "Adicionar à Tela de Início" no iOS abre sem a barra do navegador. O manifesto vem de app/manifest.ts.
  appleWebApp: {
    capable: true,
    title: "Sweet Way",
    statusBarStyle: "black",
  },
};

export const viewport: Viewport = {
  themeColor: "#f6f3fb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: o script abaixo pode pôr data-preferencia-tema no <html> antes do React
    <html lang="pt-BR" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTemaInicial }} />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
