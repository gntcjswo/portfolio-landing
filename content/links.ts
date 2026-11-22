// All external links live here.
export const SITE_URL = ""; // production origin (canonical, absolute og:image, JSON-LD url); empty = relative paths, no canonical

export const links = {
  github: "https://github.com/gntcjswo",
  portfolioReact: "http://woosung-portfolio.woobi.co.kr/",
  portfolioLegacy: "http://base-css.woobi.co.kr/",
  repoLegacy: "https://github.com/gntcjswo/portfolio",
} as const;

export const sns = [{ name: "GitHub", href: links.github, icon: "media/img/sns/ico_github.svg" }] as const;

export const footerLinks = [
  {
    title: "포트폴리오",
    items: [
      { label: "React 포트폴리오", href: links.portfolioReact },
      { label: "레거시 포트폴리오", href: links.portfolioLegacy },
      { label: "레거시 저장소", href: links.repoLegacy },
    ],
  },
  {
    title: "개인 프로젝트",
    items: [
      { label: "실시간 날씨 조회 앱", href: "https://yws-weather-app.netlify.app/" },
      { label: "돕범 근무표", href: "https://wb-schedule.netlify.app/" },
      { label: "Cursor Launcher", href: "https://cursor-launcher.netlify.app/" },
    ],
  },
  {
    title: "GitHub",
    items: [
      { label: "gntcjswo", href: links.github },
      { label: "basic-starter", href: "https://github.com/gntcjswo/basic-starter" },
      { label: "weather-app", href: "https://github.com/gntcjswo/weather-app" },
      { label: "wb-schedule", href: "https://github.com/gntcjswo/wb-schedule" },
    ],
  },
] as const;
