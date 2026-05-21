import type { Metadata } from "next";
import "./globals.css";
import { getLang } from "@/lib/i18n/server";
import { LANG_TAG } from "@/lib/i18n/dict";
import { LanguageProvider } from "@/lib/i18n/client";


export const metadata: Metadata = {
  title: "English Coach",
  description:
    "Narrative-skeleton-driven English remix coach, grounded in New Concept English.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lang = await getLang();
  return (
    <html
      lang={LANG_TAG[lang]}
      className="dark h-full antialiased"
    >
      <body className="min-h-full flex flex-col bg-background text-foreground font-mono">
        <LanguageProvider lang={lang}>{children}</LanguageProvider>
      </body>
    </html>
  );
}
