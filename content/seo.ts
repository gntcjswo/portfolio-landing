// Meta tags + JSON-LD (Person · WebSite · ProfilePage · FAQPage). FAQPage is generated from faq.ts.
import { faq } from "./faq";
import { SITE_URL, links } from "./links";

export const meta = {
  title: "웹 퍼블리셔 우성 | Web Publisher & Frontend Developer",
  description:
    "웹 퍼블리셔·프론트엔드 개발자 우성(WOOSUNG)의 포트폴리오입니다. 2015년부터 시맨틱 마크업과 인터랙션으로 기업 홈페이지와 SKT·기아·하나카드 서비스 화면을 만들었고, SEO·AEO·GEO 개선과 퍼블리싱 빌드 환경 구축을 해 왔습니다. Claude Code와 Cursor를 주력으로 AI 활용 개발을 합니다.",
  keywords:
    "웹 퍼블리셔, 프론트엔드 개발자, 우성, WOOSUNG, 포트폴리오, 웹 퍼블리싱, 인터랙션, GSAP, 반응형 웹, 웹 접근성, SEO, AEO, GEO, 구조화 데이터, React, TypeScript, Vue.js, Next.js, AI 활용 개발, Claude Code, Cursor",
  ogImage: "media/img/og/woosung_og.png",
  /** layout.tsx og:image width/height */
  ogWidth: 1200,
  ogHeight: 630,
  siteName: "WOOSUNG Portfolio",
};

const sameAs = [links.github, links.portfolioReact, links.portfolioLegacy];
const personId = `${SITE_URL}#person`;

/** Person (+ WebSite, ProfilePage, FAQPage). No phone, address, birth date or education. */
export function jsonLd() {
  const person = {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": personId,
    name: "우성",
    alternateName: ["WOOSUNG"],
    jobTitle: "Web Publisher & Frontend Developer",
    description:
      "2015년부터 시맨틱 마크업과 인터랙션으로 기업 홈페이지와 서비스 화면을 만들어 온 웹 퍼블리셔·프론트엔드 개발자. SEO·AEO·GEO 개선과 퍼블리싱 빌드·배포 환경 구축 경험이 있고, Claude Code·Cursor와 여러 모델 CLI·MCP를 연결해 AI 활용 개발을 합니다.",
    url: SITE_URL || undefined,
    image: SITE_URL ? `${SITE_URL}/${meta.ogImage}` : undefined,
    sameAs,
    knowsAbout: [
      "웹 퍼블리싱",
      "웹 접근성",
      "반응형 웹",
      "크로스 브라우징",
      "HTML5",
      "SCSS",
      "JavaScript",
      "TypeScript",
      "React",
      "Vue.js",
      "Next.js",
      "Node.js",
      "GSAP",
      "Lottie",
      "GitHub Actions",
      "SEO",
      "AEO",
      "GEO",
      "구조화 데이터",
      "AI-assisted Development",
      "Claude Code",
      "Cursor",
      "MCP (Model Context Protocol)",
    ],
  };
  return [
    person,
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: meta.siteName,
      alternateName: "웹 퍼블리셔 우성",
      url: SITE_URL || undefined,
      inLanguage: "ko-KR",
      author: { "@id": personId },
      publisher: { "@id": personId },
    },
    {
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      inLanguage: "ko-KR",
      /** freshness signal — update whenever the content changes */
      dateModified: "2026-11-22",
      url: SITE_URL || undefined,
      mainEntity: { "@id": personId },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: [f.a, ...f.body].join(" ") },
      })),
    },
  ];
}
