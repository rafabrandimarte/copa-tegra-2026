import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Copa Tegra 2026 | Jogue, Pontue e Conquiste a Taça',
  description: 'Campanha de incentivo de vendas - Tegra Vendas',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="min-h-screen stadium-bg bg-field-pattern" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
