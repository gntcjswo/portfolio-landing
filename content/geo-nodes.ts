// C03 third layer: SEO·AEO·GEO improvement items as a node graph (12 nodes / 18 edges).
// x·y are normalised positions shared by the DOM labels and the GL projection.
// Labels for i ≥ 6 are hidden on mobile, so 0–5 hold the key items.
export const geoNodes: { label: string; x: number; y: number }[] = [
  { label: "진단 도구", x: 0.5, y: 0.12 },
  { label: "Title", x: 0.18, y: 0.26 },
  { label: "Canonical", x: 0.82, y: 0.24 },
  { label: "Open Graph", x: 0.3, y: 0.42 },
  { label: "구조화 데이터", x: 0.72, y: 0.44 },
  { label: "정의형 요약문", x: 0.12, y: 0.58 },
  { label: "질문형 콘텐츠", x: 0.4, y: 0.62 },
  { label: "시맨틱 마크업", x: 0.86, y: 0.6 },
  { label: "FAQ", x: 0.62, y: 0.72 },
  { label: "Breadcrumb", x: 0.22, y: 0.82 },
  { label: "최신성·수치·근거", x: 0.52, y: 0.88 },
  { label: "이미지 CLS", x: 0.84, y: 0.84 },
];

/** 18 edges (index pairs) — the diagnosis node links to the items, related items link to each other */
export const geoEdges: [number, number][] = [
  [0, 1], [0, 2], [0, 4], [0, 5], [1, 2], [1, 3],
  [2, 7], [3, 4], [4, 7], [4, 8], [4, 9], [5, 6],
  [6, 8], [5, 10], [6, 10], [7, 11], [9, 10], [0, 11],
];
