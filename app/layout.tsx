import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./chrome.css";
import "./chapters.css";
import { jsonLd, meta } from "@/content/seo";
import { SITE_URL, links } from "@/content/links";

export const metadata: Metadata = {
  title: meta.title,
  description: meta.description,
  keywords: meta.keywords,
  applicationName: meta.siteName,
  authors: [{ name: "우성", url: links.github }],
  creator: "우성",
  publisher: "우성",
  formatDetection: { telephone: false },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#f2f0e9",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const og = SITE_URL ? `${SITE_URL}/${meta.ogImage}` : `./${meta.ogImage}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script
          // ?debug records console errors in window.__errs (runs before first paint).
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html:
              "try{var d=document.documentElement;if(/[?&]debug/.test(location.search)){var E=window.__errs=[],c=console.error,w=console.warn;console.error=function(){E.push('E '+[].map.call(arguments,String).join(' '));c.apply(console,arguments)};console.warn=function(){E.push('W '+[].map.call(arguments,String).join(' '));w.apply(console,arguments)};addEventListener('error',function(e){E.push('X '+e.message)})}}catch(e){}",
          }}
        />
        <link rel="preload" href="./fonts/Paperlogy-5Medium.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="./fonts/Paperlogy-7Bold.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="icon" href="./media/img/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="./media/img/apple-touch-icon.png" />
        {SITE_URL ? <link rel="canonical" href={`${SITE_URL}/`} /> : null}
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="ko_KR" />
        <meta property="og:site_name" content={meta.siteName} />
        <meta property="og:title" content={meta.title} />
        <meta property="og:description" content={meta.description} />
        <meta property="og:image" content={og} />
        <meta property="og:image:width" content={String(meta.ogWidth)} />
        <meta property="og:image:height" content={String(meta.ogHeight)} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={meta.title} />
        <meta name="twitter:description" content={meta.description} />
        <meta name="twitter:image" content={og} />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd()).replace(/</g, "\\u003c") }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
