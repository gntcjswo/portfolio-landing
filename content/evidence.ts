// C08 "경력 기록" cards: 경력 8 · 대기업 8 · 기술 8.
// The group decides the card style (C08Proof groupClass / Seal) and the ProofRail tabs.
// Keep each group contiguous (a tab jumps to the group's first index).
export type EvidenceGroup = "경력" | "대기업" | "기술";

export type Evidence = {
  no: string;
  group: EvidenceGroup;
  title: string;
  body?: string;
  source: string;
  /** self-reported figure */
  selfReported?: boolean;
  /** text in the seal (≤ 3 chars) */
  mark?: string;
};

type Entry = Omit<Evidence, "no">;

const career: Entry[] = [
  { group: "경력", title: "셈웨어", mark: "'15", body: "2015.04 ~ 2016.11 · Web Publisher. HTML5 UI 개발과 웹 표준 마크업, 웹·인쇄 디자인, 제품 영상 제작", source: "포트폴리오 경력" },
  { group: "경력", title: "앤드오어", mark: "'17", body: "2017.02 ~ 2017.07 · Web Publisher. HTML·웹표준·접근성 코딩, 반응형 웹사이트 신규 퍼블리싱·리뉴얼", source: "포트폴리오 경력" },
  { group: "경력", title: "와일리·아이스캔디·앤에이앤", mark: "'17", body: "2017.08 ~ 2018.10 · 프리랜서. 원빌딩 시스템, 디지털 교과서, 은행 내부 운영리스크 관리 페이지 퍼블리싱", source: "포트폴리오 경력" },
  { group: "경력", title: "미르나인", mark: "'18", body: "2018.11 ~ 2024.04 · Web Publisher. 반응형 퍼블리싱, GSAP 공통 애니메이션 라이브러리 구축", source: "포트폴리오 경력" },
  { group: "경력", title: "내담씨앤씨", mark: "'24", body: "2024.05 ~ 2024.08 · 프리랜서. 한국미스미 React 전환, Next.js·TypeScript UI 컴포넌트와 스토리북", source: "포트폴리오 경력" },
  { group: "경력", title: "미르나인 (프리랜서)", mark: "'24", body: "2024.09 ~ 2024.12 · Web Publisher. 웹 에이전시 퍼블리싱 전문 업무", source: "포트폴리오 경력" },
  { group: "경력", title: "모바일웍스코리아", mark: "'25", body: "2025.01 ~ 2026.04 · Frontend Developer / Web Publisher. 대기업 웹/앱 퍼블리싱, PM, CI/CD 구축", source: "포트폴리오 경력" },
  { group: "경력", title: "라온비엔피", mark: "'26", body: "2026.06 ~ 재직 중 · 퍼블리싱팀 과장. 자사 홈페이지 SEO·AEO·GEO 개선, Vue.js 고도화, 퍼블리싱 빌드 환경 구축", source: "포트폴리오 경력" },
];

const enterprise: Entry[] = [
  { group: "대기업", title: "SKT X Caliber 수의 진단 플랫폼", source: "2025.01 ~ 2025.10" },
  { group: "대기업", title: "SKT 에이닷 펫 프론트 UI", source: "2025.07 ~ 2025.12" },
  { group: "대기업", title: "SKT 에이닷 펫 관리자 UI", source: "2025.08 ~ 2025.12" },
  { group: "대기업", title: "기아 비즈 FMS/IMS 웹·태블릿", source: "2025.02 ~ 2025.12" },
  { group: "대기업", title: "하나카드 BIZ PC 채널 리뉴얼", source: "2025.02 ~ 2025.07" },
  { group: "대기업", title: "하나카드 나라사랑카드 모바일 웹", source: "2025.09 ~ 2025.11" },
  { group: "대기업", title: "현대자동차 EV Charging 웹뷰", source: "2025.01 ~ 2025.03" },
  { group: "대기업", title: "한국미스미 이커머스 React 전환", source: "2024.05 ~ 2024.08" },
];

const skills: Entry[] = [
  { group: "기술", title: "시맨틱 & 웹 접근성", mark: "01", body: "시맨틱 마크업과 웹 접근성 인증 경험을 바탕으로 보편적 웹 환경을 구축합니다.", source: "포트폴리오 About Me" },
  { group: "기술", title: "고도화된 스타일링", mark: "02", body: "CSS 전처리기와 DRY 원칙으로 재사용성을 높이고, Tailwind·Bootstrap을 프로젝트에 맞게 설정합니다.", source: "포트폴리오 About Me" },
  { group: "기술", title: "인터랙티브 애니메이션", mark: "03", body: "GSAP·AOS·Lottie로 인터랙션을 구현하고, 직접 만든 공통 애니메이션 라이브러리를 사용합니다.", source: "포트폴리오 About Me" },
  { group: "기술", title: "크로스 브라우징 전략", mark: "04", body: "IE를 포함한 크로스 브라우징을 수행하고, Babel 중심 호환 빌드로 대규모 리팩토링을 했습니다.", source: "포트폴리오 About Me" },
  { group: "기술", title: "리액트 에코시스템", mark: "05", body: "TypeScript 기반 React에서 UI 컴포넌트를 만들고, Zustand·Redux·TanStack Query를 씁니다.", source: "포트폴리오 About Me" },
  { group: "기술", title: "SEO·AEO·GEO 개선", mark: "06", body: "진단 도구로 분석해 Title·Canonical·Open Graph와 FAQ 구조화 데이터를 고치고 진단 점수를 높였습니다.", source: "포트폴리오 경력" },
  { group: "기술", title: "자동화 파이프라인", mark: "07", body: "Node.js 기반 퍼블리싱 빌드·배포 환경을 직접 설계하고, GitHub Actions CI/CD를 구축했습니다.", source: "포트폴리오 경력" },
  { group: "기술", title: "AI 기반 생산성 혁신", mark: "08", body: "Claude Code·Cursor를 주력으로 여러 모델 CLI와 Figma·PixelLab MCP를 연결해, 5~7일 걸리던 업무를 1~2일로 줄였습니다.", source: "작업 환경 (본인 기재)", selfReported: true },
];

export const evidence: Evidence[] = [...career, ...enterprise, ...skills].map((e, i) => ({
  ...e,
  no: `E-${String(i + 1).padStart(2, "0")}`,
}));

export const evidenceGroups: EvidenceGroup[] = ["경력", "대기업", "기술"];
/** Tab labels (cards keep the short group name) */
export const evidenceGroupLabel: Record<EvidenceGroup, string> = { 경력: "경력", 대기업: "대기업 프로젝트", 기술: "기술" };
export const groupStartIndex = (g: EvidenceGroup) => evidence.findIndex((e) => e.group === g);
