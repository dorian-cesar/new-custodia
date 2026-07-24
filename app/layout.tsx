import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { DbInitProvider } from "@/components/DbInitProvider";
import { AuthWrapper } from "@/components/auth-wrapper";
import { VirtualKeyboard } from "@/components/ui/virtual-keyboard";
import "./globals.css";

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Custodia - Sistema de Control de Casilleros",
  description: "Sistema de custodia de maletas y bolsos para terminales",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('theme') || 'dark';
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              })()
            `,
          }}
        />
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <DbInitProvider>
          <AuthWrapper>
            {children}
            <VirtualKeyboard />
          </AuthWrapper>
        </DbInitProvider>
      </body>
    </html>
  );
}
