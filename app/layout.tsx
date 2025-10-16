import type { Metadata } from 'next';
import { Exo } from 'next/font/google';
import './globals.css';
import Link from 'next/link';
import clsx from 'clsx';

const exo = Exo({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'] });

export const metadata: Metadata = {
  title: 'ZERO E UM Panorama Studio',
  description: 'Plataforma para criação de passeios virtuais com a identidade ZERO E UM.'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="bg-brand-lilac">
      <body className={clsx(exo.className, 'min-h-screen bg-brand-lilac/20 text-brand-teal')}>
        <header className="border-b border-brand-indigo/30 bg-brand-lilac/60 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-3">
              <span className="rounded bg-brand-cobalt px-4 py-2 text-2xl font-semibold tracking-widest text-white">0E1</span>
              <div className="flex flex-col">
                <span className="text-xs uppercase tracking-[0.3em] text-brand-indigo">ZERO E UM</span>
                <span className="text-sm text-brand-teal/80">Estúdio de passeios virtuais</span>
              </div>
            </Link>
            <div className="text-right text-sm uppercase tracking-[0.2em] text-brand-indigo">
              Projetos panorâmicos
            </div>
          </div>
        </header>
        <main className="mx-auto min-h-[calc(100vh-80px)] w-full max-w-6xl px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
