import type { Metadata } from "next";
import { headers } from "next/headers";
import "@fontsource/kanit/300.css";
import "@fontsource/kanit/400.css";
import "@fontsource/kanit/500.css";
import "@fontsource/kanit/600.css";
import "@fontsource/kanit/700.css";
import "@fontsource/kanit/800.css";
import "@fontsource/kanit/900.css";
import "./globals.css";
import "./editorial.css";
import "./editorial-motion.css";
import { LanguageProvider } from "./language";
import { ThemeProvider } from "./theme";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  const origin = host ? `${protocol}://${host}` : "http://localhost:3000";

  return {
    title: "LIUKER — Video Creator",
    description:
      "Film, motion design and AI/CGI work by LIUKER.",
    openGraph: {
      title: "LIUKER — Video Creator",
      description: "Selected moving-image work, process and experience.",
      type: "website",
      images: [{ url: `${origin}/og.png`, width: 1536, height: 1024 }],
    },
    twitter: {
      card: "summary_large_image",
      title: "LIUKER — Video Creator",
      description: "Selected moving-image work, process and experience.",
      images: [`${origin}/og.png`],
    },
    icons: { icon: "/og.png" },
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('portfolio-theme');t=t==='light'||t==='dark'?t:'dark';document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t}catch(e){}",
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
