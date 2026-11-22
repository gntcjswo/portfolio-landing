// FAQ: C10 question index, CommandPalette and the JSON-LD FAQPage.
// no = exactly two digits (deep link #ask-NN); keep answers short, conclusion first.
export const faqCategories = ["전체", "소개", "경력", "기술", "검색 최적화", "일하는 방식"] as const;

export type FaqCategory = Exclude<(typeof faqCategories)[number], "전체">;

/** Dot colour per category (reuses the ink/entity/signal/marker/line tokens) */
export const faqCategoryTone: Record<FaqCategory, "ink" | "marker" | "entity" | "signal" | "line"> = {
  소개: "ink",
  경력: "signal",
  기술: "entity",
  "검색 최적화": "marker",
  "일하는 방식": "line",
};

export type FaqItem = {
  no: string;
  category: FaqCategory;
  q: string;
  a: string;
  body: string[];
};

export const faq: FaqItem[] = [
  {
    no: "01",
    category: "소개",
    q: "어떤 역할을 맡을 수 있나요?",
    a: "웹 퍼블리싱과 인터랙션 개발이 중심이고, React·Vue 화면 개발과 SEO·AEO·GEO 개선까지 맡습니다.",
    body: [
      "웹 퍼블리싱: PC 전용 웹페이지는 물론 모바일 앱 전용, 반응형 웹페이지를 제작하며 기본적인 인터랙션은 항상 포함합니다.",
      "인터랙션 개발: 마우스 오버 시 간단한 전환 효과부터 키 프레임 단위 애니메이션까지 웹에서 표현 가능한 인터랙션을 구현합니다.",
      "프론트엔드 개발: React·Vue로 화면을 개발하고, Vue.js 서비스의 신규 화면·기능 개선과 운영 이슈에 대응해 왔습니다.",
    ],
  },
  {
    no: "02",
    category: "경력",
    q: "경력은 얼마나 되나요?",
    a: "2015년 4월부터 웹 퍼블리셔로 일했습니다. 2026년 11월 기준 11년 7개월입니다.",
    body: [
      "셈웨어에서 시작해 앤드오어와 프리랜서 퍼블리싱을 거쳐, 미르나인에서 5년 6개월 동안 웹 에이전시 퍼블리싱을 맡았습니다. 이 기간에 신규 구축 300건 이상, 유지보수 400건 이상의 프로젝트에 참여했습니다.",
      "2024년부터 내담씨앤씨(프리랜서)와 모바일웍스코리아에서 React 기반 프론트엔드 개발과 대기업 프로젝트 퍼블리싱을 했습니다.",
      "2026년 6월부터 라온비엔피 퍼블리싱팀 과장으로 일하고 있습니다.",
    ],
  },
  {
    no: "03",
    category: "경력",
    q: "지금은 어떤 일을 하고 있나요?",
    a: "라온비엔피 퍼블리싱팀에서 자사 홈페이지 유지보수와 검색 최적화, 신규 웹 프로젝트를 맡고 있습니다.",
    body: [
      "자사 홈페이지의 오류를 고치고 신규 페이지를 구축하며, UI 인터랙션을 고도화하고 있습니다.",
      "Claude Code·Cursor 등 AI 도구로 신규 웹 프로젝트를 설계·구현하고, Vue.js 프로젝트의 신규 페이지·리뉴얼과 기능 개선을 맡고 있습니다.",
      "Next.js·Vue.js로 해외 웹 어워드 사이트 레퍼런스를 분석해 UI·인터랙션을 구현하고, 회사 영업용 포트폴리오를 구축했습니다.",
    ],
  },
  {
    no: "04",
    category: "검색 최적화",
    q: "SEO·AEO·GEO는 무엇을 개선했나요?",
    a: "진단 도구로 사이트를 분석하고 메타 정보·구조화 데이터·콘텐츠를 고쳐 진단 점수를 높였습니다.",
    body: [
      "SEO: Title, Canonical, Open Graph, Breadcrumb, 시맨틱 마크업 등 검색엔진 최적화 요소를 개선했습니다.",
      "AEO·GEO: 질문형 콘텐츠, 정의형 요약문, 최신성·수치·근거 정보, FAQ 구조화 데이터를 개선했습니다.",
      "이미지에 width·height와 loading=\"lazy\"를 적용해 CLS와 로딩 성능을 개선했습니다.",
    ],
  },
  {
    no: "05",
    category: "경력",
    q: "대기업 프로젝트 경험이 있나요?",
    a: "네. SKT·기아·하나카드·현대자동차 프로젝트에서 웹/앱 퍼블리싱과 UI 구현을 맡았습니다.",
    body: [
      "SKT DX Cloud 수의 진단 플랫폼 X Caliber, SKT 에이닷 펫 프론트·관리자 UI.",
      "기아 비즈 FMS/IMS 웹·태블릿, 현대자동차 글로벌 EV Charging 웹뷰.",
      "하나카드 BIZ PC 채널 리뉴얼, 하나카드 나라사랑카드 모바일 웹, 한국미스미 이커머스 React 전환.",
    ],
  },
  {
    no: "06",
    category: "기술",
    q: "주로 쓰는 기술은 무엇인가요?",
    a: "HTML·CSS(SCSS)·JavaScript가 기본이고, React·TypeScript·Vue와 GSAP·Lottie를 씁니다.",
    body: [
      "마크업·스타일: HTML5, CSS3, SCSS, Tailwind CSS, Bootstrap, Material UI.",
      "스크립트·프레임워크: JavaScript, TypeScript, React, Vue, Next.js, jQuery, jQuery UI, Node.js.",
      "도구: Git, GitHub Actions, Gulp, Figma, Lottie, Photoshop, Illustrator, After Effects, Claude Code, Cursor.",
    ],
  },
  {
    no: "07",
    category: "기술",
    q: "인터랙션은 어떻게 구현하나요?",
    a: "CSS와 GSAP·Lottie를 조합하고, 공통 애니메이션 라이브러리로 표준화합니다.",
    body: [
      "CSS와 GSAP, Lottie 등을 조합해 생동감 있는 애니메이션을 구현해 왔습니다.",
      "GSAP ScrollTrigger 기반 공통 애니메이션 라이브러리를 직접 구축해 사용합니다.",
      "Intersection Observer 기반 Lazy Loading을 적용하고, 미지원 환경에는 스크롤 이벤트 폴백을 넣어 안정적으로 로딩되게 했습니다.",
    ],
  },
  {
    no: "08",
    category: "기술",
    q: "웹 접근성과 구형 브라우저도 대응하나요?",
    a: "네. 노후 사이트 5곳을 개선해 웹 접근성 품질인증 마크를 취득했고, IE 호환 빌드도 구축했습니다.",
    body: [
      "국가유산 방문 캠페인, 한국문화예술위원회, 한국벤처투자, 승강기교육센터, 국기원 사이트를 웹 표준·접근성 기준으로 개선했습니다.",
      "금융권 프로젝트에서 Babel 중심 호환 빌드를 새로 구축하고 전체 리팩토링을 진행해, ES6 코드를 IE에서도 구동했습니다.",
      "하나카드 BIZ에서는 ARIA 속성과 키보드 포커스 흐름을 반영했고, 지금은 웹 접근성 인증 사이트의 유지보수·고도화를 맡고 있습니다.",
    ],
  },
  {
    no: "09",
    category: "일하는 방식",
    q: "AI 도구는 어떻게 쓰나요?",
    a: "Claude Code와 Cursor를 주력으로 쓰고, 여러 모델 CLI와 MCP를 연결해 개발합니다.",
    body: [
      "Claude Code와 Cursor를 주력 도구로 쓰고, Gemini·Cursor·Claude·ChatGPT CLI를 설치해 작업에 맞게 함께 사용합니다.",
      "Paseo로 여러 모델을 제어하고, Grok 봇이 오케스트레이터로 작업을 나눕니다. Figma MCP, PixelLab MCP 등 MCP를 연결해 개발합니다.",
      "Paseo·Hermes·Grok 봇·Tailscale을 결합해, 업무 시스템의 효율을 높이는 방법을 계속 연구하고 있습니다.",
      "요구사항으로 UI 구조와 기능을 먼저 정의하고, AI가 만든 코드는 구조와 안정성을 검토·수정·디버깅한 뒤 적용합니다.",
    ],
  },
  {
    no: "10",
    category: "일하는 방식",
    q: "AI로 개발 속도가 얼마나 달라졌나요?",
    a: "AI 코딩 과정을 체계화해, 5~7일 걸리던 업무를 1~2일로 줄였습니다.",
    body: [
      "구조·기능 정의, 규칙 설계, 멀티 모델 구현, 검토·디버깅, 품질 개선의 순서로 AI 코딩 과정을 체계화했습니다.",
      "그 결과 예전에 5~7일 걸리던 업무를 1~2일로 줄였습니다.",
      "3~4개 프로젝트를 동시에 진행하기 때문에, 1~2일이면 웹사이트 3~4개가 완성됩니다.",
      "라온비엔피에서는 재사용 가능한 퍼블리싱 템플릿과 Node.js 개발환경, 명령어 기반 빌드·배포 자동화를 직접 설계해 반복 작업을 줄였습니다.",
    ],
  },
];
