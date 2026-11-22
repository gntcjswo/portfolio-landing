export type ChapterId =
  | "q"
  | "shift"
  | "layers"
  | "index"
  | "scroll-through"
  | "pipeline"
  | "ai-dev"
  | "proof"
  | "start"
  | "ask"
  | "contact";

export type SceneId = "hall" | "layers" | "index" | "showcase" | "generator";
export type Tone = "paper" | "paper-2" | "night" | "signal";

export type Chapter = {
  id: ChapterId;
  no: string;
  /** Rail / palette label */
  name: string;
  tone: Tone;
  /** GL scene shown while this chapter is active (null = canvas sleeps) */
  scene: SceneId | null;
  /** Desktop section height / scrub distance in svh. null = free height */
  H: number | null;
  S: number | null;
};

export const chapters: Chapter[] = [
  { id: "q", no: "01", name: "작업 갤러리", tone: "night", scene: "hall", H: 400, S: 300 },
  { id: "shift", no: "02", name: "작업 원칙", tone: "paper", scene: null, H: 260, S: 160 },
  { id: "layers", no: "03", name: "SEO·AEO·GEO", tone: "paper", scene: "layers", H: 420, S: 320 },
  { id: "index", no: "04", name: "작업 색인", tone: "paper-2", scene: "index", H: 240, S: 140 },
  { id: "scroll-through", no: "05", name: "대표 작업", tone: "night", scene: "showcase", H: 520, S: 420 },
  { id: "pipeline", no: "06", name: "작업 방식", tone: "signal", scene: null, H: 420, S: 320 },
  { id: "ai-dev", no: "07", name: "AI 활용 개발", tone: "night", scene: "generator", H: 340, S: 240 },
  { id: "proof", no: "08", name: "경력 기록", tone: "paper", scene: null, H: null, S: null },
  { id: "start", no: "09", name: "역할과 성장", tone: "paper", scene: null, H: null, S: null },
  { id: "ask", no: "10", name: "자주 묻는 질문", tone: "paper-2", scene: null, H: null, S: null },
  { id: "contact", no: "11", name: "마무리", tone: "night", scene: null, H: null, S: null },
];

export const chapterById = Object.fromEntries(chapters.map((c) => [c.id, c])) as Record<ChapterId, Chapter>;
