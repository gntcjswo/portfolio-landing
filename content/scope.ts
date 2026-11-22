// C09 "역할과 성장" data.
//   roleTiers    → A: role scope in 3 steps (since = first year of that work, areas = cumulative skill cells)
//   careerRanges → B: career timeline (years; fractional part = month / 12)
//   toolChips / teamSteps → C: tool chips and six things I can do on a team

/** Role scope in 3 steps. areas = cumulative skill cells (5 → 8 → 13). */
export const roleTiers: { step: number; name: string; since: number; sinceLabel: string; areas: number }[] = [
  { step: 1, name: "웹 퍼블리싱", since: 2015, sinceLabel: "2015년부터", areas: 5 },
  { step: 2, name: "인터랙션 개발", since: 2018, sinceLabel: "2018년부터", areas: 8 },
  { step: 3, name: "프론트엔드·검색 최적화", since: 2024, sinceLabel: "2024년부터", areas: 13 },
];

/** 13 cells, one skill each. tier = the step where the skill was added. */
export const scopeItems: { name: string; tier: 1 | 2 | 3 }[] = [
  { name: "시맨틱 마크업", tier: 1 },
  { name: "웹 표준·접근성", tier: 1 },
  { name: "반응형 레이아웃", tier: 1 },
  { name: "크로스 브라우징", tier: 1 },
  { name: "SCSS 구조화", tier: 1 },
  { name: "GSAP 인터랙션", tier: 2 },
  { name: "Lottie·SVG 모션", tier: 2 },
  { name: "공통 애니메이션 라이브러리", tier: 2 },
  { name: "React·TypeScript", tier: 3 },
  { name: "Vue.js", tier: 3 },
  { name: "빌드·배포 자동화", tier: 3 },
  { name: "SEO·AEO·GEO", tier: 3 },
  { name: "AI 활용 개발", tier: 3 },
];

/** Career periods (from/to = year, month / 12). to = null → open arrow (current). Keep 4 entries (CSS nth-child(n+3) flips labels). */
export const careerRanges = [
  { name: "셈웨어·앤드오어", from: 2015.25, to: 2017.58, note: "디자인·퍼블리싱, 웹표준·접근성 코딩" },
  { name: "프리랜서 퍼블리싱", from: 2017.58, to: 2018.83, note: "원빌딩·디지털 교과서·은행 내부 페이지" },
  { name: "미르나인", from: 2018.83, to: 2024.33, note: "반응형·인터랙션, GSAP 공통 라이브러리" },
  { name: "프론트엔드 개발", from: 2024.33, to: null, note: "내담씨앤씨·모바일웍스코리아·라온비엔피" },
] as const;

/** Axis tick labels (years); the axis spans YEAR_MIN 2015 → YEAR_MAX 2027 in C09Start. */
export const rulerTicks = [2015, 2018, 2021, 2024, 2026];

/** C block chips — development and collaboration tools. */
export const toolChips = ["Git", "GitHub Actions", "Node.js", "SCSS", "Claude Code", "Cursor", "Figma", "Jira"];

/** Exactly 6 entries (CSS repeat(6), the gauge uses --g * 5). */
export const teamSteps = [
  { name: "표준화", text: "재사용 퍼블리싱 템플릿과 규칙을 설계합니다." },
  { name: "자동화", text: "명령어 기반 빌드와 서버 배포를 자동화합니다." },
  { name: "공통 UI", text: "공통 UI와 확장 가능한 인터랙션을 만듭니다." },
  { name: "고도화", text: "Vue.js 서비스의 화면과 기능을 개선합니다." },
  { name: "최적화", text: "SEO·AEO·GEO 진단 결과로 페이지를 고칩니다." },
  { name: "AI 개발", text: "AI가 만든 코드를 검토·수정·디버깅합니다." },
];
