import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import { AchievementStandard, StepState } from "./domain";

// ─── 색상 상수 (PDF 양식 기준) ───────────────────────────────────────────────
const BG_SECTION = "8DB4E2"; // 섹션 타이틀 배경 (중간 파랑)
const BG_LABEL   = "D6E4F0"; // 행 레이블 배경 (연한 파랑)
const BG_SUBHEAD = "BDD7EE"; // 소제목 배경 (중간 연파랑)
const BG_WHITE   = "FFFFFF";

const BORDER_DEF = { style: BorderStyle.SINGLE, size: 4, color: "AAAAAA" };
const ALL_BORDERS = {
  top: BORDER_DEF, bottom: BORDER_DEF,
  left: BORDER_DEF, right: BORDER_DEF,
};

// ─── 헬퍼: 텍스트 → Paragraph 배열 (줄바꿈 처리) ────────────────────────────
function paras(text: string, bold = false, align: "left" | "center" | "right" = "left"): Paragraph[] {
  const alignMap = { left: AlignmentType.LEFT, center: AlignmentType.CENTER, right: AlignmentType.RIGHT };
  const lines = (text || "").split("\n");
  return lines.map((line) =>
    new Paragraph({
      alignment: alignMap[align],
      children: [new TextRun({ text: line || " ", bold, size: 20, font: "맑은 고딕" })],
    })
  );
}

// ─── 헬퍼: TableCell 생성 ──────────────────────────────────────────────────
type CellOpts = {
  bg?: string;
  bold?: boolean;
  colSpan?: number;
  rowSpan?: number;
  align?: "left" | "center" | "right";
  vAlign?: "top" | "center" | "bottom";
  width?: number; // percentage
};

function tc(text: string, opts: CellOpts = {}): TableCell {
  const {
    bg = BG_WHITE,
    bold = false,
    colSpan,
    rowSpan,
    align = "left",
    vAlign = "center",
    width,
  } = opts;
  const vAlignMap = { top: VerticalAlign.TOP, center: VerticalAlign.CENTER, bottom: VerticalAlign.BOTTOM };

  return new TableCell({
    children: paras(text, bold, align),
    shading: { type: ShadingType.SOLID, color: bg, fill: bg },
    verticalAlign: vAlignMap[vAlign],
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    borders: ALL_BORDERS,
    ...(colSpan ? { columnSpan: colSpan } : {}),
    ...(rowSpan ? { rowSpan } : {}),
    ...(width !== undefined ? { width: { size: width, type: WidthType.PERCENTAGE } } : {}),
  });
}

// ─── 헬퍼: 섹션 타이틀 테이블 ─────────────────────────────────────────────
function sectionTitle(num: number, title: string): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [
                  new TextRun({ text: `${num}  ${title}`, bold: true, size: 26, color: "1F3864", font: "맑은 고딕" }),
                ],
              }),
            ],
            shading: { type: ShadingType.SOLID, color: BG_SECTION, fill: BG_SECTION },
            margins: { top: 140, bottom: 140, left: 280, right: 280 },
            borders: ALL_BORDERS,
          }),
        ],
      }),
    ],
  });
}

function gap(): Paragraph {
  return new Paragraph({ children: [new TextRun({ text: " ", size: 14 })], spacing: { before: 60, after: 60 } });
}

// ─── 메인 export 함수 ─────────────────────────────────────────────────────
export async function generateDocx(
  steps: StepState,
  selectedStandards: AchievementStandard[],
): Promise<Blob> {
  const { step1, step2, step3, step4, step5, step6 } = steps;

  // ── Table 1: 프로젝트 개요 ─────────────────────────────────────────────
  const standards = selectedStandards.length > 0 ? selectedStandards : [null as null];
  const contentEntries = Object.entries(step2.contentElements ?? {});

  // rowSpan 계산: 관련 성취기준 = 1(header) + N(standards)
  const stdRowSpan = 1 + standards.length;
  // 내용 요소 = 항상 3행 (지식/과정/가치)
  const contentRowSpan = 3;

  const t1Rows: TableRow[] = [
    // 프로젝트 주제 행
    new TableRow({ children: [
      tc("프로젝트\n주제", { bg: BG_LABEL, bold: true, align: AlignmentType.CENTER, width: 14 }),
      tc(step1.projectTitle || "", { width: 48 }),
      tc("대상\n학년", { bg: BG_LABEL, bold: true, align: AlignmentType.CENTER, width: 12 }),
      tc(step1.targetGrade || "", { width: 26 }),
    ]}),
    // 핵심 아이디어 행
    new TableRow({ children: [
      tc("핵심\n아이디어", { bg: BG_LABEL, bold: true, align: AlignmentType.CENTER }),
      tc(step2.coreIdea || ""),
      tc("차시", { bg: BG_LABEL, bold: true, align: AlignmentType.CENTER }),
      tc(step2.operatingPeriod || ""),
    ]}),
    // 프로젝트 핵심 질문 행
    new TableRow({ children: [
      tc("프로젝트\n핵심 질문", { bg: BG_LABEL, bold: true, align: AlignmentType.CENTER }),
      tc(step3.essentialQuestion || "", { colSpan: 3 }),
    ]}),
    // 관련 성취기준 헤더 행
    new TableRow({ children: [
      tc("관련 성취기준\n(2022 개정\n교육과정)", { bg: BG_LABEL, bold: true, align: AlignmentType.CENTER, rowSpan: stdRowSpan }),
      tc("교과명", { bg: BG_SUBHEAD, bold: true, align: AlignmentType.CENTER }),
      tc("성취기준", { bg: BG_SUBHEAD, bold: true, align: AlignmentType.CENTER, colSpan: 2 }),
    ]}),
    // 성취기준 데이터 행
    ...standards.map((std) =>
      new TableRow({ children: [
        tc(std?.subject ?? "", { align: AlignmentType.CENTER }),
        tc(std ? `${std.achievementCode} ${std.achievementText}` : "", { colSpan: 2 }),
      ]})
    ),
    // 내용 요소 - 지식·이해 행 (rowSpan=3)
    new TableRow({ children: [
      tc("내용\n요소", { bg: BG_LABEL, bold: true, align: AlignmentType.CENTER, rowSpan: contentRowSpan }),
      tc("지식, 이해", { bg: BG_SUBHEAD, bold: true, align: AlignmentType.CENTER }),
      tc(
        contentEntries.map(([s, el]) => `[${s}] ${el.knowledge}`).join("\n") || "",
        { colSpan: 2 }
      ),
    ]}),
    // 내용 요소 - 과정·기능 행
    new TableRow({ children: [
      tc("과정, 기능", { bg: BG_SUBHEAD, bold: true, align: AlignmentType.CENTER }),
      tc(
        contentEntries.map(([s, el]) => `[${s}] ${el.process}`).join("\n") || "",
        { colSpan: 2 }
      ),
    ]}),
    // 내용 요소 - 가치·태도 행
    new TableRow({ children: [
      tc("가치, 태도", { bg: BG_SUBHEAD, bold: true, align: AlignmentType.CENTER }),
      tc(
        contentEntries.map(([s, el]) => `[${s}] ${el.value}`).join("\n") || "",
        { colSpan: 2 }
      ),
    ]}),
    // 핵심어
    new TableRow({ children: [
      tc("핵심어", { bg: BG_LABEL, bold: true, align: AlignmentType.CENTER }),
      tc(step3.keyWords || "", { colSpan: 3 }),
    ]}),
    // 핵심 문장
    new TableRow({ children: [
      tc("핵심 문장", { bg: BG_LABEL, bold: true, align: AlignmentType.CENTER }),
      tc(step3.keySentence || "", { colSpan: 3 }),
    ]}),
    // 탐구 질문
    new TableRow({ children: [
      tc("탐구 질문", { bg: BG_LABEL, bold: true, align: AlignmentType.CENTER }),
      tc(step3.inquiryQuestions || "", { colSpan: 3 }),
    ]}),
  ];

  const table1 = new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: t1Rows });

  // ── Table 2: 주요 활동 유목화 ──────────────────────────────────────────
  const activities = step4.activities.filter((a) => a.name?.trim());
  const actList = activities.length > 0 ? activities : [{ name: "", content: "", output: "" }];
  const actRowSpan = 1 + actList.length;

  const t2Rows: TableRow[] = [
    new TableRow({ children: [
      tc("주요 활동\n유목화", { bg: BG_LABEL, bold: true, align: AlignmentType.CENTER, rowSpan: actRowSpan, width: 14 }),
      tc("주제 및 활동명", { bg: BG_SUBHEAD, bold: true, align: AlignmentType.CENTER, width: 30 }),
      tc("활동 내용", { bg: BG_SUBHEAD, bold: true, align: AlignmentType.CENTER }),
    ]}),
    ...actList.map((act) =>
      new TableRow({ children: [
        tc(act.name || "", { align: AlignmentType.CENTER }),
        tc(act.content || ""),
      ]})
    ),
  ];

  const table2 = new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: t2Rows });

  // ── Table 3: 차시별 수업 계획 ──────────────────────────────────────────
  const lessons = step6.lessons ?? [];
  const lessonList = lessons.length > 0 ? lessons : [{ period: "", content: "", output: "" }];
  const lessonRowSpan = 1 + lessonList.length;

  const t3Rows: TableRow[] = [
    new TableRow({ children: [
      tc("차시별\n수업\n계획", { bg: BG_LABEL, bold: true, align: "center", rowSpan: lessonRowSpan, width: 8 }),
      tc("차시", { bg: BG_SUBHEAD, bold: true, align: "center", width: 8 }),
      tc("단계", { bg: BG_SUBHEAD, bold: true, align: "center", width: 10 }),
      tc("수업 내용(사고 및 탐구)", { bg: BG_SUBHEAD, bold: true, align: "center" }),
      tc("산출물", { bg: BG_SUBHEAD, bold: true, align: "center", width: 16 }),
      tc("관련교과", { bg: BG_SUBHEAD, bold: true, align: "center", width: 10 }),
    ]}),
    ...lessonList.map((l) =>
      new TableRow({ children: [
        tc(l.period ? `${l.period}차시` : "", { align: "center" }),
        tc((l as { stage?: string }).stage || "", { align: "center" }),
        tc(l.content || ""),
        tc(l.output || ""),
        tc((l as { relatedSubject?: string }).relatedSubject || "", { align: "center" }),
      ]})
    ),
  ];

  const table3 = new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: t3Rows });

  // ── Table 4: 학습으로서의 평가 계획 ────────────────────────────────────
  // 열: [수행평가(span)] [레이블] [상/값A] [중/값B] [하/값C]
  const rubric = (step5.rubric ?? []).filter((r) => r.element?.trim());
  const rubricList = rubric.length > 0 ? rubric : [{ element: "", high: "", mid: "", low: "" }];

  const evalTotalRows =
    1 + // 평가 요소 소제목
    2 + // 무엇/왜 평가하는가
    1 + // 평가 과제 소제목
    7 + // 과제명 + GRASPS 6개
    1 + // 평가 기준 소제목
    1 + // 루브릭 헤더
    rubricList.length; // 루브릭 데이터

  const graspsItems: [string, string][] = [
    ["Goal(목표)",       step5.graspsGoal     ?? ""],
    ["Role(역할)",       step5.graspsRole     ?? ""],
    ["Audience(청중)",   step5.graspsAudience ?? ""],
    ["Situation(상황)",  step5.graspsSituation ?? ""],
    ["Product(결과물)",  step5.graspsProduct  ?? ""],
    ["Standard(준거)",   step5.graspsStandard ?? ""],
  ];

  const t4Rows: TableRow[] = [
    // 평가 요소 소제목
    new TableRow({ children: [
      tc("수\n행\n평\n가", { bg: BG_LABEL, bold: true, align: AlignmentType.CENTER, rowSpan: evalTotalRows, width: 8, vAlign: VerticalAlign.CENTER }),
      tc("평가 요소", { bg: BG_SUBHEAD, bold: true, align: AlignmentType.CENTER, colSpan: 4 }),
    ]}),
    // 무엇을 평가하는가
    new TableRow({ children: [
      tc("무엇을\n평가하는가?", { bg: BG_LABEL, bold: true, align: AlignmentType.CENTER, width: 22 }),
      tc(step5.evaluationWhat || "", { colSpan: 3 }),
    ]}),
    // 왜 평가하는가
    new TableRow({ children: [
      tc("왜 평가하는가?\n(핵심문장 이해 확인)", { bg: BG_LABEL, bold: true, align: AlignmentType.CENTER }),
      tc(step5.evaluationWhy || "", { colSpan: 3 }),
    ]}),
    // 평가 과제 소제목
    new TableRow({ children: [
      tc("평가 과제", { bg: BG_SUBHEAD, bold: true, align: AlignmentType.CENTER, colSpan: 4 }),
    ]}),
    // 과제명
    new TableRow({ children: [
      tc("과제명", { bg: BG_LABEL, bold: true, align: AlignmentType.CENTER }),
      tc(step5.taskName || "", { colSpan: 3 }),
    ]}),
    // GRASPS 6개
    ...graspsItems.map(([label, value]) =>
      new TableRow({ children: [
        tc(label, { bg: BG_LABEL, bold: true, align: AlignmentType.CENTER }),
        tc(value, { colSpan: 3 }),
      ]})
    ),
    // 평가 기준 소제목
    new TableRow({ children: [
      tc("평가 기준", { bg: BG_SUBHEAD, bold: true, align: AlignmentType.CENTER, colSpan: 4 }),
    ]}),
    // 루브릭 헤더
    new TableRow({ children: [
      tc("평가요소", { bg: BG_SUBHEAD, bold: true, align: AlignmentType.CENTER, width: 22 }),
      tc("상", { bg: BG_SUBHEAD, bold: true, align: AlignmentType.CENTER }),
      tc("중", { bg: BG_SUBHEAD, bold: true, align: AlignmentType.CENTER }),
      tc("하", { bg: BG_SUBHEAD, bold: true, align: AlignmentType.CENTER }),
    ]}),
    // 루브릭 데이터
    ...rubricList.map((r) =>
      new TableRow({ children: [
        tc(r.element || "", { align: AlignmentType.CENTER }),
        tc(r.high || ""),
        tc(r.mid || ""),
        tc(r.low || ""),
      ]})
    ),
  ];

  const table4 = new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: t4Rows });

  // ── 문서 조립 ─────────────────────────────────────────────────────────
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "맑은 고딕", size: 20 },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, bottom: 720, left: 850, right: 850 },
          },
        },
        children: [
          sectionTitle(1, "프로젝트 개요"),
          gap(),
          table1,
          gap(),
          gap(),
          new Paragraph({ pageBreakBefore: true, children: [] }),
          table2,
          gap(),
          gap(),
          new Paragraph({ pageBreakBefore: true, children: [] }),
          table3,
          gap(),
          gap(),
          new Paragraph({ pageBreakBefore: true, children: [] }),
          sectionTitle(2, "학습으로서의 평가 계획"),
          gap(),
          table4,
        ],
      },
    ],
  });

  return Packer.toBlob(doc);
}
