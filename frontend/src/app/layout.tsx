import type { Metadata, Viewport } from "next";
import { Figtree, Fredoka } from "next/font/google";
import "../styles/globals.css";

// Fredoka: títulos arredondados, na linha do lettering do logo. Figtree: texto corrido, muito legível no celular.
const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sweet Way English",
  description:
    "Aprenda inglês de um jeito doce e eficiente. Plataforma que conecta professores e alunos.",
  icons: {
    icon: "/logo-sweet.png",
    shortcut: "/logo-sweet.png",
    apple: "/logo-sweet.png",
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
    <html lang="pt-BR">
      <body className={`${fredoka.variable} ${figtree.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
