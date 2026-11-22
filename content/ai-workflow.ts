// C07 "AI 활용 개발" data: A = workflow steps + input stills, B = example Q&A, keyword chips, side projects.

/** Exactly 5 steps (STEP_AT and CSS nth-child depend on it). */
export const workflowSteps = ["구조·기능 정의", "규칙 설계", "멀티 모델 구현", "검토·디버깅", "품질 개선"] as const;

/** 5 input stills from the work index (pfImage 480²), flown into the frame by the Generator scene. */
export const workflowStills = [
  { id: 14, name: "FORMA" },
  { id: 98, name: "포원솔루션" },
  { id: 99, name: "디무브" },
  { id: 41, name: "PRIBIT" },
  { id: 93, name: "아트에이브이" },
];

/** One-line working rule, revealed token by token. */
export const workflowRule = "시맨틱 마크업, 웹 접근성, 크로스 브라우징을 지킵니다.";
/** Caption over the 9:16 frame. */
export const workflowCaption = "규칙대로, 끝까지.";

export type ChatQA = { q: string; a: string[] };

/** Exactly 4 example questions, two sentences each. */
export const chatQA: ChatQA[] = [
  {
    q: "인터랙션은 어떻게 만드나요?",
    a: ["CSS와 GSAP·Lottie를 조합해 구현하고,", "직접 만든 공통 애니메이션 라이브러리를 사용합니다."],
  },
  {
    q: "가장 어려웠던 과제는요?",
    a: ["금융권 ES6 코드를 IE에서 구동해야 했습니다.", "Babel 호환 빌드를 새로 구축하고 전체 리팩토링으로 해결했습니다."],
  },
  {
    q: "AI로 개발 속도가 얼마나 달라졌나요?",
    a: ["AI 코딩 과정을 체계화해, 5~7일 걸리던 업무를 1~2일로 줄였습니다.", "3~4개 프로젝트를 동시에 진행해, 1~2일이면 웹사이트 3~4개를 완성합니다."],
  },
  {
    q: "어떤 AI 도구를 쓰나요?",
    a: ["Claude Code와 Cursor를 주력으로 쓰고, 여러 모델 CLI와 Figma·PixelLab MCP를 연결합니다.", "Paseo·Hermes·Grok 봇·Tailscale을 결합해, 업무 시스템의 효율을 높이는 방법을 계속 연구합니다."],
  },
];

/** Keyword chips (key has no spaces — it is used in an id). */
export const chatKeywords = [
  { key: "CLAUDE-CODE", tip: "주력 도구. 설계부터 구현·검증까지 터미널에서 진행합니다." },
  { key: "CURSOR", tip: "주력 에디터. 규칙(Rules)으로 코드 스타일과 품질을 맞춥니다." },
  { key: "MULTI-CLI", tip: "Gemini·Claude·ChatGPT·Cursor CLI를 작업에 맞게 골라 씁니다." },
  { key: "ORCHESTRATOR", tip: "Paseo로 여러 모델을 제어하고, Grok 봇이 작업을 나눕니다." },
  { key: "MCP", tip: "Figma·PixelLab MCP 등을 연결해 개발합니다." },
];

/** 5 side projects (name / main tech). */
export const sideProjects = [
  { name: "Design Me", tech: "SCSS·GSAP" },
  { name: "날씨 앱", tech: "React·API" },
  { name: "스타터", tech: "npx CLI" },
  { name: "포트폴리오", tech: "Next.js·R3F" },
  { name: "Launcher", tech: "Firebase" },
];
