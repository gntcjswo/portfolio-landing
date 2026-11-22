// C06 "작업 방식": 5 stations. lines is exactly 3 (tuple type).
// video = a recorded clip of that work (media/video/pf/p-NNN.mp4).
export type Station = {
  no: string;
  title: string;
  latin: string;
  lines: [string, string, string];
  video: { id: number; name: string };
};

export const stations: Station[] = [
  {
    no: "01",
    title: "시안 분석·구조 설계",
    latin: "Wireframe · Requirements · Design Files",
    lines: ["와이어프레임·요구사항 기반 구조 정리", "Photoshop·XD·Figma 시안 해석", "컴포넌트 단위 분리·규칙 정의"],
    video: { id: 21, name: "제이오텍(JEIOtech)" },
  },
  {
    no: "02",
    title: "시맨틱 마크업·스타일링",
    latin: "Semantic HTML · SCSS · Accessibility",
    lines: ["시맨틱 마크업·웹 접근성 준수", "SCSS 구조화와 DRY 원칙", "Tailwind·Bootstrap 초기 설정"],
    video: { id: 0, name: "코아시아씨엠(CoAsia CM)" },
  },
  {
    no: "03",
    title: "인터랙션 개발",
    latin: "GSAP · ScrollTrigger · Lottie",
    lines: ["GSAP·AOS·Lottie 애니메이션", "공통 애니메이션 라이브러리 구축", "Lazy Loading과 폴백 처리"],
    video: { id: 2, name: "토마스엔지니어링(TEC)" },
  },
  {
    no: "04",
    title: "반응형·크로스 브라우징",
    latin: "Responsive · Cross Browsing · IE",
    lines: ["PC·태블릿·모바일 반응형 레이아웃", "IE 포함 크로스 브라우징", "Babel 호환 빌드·리팩토링"],
    video: { id: 25, name: "터보윈(Turbowin)" },
  },
  {
    no: "05",
    title: "빌드·배포 자동화",
    latin: "Node.js · SCSS · Gulp · GitHub Actions",
    lines: ["Node.js 개발환경·HTML Include", "배포용 HTML 자동 생성·서버 배포", "Gulp 빌드·GitHub Actions CI/CD"],
    video: { id: 3, name: "샐러데이즈(Salad Days)" },
  },
];
