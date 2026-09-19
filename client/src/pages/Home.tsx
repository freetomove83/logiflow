/**
 * Design system: Operational Blueprint — restrained Swiss information design for a logistics command console.
 * Dense operational data is ordered through calm ivory surfaces, ink-navy type, and selective signal-teal actions.
 */
import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  ArrowDownRight,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Bell,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleCheck,
  CircleX,
  ClipboardList,
  Clock3,
  Copy,
  Download,
  Eye,
  ExternalLink,
  Filter,
  FileSpreadsheet,
  FilePenLine,
  FileText,
  FileVideo,
  Headphones,
  History,
  Inbox,
  LayoutDashboard,
  Landmark,
  KeyRound,
  Link2,
  LockKeyhole,
  LogOut,
  MapPin,
  Maximize2,
  MessageSquareText,
  MoreHorizontal,
  Package,
  PanelLeftClose,
  Paperclip,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Stamp,
  Trash2,
  Truck,
  UploadCloud,
  UserCheck,
  UserCog,
  UserRoundPlus,
  UsersRound,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { downloadAgreementPdf } from "@/lib/documentPdf";
import { toast } from "sonner";

type Role = "agency" | "shipper";
type View = "tickets" | "risk" | "sla" | "shippers" | "history" | "reports" | "settings";

type Ticket = {
  id: string;
  type: "파손/분실" | "배송지연" | "오배송" | "주소변경";
  company: string;
  tracking: string;
  recipient: string;
  time: string;
  status: "신규" | "처리중" | "답변완료";
  note: string;
  answer: string;
  openedBy: string;
  participantCount: number;
  assignee: string;
  compensation: "해당 없음" | "보상 대기" | "보상 검토" | "보상 승인";
};

type EvidenceCategory = "damage_photo" | "damage_video" | "price_proof";
type UploadStatus = "ready" | "uploading" | "success" | "error";
type EvidenceFile = {
  id: string;
  file: File;
  previewUrl?: string;
  progress: number;
  status: UploadStatus;
};

const evidenceRules: Record<
  EvidenceCategory,
  { maxFiles: number; maxBytes: number; accept: string[]; label: string }
> = {
  damage_photo: {
    maxFiles: 5,
    maxBytes: 7 * 1024 * 1024,
    accept: ["image/jpeg", "image/png", "image/webp"],
    label: "파손 사진",
  },
  damage_video: {
    maxFiles: 2,
    maxBytes: 30 * 1024 * 1024,
    accept: ["video/mp4", "video/quicktime"],
    label: "파손 영상",
  },
  price_proof: {
    maxFiles: 1,
    maxBytes: 7 * 1024 * 1024,
    accept: ["image/jpeg", "image/png", "image/webp"],
    label: "판매가 증빙 이미지",
  },
};

const formatFileSize = (bytes: number) =>
  `${(bytes / 1024 / 1024).toFixed(bytes < 1024 * 1024 ? 1 : 0)} MB`;
const readFileAsBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () =>
      reject(new Error("파일을 읽는 중 문제가 발생했습니다."));
    reader.readAsDataURL(file);
  });

const tickets: Ticket[] = [
  {
    id: "TK-89210",
    type: "파손/분실",
    company: "(주)에이블컴퍼니",
    tracking: "6012938192",
    recipient: "홍길동",
    time: "10분 전",
    status: "신규",
    note: "박스 손상 심함. 사진 첨부",
    answer: "용산지점 사고 접수 완료되었습니다. 내일 교환출고 부탁드립니다.",
    openedBy: "박지수 · CS 담당",
    participantCount: 3,
    assignee: "김대리 · 운영 2팀",
    compensation: "보상 검토",
  },
  {
    id: "TK-89204",
    type: "배송지연",
    company: "글로벌커머스",
    tracking: "6012938195",
    recipient: "이영희",
    time: "25분 전",
    status: "처리중",
    note: "출고 3일 경과 미배송",
    answer: "대전HUB 상하차 지연입니다. 금일 배송 여부를 확인 중입니다.",
    openedBy: "이현우 · 운영 매니저",
    participantCount: 2,
    assignee: "김대리 · 운영 2팀",
    compensation: "해당 없음",
  },
  {
    id: "TK-89192",
    type: "오배송",
    company: "마인드샵",
    tracking: "6012938101",
    recipient: "박철수",
    time: "1시간 전",
    status: "신규",
    note: "수령 상품과 주문 상품이 다릅니다.",
    answer: "수령 상품 확인 후 회수 접수를 안내드리겠습니다.",
    openedBy: "송예린 · 출고 담당",
    participantCount: 1,
    assignee: "미배정",
    compensation: "해당 없음",
  },
  {
    id: "TK-89183",
    type: "주소변경",
    company: "(주)에이블컴퍼니",
    tracking: "6012938144",
    recipient: "최민수",
    time: "2시간 전",
    status: "처리중",
    note: "배송 전 주소 변경 요청",
    answer: "배달 영업소에 주소 변경 가능 여부를 확인 중입니다.",
    openedBy: "최윤서 · 물류 담당",
    participantCount: 2,
    assignee: "이주임 · 수도권 배차팀",
    compensation: "해당 없음",
  },
  {
    id: "TK-89166",
    type: "배송지연",
    company: "올데이마켓",
    tracking: "6012938086",
    recipient: "한지수",
    time: "3시간 전",
    status: "답변완료",
    note: "집화 이후 상태 갱신 없음",
    answer: "간선 상차 처리되어 내일 오전 배송 예정입니다.",
    openedBy: "한서진 · CS 담당",
    participantCount: 2,
    assignee: "박매니저 · 사고 보상팀",
    compensation: "보상 대기",
  },
];

const agencyAssignees = [
  "김대리 · 운영 2팀",
  "박매니저 · 사고 보상팀",
  "이주임 · 수도권 배차팀",
  "미배정",
];

const ticketEvidencePreview = [
  {
    id: "damage-01",
    category: "파손 사진",
    name: "파손부위_01.jpg",
    detail: "JPG · 2.4 MB",
    tone: "photo",
  },
  {
    id: "damage-02",
    category: "파손 사진",
    name: "외부포장_02.jpg",
    detail: "JPG · 1.8 MB",
    tone: "photo",
  },
  {
    id: "video-01",
    category: "파손 영상",
    name: "개봉상태_영상.mp4",
    detail: "MP4 · 18.6 MB",
    tone: "video",
  },
  {
    id: "price-01",
    category: "판매가 증빙",
    name: "주문상세_판매가.png",
    detail: "PNG · 0.9 MB",
    tone: "price",
  },
];

const riskRows = [
  {
    tracking: "6012991823",
    carrier: "CJ대한통운",
    pickup: "2026-08-25 18:30",
    elapsed: "42시간",
    location: "옥천HUB · 간선하차 지연",
    grade: "D+2",
    action: "대리점 긴급 독촉",
    tone: "amber",
  },
  {
    tracking: "6012991899",
    carrier: "롯데택배",
    pickup: "2026-08-24 16:00",
    elapsed: "65시간",
    location: "서부산지점 · 배송출발 미처리",
    grade: "D+3",
    action: "고객 선제 안내",
    tone: "red",
  },
  {
    tracking: "6012991932",
    carrier: "한진택배",
    pickup: "2026-08-25 22:10",
    elapsed: "38시간",
    location: "대전HUB · 간선상차 대기",
    grade: "D+2",
    action: "상태 재확인",
    tone: "amber",
  },
  {
    tracking: "6012991951",
    carrier: "CJ대한통운",
    pickup: "2026-08-26 09:20",
    elapsed: "27시간",
    location: "곤지암HUB · 입고",
    grade: "D+1",
    action: "모니터링 유지",
    tone: "teal",
  },
];

const slaRows = [
  {
    company: "(주)에이블컴퍼니",
    shipments: "3,200",
    average: "1.8일",
    rate: "99.1%",
    risk: "2건",
    state: "양호",
    tone: "teal",
    action: "상세 보기",
  },
  {
    company: "글로벌커머스",
    shipments: "5,800",
    average: "2.6일",
    rate: "92.4%",
    risk: "18건",
    state: "지연 급증",
    tone: "red",
    action: "터미널 이슈 확인",
  },
  {
    company: "마인드샵",
    shipments: "2,150",
    average: "2.1일",
    rate: "97.6%",
    risk: "5건",
    state: "주의",
    tone: "amber",
    action: "리스크 보기",
  },
  {
    company: "올데이마켓",
    shipments: "1,920",
    average: "1.9일",
    rate: "98.2%",
    risk: "3건",
    state: "양호",
    tone: "teal",
    action: "상세 보기",
  },
];

const navItems: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "tickets", label: "CS 티켓 관리", icon: Inbox },
  { id: "risk", label: "배송 리스크", icon: AlertTriangle },
  { id: "sla", label: "화주 SLA", icon: SlidersHorizontal },
  { id: "shippers", label: "화주 목록", icon: Building2 },
  { id: "history", label: "화주 운영 이력", icon: History },
  { id: "reports", label: "업무 보고서", icon: ClipboardList },
  { id: "settings", label: "대리점 설정", icon: Settings },
];

function Logo({ inverse = false }: { inverse?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <img
        src="/manus-storage/logiflow-mark_96f2ec05.png"
        alt="LogiFlow 심볼"
        className="h-9 w-9 rounded-[9px] object-contain"
      />
      <div className="leading-none">
        <p
          className={`font-display text-[19px] font-extrabold tracking-[-0.07em] ${inverse ? "text-white" : "text-[#12233f]"}`}
        >
          logiflow
        </p>
        <p
          className={`mt-1 text-[8px] font-bold tracking-[0.18em] ${inverse ? "text-white/50" : "text-[#718096]"}`}
        >
          CS CONSOLE
        </p>
      </div>
    </div>
  );
}

function StatusDot({
  tone = "teal",
}: {
  tone?: "teal" | "amber" | "red" | "slate";
}) {
  const colors = {
    teal: "bg-[#0e9f95]",
    amber: "bg-[#d99724]",
    red: "bg-[#d45151]",
    slate: "bg-[#718096]",
  };
  return (
    <span className={`inline-block h-1.5 w-1.5 rounded-full ${colors[tone]}`} />
  );
}

function TicketTag({ type }: { type: Ticket["type"] }) {
  const classes = {
    "파손/분실": "bg-[#f9eded] text-[#b04a4a] border-[#efd7d7]",
    배송지연: "bg-[#fff7df] text-[#a16b07] border-[#f2e1aa]",
    오배송: "bg-[#eef2ff] text-[#5264a7] border-[#dce2fb]",
    주소변경: "bg-[#eef8f7] text-[#17796f] border-[#d8eeea]",
  };
  return <span className={`ticket-tag ${classes[type]}`}>{type}</span>;
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "navy",
  trend,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Inbox;
  tone?: "navy" | "teal" | "amber" | "red";
  trend?: string;
}) {
  const tones = {
    navy: "bg-[#12233f] text-white border-[#12233f]",
    teal: "bg-[#e7f5f3] text-[#0b756c] border-[#d0ebe6]",
    amber: "bg-[#fff7e5] text-[#9b6508] border-[#f3e4ba]",
    red: "bg-[#fdf0ef] text-[#b34242] border-[#f3d6d3]",
  };
  return (
    <section className={`metric-card ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <span className="metric-label">{label}</span>
        <Icon className="h-[18px] w-[18px] opacity-75" strokeWidth={1.8} />
      </div>
      <div className="mt-5 flex items-end justify-between gap-2">
        <div>
          <strong className="metric-value">{value}</strong>
          <p className="mt-1 text-[11px] font-medium opacity-70">{detail}</p>
        </div>
        {trend && (
          <span className="mb-0.5 flex items-center gap-0.5 text-[11px] font-bold">
            <ArrowUpRight className="h-3 w-3" />
            {trend}
          </span>
        )}
      </div>
    </section>
  );
}

function EvidenceReviewPanel({ onReview }: { onReview: () => void }) {
  const [viewer, setViewer] = useState<
    (typeof ticketEvidencePreview)[number] | null
  >(null);
  const [zoom, setZoom] = useState(100);
  const openViewer = (file: (typeof ticketEvidencePreview)[number]) => {
    setZoom(100);
    setViewer(file);
  };
  return (
    <section className="evidence-review-panel">
      <div className="evidence-review-head">
        <div>
          <p className="panel-kicker">CLAIM EVIDENCE · 4 FILES</p>
          <h3>화주 첨부 증빙</h3>
          <span>
            <UserRoundPlus className="h-3 w-3" />
            박지수 작성 · 화주 담당자 3명 참여
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="evidence-review-button"
            onClick={() => toast("모든 증빙 파일 다운로드를 준비했습니다.")}
          >
            <Download className="mr-1 h-3.5 w-3.5" />
            전체 다운로드
          </Button>
          <Button
            size="sm"
            className="evidence-review-button bg-[#12233f] hover:bg-[#213957]"
            onClick={onReview}
          >
            <ShieldCheck className="mr-1 h-3.5 w-3.5" />
            보상 검토
          </Button>
        </div>
      </div>
      <div className="evidence-card-row">
        {ticketEvidencePreview.map(file => (
          <div
            className={`evidence-review-card evidence-${file.tone}`}
            key={file.id}
          >
            <div className="evidence-thumbnail">
              {file.tone === "video" ? (
                <FileVideo />
              ) : file.tone === "price" ? (
                <FileText />
              ) : (
                <Package />
              )}
              <span>{file.tone === "video" ? "▶" : ""}</span>
            </div>
            <div className="min-w-0">
              <p>{file.category}</p>
              <strong>{file.name}</strong>
              <small>{file.detail}</small>
            </div>
            <div className="evidence-actions">
              <button
                onClick={() => openViewer(file)}
                aria-label={`${file.name} 크게 보기`}
              >
                <Maximize2 />
              </button>
              <button
                onClick={() => toast(`${file.name} 다운로드를 준비했습니다.`)}
                aria-label={`${file.name} 다운로드`}
              >
                <Download />
              </button>
            </div>
          </div>
        ))}
      </div>
      {viewer && (
        <div
          className="evidence-viewer-overlay evidence-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`${viewer.name} 확대 미리보기`}
        >
          <div className="evidence-lightbox-shell">
            <div className="lightbox-toolbar"><div><p className="panel-kicker">EVIDENCE LIGHTBOX · {viewer.category}</p><strong>{viewer.name}</strong></div><div className="lightbox-actions"><button onClick={() => setZoom(value => Math.max(70, value - 25))} aria-label="축소">−</button><span>{zoom}%</span><button onClick={() => setZoom(value => Math.min(200, value + 25))} aria-label="확대">+</button><button className="lightbox-close" onClick={() => setViewer(null)} aria-label="증빙 라이트박스 닫기"><X /></button></div></div>
            <div className={`lightbox-stage evidence-${viewer.tone}`}>
              <div className="lightbox-image" style={{ transform: `scale(${zoom / 100})` }}>
              {viewer.tone === "video" ? (
                <>
                  <FileVideo />
                  <button>
                    <span>▶</span>영상 재생
                  </button>
                </>
              ) : (
                <>
                  <FileText />
                  <span>고해상도 증빙 이미지</span>
                  <small>확대하여 손상 부위 및 판매가 정보를 확인하세요.</small>
                </>
              )}
              </div>
            </div>
            <div className="lightbox-footer"><span>{viewer.detail} · 화주 박지수 · 2026-08-27 08:40 등록</span>
            <Button
              onClick={() => toast(`${viewer.name} 다운로드를 준비했습니다.`)}
              className="bg-[#0e9f95] hover:bg-[#0b887f]"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              원본 다운로드
            </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

const timelineItems = [
  { time: "08:40", kind: "접수", actor: "박지수 · 화주 CS 담당", text: "파손/분실 티켓을 접수하고 파손 사진 2장, 영상 1개, 판매가 증빙 1개를 등록했습니다.", tone: "teal" },
  { time: "08:47", kind: "배정", actor: "자동 배정 규칙", text: "김대리 · 운영 2팀에게 1차 확인 담당으로 배정되었습니다.", tone: "navy" },
  { time: "09:03", kind: "내부 코멘트", actor: "김대리 · 서울중앙물류", text: "용산지점 기사님과 연락을 완료했고 사고 접수 코드를 요청했습니다.", tone: "slate" },
  { time: "09:18", kind: "상태 변경", actor: "김대리 · 서울중앙물류", text: "상태를 ‘택배사 확인 중’으로 변경하고 화주에게 1차 답변을 전송했습니다.", tone: "amber" },
  { time: "09:32", kind: "보상 검토", actor: "박매니저 · 사고 보상팀", text: "증빙 4개를 검토 대기열에 등록했습니다. 보상 판단 기한은 오늘 17:00입니다.", tone: "purple" },
];

function TicketTimeline({ comments }: { comments: { message: string; internal: boolean; time: string }[] }) {
  const entries = [...timelineItems, ...comments.map(item => ({ time: item.time, kind: item.internal ? "내부 코멘트" : "대리점 답변", actor: item.internal ? "대리점 내부" : "김대리 · 서울중앙물류", text: item.message, tone: item.internal ? "slate" : "teal" }))];
  return <section className="ticket-timeline"><div className="timeline-head"><div><p className="panel-kicker">ACTIVITY LOG · {entries.length} EVENTS</p><h3><History />상태 변경 및 코멘트 타임라인</h3></div><span>시간순 · 최신 활동 포함</span></div><div className="timeline-list">{entries.map((item, index) => <div className="timeline-item" key={`${item.time}-${index}`}><div className={`timeline-dot dot-${item.tone}`} /><div className="timeline-time">{item.time}</div><div className="timeline-content"><div><span className={`timeline-kind kind-${item.tone}`}>{item.kind}</span><strong>{item.actor}</strong></div><p>{item.text}</p></div></div>)}</div></section>;
}

function CompensationReviewDialog({ onClose }: { onClose: () => void }) {
  const [decision, setDecision] = useState<"approve" | "reject">("approve");
  const [reason, setReason] = useState("");
  const [agreementOpen, setAgreementOpen] = useState(false);
  const submit = () => {
    if (decision === "reject" && !reason.trim())
      return toast.error("반려 사유를 입력해 주세요.");
    if (decision === "approve") {
      setAgreementOpen(true);
      return;
    }
    toast.success(
      "보상 반려 사유를 등록했습니다. 화주 참여자에게 안내합니다."
    );
    onClose();
  };
  if (agreementOpen) return <AgreementStampDialog onClose={onClose} />;
  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="compensation-review-title"
    >
      <div className="compensation-modal">
        <button
          className="modal-close"
          onClick={onClose}
          aria-label="보상 검토 닫기"
        >
          <X className="h-4 w-4" />
        </button>
        <p className="eyebrow">COMPENSATION WORKFLOW · TK-89210</p>
        <h2 id="compensation-review-title">보상 검토 및 상태 변경</h2>
        <p className="compensation-copy">
          첨부 증빙 4개를 확인했습니다. 결정 결과와 사유는 화주의 참여
          담당자에게 공유됩니다.
        </p>
        <div className="reviewed-evidence">
          <CircleCheck />
          <span>증빙 파일 4개 검토 완료</span>
          <button onClick={() => toast("증빙 파일 패널로 이동했습니다.")}>
            다시 보기 <ExternalLink />
          </button>
        </div>
        <div className="decision-cards">
          <button
            onClick={() => setDecision("approve")}
            className={
              decision === "approve"
                ? "decision-card decision-card-active"
                : "decision-card"
            }
          >
            <CircleCheck />
            <div>
              <strong>보상 승인</strong>
              <span>승인 상태로 변경하고 보상 절차를 시작합니다.</span>
            </div>
          </button>
          <button
            onClick={() => setDecision("reject")}
            className={
              decision === "reject"
                ? "decision-card decision-card-reject"
                : "decision-card"
            }
          >
            <CircleX />
            <div>
              <strong>보상 반려</strong>
              <span>반려 사유를 입력해 화주에 안내합니다.</span>
            </div>
          </button>
        </div>
        <label className="review-reason">
          {decision === "approve" ? "승인 메모 (선택)" : "반려 사유 (필수)"}
          <textarea
            value={reason}
            onChange={event => setReason(event.target.value)}
            placeholder={
              decision === "approve"
                ? "예: 판매가 증빙 및 파손 상태를 확인하여 보상 승인합니다."
                : "예: 판매가 확인 가능한 주문 상세 또는 영수증을 추가해 주세요."
            }
          />
        </label>
        <div className="review-footer">
          <div>
            <span>현재 담당</span>
            <strong>박매니저 · 사고 보상팀</strong>
          </div>
          <Button
            onClick={submit}
            className={
              decision === "approve"
                ? "bg-[#0e9f95] hover:bg-[#0b887f]"
                : "bg-[#c15454] hover:bg-[#aa4343]"
            }
          >
            {decision === "approve" ? (
              <Check className="mr-1.5 h-4 w-4" />
            ) : (
              <CircleX className="mr-1.5 h-4 w-4" />
            )}
            {decision === "approve" ? "합의서 생성·직인 적용" : "반려 사유 등록"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function AgencySidebar({
  view,
  setView,
  compact,
}: {
  view: View;
  setView: (view: View) => void;
  compact: boolean;
}) {
  return (
    <aside
      className={`${compact ? "w-[76px]" : "w-[224px]"} relative hidden shrink-0 flex-col bg-[#12233f] px-3 pb-4 pt-5 text-white transition-[width] duration-200 lg:flex`}
    >
      <div className="px-2">
        <Logo inverse />
      </div>
      <div className="mt-9 space-y-1">
        <p className={`sidebar-kicker ${compact ? "text-center" : "px-3"}`}>
          {compact ? "" : "OPERATIONS"}
        </p>
        <button
          className={`sidebar-item ${view === "tickets" ? "sidebar-item-active" : ""}`}
          onClick={() => setView("tickets")}
          title="전체 대시보드"
        >
          <LayoutDashboard /> {!compact && <span>전체 대시보드</span>}
        </button>
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`sidebar-item ${view === id ? "sidebar-item-active" : ""}`}
            onClick={() => setView(id)}
            title={label}
          >
            <Icon /> {!compact && <span>{label}</span>}
            {!compact && id === "tickets" && (
              <span className="ml-auto rounded-full bg-[#e6b84a] px-1.5 py-0.5 text-[10px] font-bold text-[#12233f]">
                48
              </span>
            )}
            {!compact && id === "shippers" && (
              <span className="ml-auto text-[11px] text-white/40">420</span>
            )}
          </button>
        ))}
      </div>
      <div
        className="sidebar-utility mt-auto overflow-hidden"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(18,35,63,.82), rgba(18,35,63,.95)), url('/manus-storage/terminal-grid_8ed3d839.png')",
        }}
      >
        {!compact && (
          <>
            <div className="flex items-center gap-2 text-[11px] font-bold text-white/85">
              <ShieldCheck className="h-4 w-4 text-[#5bd4c7]" />
              연동 상태 정상
            </div>
            <p className="mt-1.5 text-[10px] leading-relaxed text-white/50">
              3개 택배사 API가 최신 상태입니다.
            </p>
          </>
        )}
        {compact && <ShieldCheck className="mx-auto h-5 w-5 text-[#5bd4c7]" />}
      </div>
    </aside>
  );
}

function AgencyHeader({
  compact,
  setCompact,
}: {
  compact: boolean;
  setCompact: (value: boolean) => void;
}) {
  const { logout } = useAuth();
  return (
    <header className="flex h-[72px] shrink-0 items-center gap-3 border-b border-[#e7e8e4] bg-[#fffefb] px-4 sm:px-7">
      <button
        className="hidden rounded-lg p-2 text-[#607087] hover:bg-[#f1f4f1] lg:inline-flex"
        onClick={() => setCompact(!compact)}
        aria-label="사이드바 접기"
      >
        <PanelLeftClose
          className={`h-4 w-4 transition-transform ${compact ? "rotate-180" : ""}`}
        />
      </button>
      <div className="hidden h-7 w-px bg-[#e2e6e1] sm:block" />
      <button className="top-select hidden sm:flex">
        <Building2 className="h-4 w-4" />
        전체 화주 모드{" "}
        <span className="rounded bg-[#edf3f2] px-1.5 py-0.5 text-[10px] text-[#237d73]">
          420
        </span>
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      <label className="search-shell ml-auto max-w-[410px]">
        <Search className="h-4 w-4" />
        <Input
          className="h-9 border-0 bg-transparent px-1 text-[13px] shadow-none focus-visible:ring-0"
          placeholder="송장, 화주, 수령인 통합 검색"
        />
        <kbd className="hidden rounded border border-[#dfe4df] bg-white px-1.5 py-0.5 text-[10px] font-medium text-[#8794a6] md:inline">
          ⌘ K
        </kbd>
      </label>
      <Button
        variant="outline"
        size="sm"
        className="hidden lg:inline-flex"
        onClick={() => window.location.assign("/agency/permissions")}
      >
        <UserCog className="mr-1.5 h-4 w-4" />직원 권한
      </Button>
      <button
        className="relative rounded-lg p-2.5 text-[#435267] hover:bg-[#f1f4f1]"
        onClick={() => toast("새 알림 12건을 확인했습니다.")}
        aria-label="알림"
      >
        <Bell className="h-[18px] w-[18px]" />
        <span className="absolute right-1.5 top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#d45151] px-1 text-[8px] font-bold text-white">
          12
        </span>
      </button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="hidden sm:inline-flex"
        onClick={logout}
      >
        <LogOut className="mr-1.5 h-4 w-4" />로그아웃
      </Button>
      <div className="hidden items-center gap-2.5 border-l border-[#e2e6e1] pl-4 sm:flex">
        <Avatar className="h-8 w-8 border border-[#dce7e4]">
          <AvatarFallback className="bg-[#e7f5f3] text-[11px] font-bold text-[#17796f]">
            김
          </AvatarFallback>
        </Avatar>
        <div className="leading-tight">
          <p className="text-xs font-bold text-[#25364b]">김대리</p>
          <p className="mt-0.5 text-[10px] text-[#8490a0]">서울중앙물류</p>
        </div>
      </div>
    </header>
  );
}

function TicketsView() {
  return (
    <DataResetNotice
      title="CS 처리 현황"
      description="초기화된 DB를 기준으로 다시 검증할 수 있도록 샘플 티켓 대시보드를 숨겼습니다."
      helper="실제 티켓 테이블과 상세 패널이 붙기 전까지는 이 메뉴에서 숫자와 샘플 화주명이 보이지 않는 것이 맞습니다. 초대, 가입, 계정 설정, 로그인 흐름 확인 후 실티켓 연동을 붙이겠습니다."
      icon={Inbox}
    />
  );
}

function DataResetNotice({
  title,
  description,
  helper,
  icon: Icon,
}: {
  title: string;
  description: string;
  helper: string;
  icon: typeof UsersRound;
}) {
  return (
    <div className="page-enter flex min-h-0 flex-1 flex-col overflow-y-auto p-4 sm:p-6">
      <div className="content-title-row">
        <div>
          <p className="eyebrow">LIVE DATA CHECKPOINT</p>
          <h1>{title}</h1>
          <p className="subtitle">{description}</p>
        </div>
      </div>
      <section className="data-card mt-5 flex min-h-[420px] items-center justify-center">
        <div className="empty-state max-w-[620px]">
          <div className="empty-icon">
            <Icon />
          </div>
          <h2>더미 화면을 숨겨 둔 상태입니다.</h2>
          <p>{helper}</p>
          <p className="text-sm text-[#7c8897]">
            실데이터 연결 전까지는 샘플 숫자, 샘플 화주명, 샘플 티켓을 표시하지 않습니다.
          </p>
        </div>
      </section>
    </div>
  );
}

function RiskView({ shipper = false }: { shipper?: boolean }) {
  return (
    <DataResetNotice
      title={shipper ? "배송지연 리스크 관제" : "전체 화주 배송 리스크"}
      description="DB 초기화 이후 실제 배송 추적 데이터만 보이도록 샘플 리스크 보드를 숨겼습니다."
      helper="실제 송장 추적 연동이 붙기 전까지는 이 메뉴를 빈 상태로 유지합니다. 테스트 시에는 초대·가입·정산·문서 흐름부터 먼저 확인해 주세요."
      icon={AlertTriangle}
    />
  );
}

function SLAView() {
  return (
    <DataResetNotice
      title="화주별 배송 SLA"
      description="실측 SLA 집계가 연결되기 전이라 샘플 비교표를 제거했습니다."
      helper="실데이터 집계 쿼리가 준비되면 화주별 출고량, 준수율, 위험 건수만 다시 노출하겠습니다. 지금은 빈 화면이 정상입니다."
      icon={SlidersHorizontal}
    />
  );
}

function SimplePlaceholder({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: typeof UsersRound;
}) {
  return (
    <div className="page-enter flex flex-1 flex-col p-6">
      <div className="content-title-row">
        <div>
          <p className="eyebrow">WORKSPACE</p>
          <h1>{title}</h1>
          <p className="subtitle">{description}</p>
        </div>
      </div>
      <div className="empty-state">
        <div className="empty-icon">
          <Icon />
        </div>
        <h2>화면을 준비하고 있습니다</h2>
        <p>
          현재 프로토타입에서는 핵심 CS와 배송 리스크 업무 흐름을 우선
          구현했습니다.
        </p>
        <Button
          onClick={() => toast("요청 사항을 접수했습니다.")}
          className="mt-4 bg-[#0e9f95] hover:bg-[#0b887f]"
        >
          기능 요청 남기기
        </Button>
      </div>
    </div>
  );
}

function AgencyConsole() {
  const [view, setView] = useState<View>("tickets");
  const [compact, setCompact] = useState(false);
  const renderView = () => {
    if (view === "tickets") return <TicketsView />;
    if (view === "risk") return <RiskView />;
    if (view === "sla") return <SLAView />;
    if (view === "shippers") return <ShippersView />;
    if (view === "history") return <ShipperOperationsHistoryView />;
    if (view === "reports") return <ReportsView />;
    return <SettingsView />;
  };
  return (
    <main className="flex h-screen overflow-hidden bg-[#f5f7f4]">
      <AgencySidebar view={view} setView={setView} compact={compact} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AgencyHeader
          compact={compact}
          setCompact={setCompact}
        />
        {renderView()}
      </div>
    </main>
  );
}

const shipperCompletedCases = [
  { id: "TK-89074", tracking: "6012937921", recipient: "김현지", type: "배송지연" as const, result: "배송 완료 확인 및 고객 안내", closedAt: "2026-08-26 16:14", owner: "이현우 · 운영 매니저" },
  { id: "TK-89031", tracking: "6012937752", recipient: "박서준", type: "오배송" as const, result: "회수 및 재출고 접수 완료", closedAt: "2026-08-25 13:52", owner: "박지수 · CS 담당" },
  { id: "TK-88986", tracking: "6012937410", recipient: "이수민", type: "파손/분실" as const, result: "보상 합의 및 지급 요청 완료", closedAt: "2026-08-24 17:08", owner: "최윤서 · 물류 담당" },
];

function ShipperIssueSummary() {
  return <section className="shipper-summary"><div className="shipper-summary-head"><div><p className="panel-kicker">CS ISSUE SNAPSHOT · LIVE RESET</p><h2>실제 접수 데이터가 들어오면 요약이 표시됩니다.</h2></div><span><BarChart3 />현재는 샘플 요약 숨김</span></div><div className="empty-state border border-dashed border-[#d8e1de] bg-[#fbfcfb] py-10"><div className="empty-icon"><BarChart3 /></div><h2>더미 이슈 요약을 제거했습니다.</h2><p>DB 초기화 후에는 실제 접수 건이 쌓이기 전까지 요약 차트와 건수가 비어 있는 상태가 맞습니다.</p></div></section>;
}

function ShipperPortal({ organizationName }: { organizationName: string }) {
  const [tab, setTab] = useState<"tickets" | "risk" | "completed" | "documents" | "settlement">("tickets");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const { logout } = useAuth();

  const [tracking, setTracking] = useState("");
  const [issueType, setIssueType] = useState<Ticket["type"]>("파손/분실");
  const [details, setDetails] = useState("");
  const [damagePhotos, setDamagePhotos] = useState<EvidenceFile[]>([]);
  const [damageVideos, setDamageVideos] = useState<EvidenceFile[]>([]);
  const [priceProofs, setPriceProofs] = useState<EvidenceFile[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);
  const evidenceUpload = trpc.evidence.upload.useMutation();
  const clientTickets = tickets.filter(
    ticket =>
      ticket.company === "(주)에이블컴퍼니" &&
      `${ticket.tracking}${ticket.recipient}`.includes(search)
  );
  const visibleCases =
    tab === "completed"
      ? shipperCompletedCases.filter(caseItem =>
          `${caseItem.tracking}${caseItem.recipient}`.includes(search)
        )
      : clientTickets;
  const selectedFiles = {
    damage_photo: damagePhotos,
    damage_video: damageVideos,
    price_proof: priceProofs,
  };
  const setSelectedFiles: Record<
    EvidenceCategory,
    React.Dispatch<React.SetStateAction<EvidenceFile[]>>
  > = {
    damage_photo: setDamagePhotos,
    damage_video: setDamageVideos,
    price_proof: setPriceProofs,
  };
  const updateEvidence = (
    category: EvidenceCategory,
    files: FileList | null
  ) => {
    if (!files) return;
    const rule = evidenceRules[category];
    const incoming = Array.from(files);
    const valid = incoming.filter(file => {
      if (!rule.accept.includes(file.type)) {
        toast.error(
          `${rule.label}은 ${category === "damage_video" ? "MP4 또는 MOV" : "JPG, PNG, WEBP"} 파일만 첨부할 수 있습니다.`
        );
        return false;
      }
      if (file.size > rule.maxBytes) {
        toast.error(
          `${rule.label}은 파일당 ${formatFileSize(rule.maxBytes)} 이하만 첨부할 수 있습니다.`
        );
        return false;
      }
      return true;
    });
    const available = rule.maxFiles - selectedFiles[category].length;
    if (valid.length > available)
      toast.warning(
        `${rule.label}은 최대 ${rule.maxFiles}개까지 첨부할 수 있습니다.`
      );
    const additions = valid.slice(0, Math.max(0, available)).map(file => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : undefined,
      progress: 0,
      status: "ready" as const,
    }));
    if (additions.length)
      setSelectedFiles[category](current => [...current, ...additions]);
  };
  const removeEvidence = (category: EvidenceCategory, id: string) =>
    setSelectedFiles[category](current => {
      const target = current.find(item => item.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return current.filter(item => item.id !== id);
    });
  const updateUploadState = (
    category: EvidenceCategory,
    id: string,
    progress: number,
    status: UploadStatus
  ) =>
    setSelectedFiles[category](current =>
      current.map(item =>
        item.id === id ? { ...item, progress, status } : item
      )
    );
  const replacePriceProof = () => {
    priceProofs.forEach(
      item => item.previewUrl && URL.revokeObjectURL(item.previewUrl)
    );
    setPriceProofs([]);
    window.setTimeout(() => priceInputRef.current?.click(), 0);
  };
  const clearForm = () => {
    [damagePhotos, damageVideos, priceProofs]
      .flat()
      .forEach(item => item.previewUrl && URL.revokeObjectURL(item.previewUrl));
    setTracking("");
    setIssueType("파손/분실");
    setDetails("");
    setDamagePhotos([]);
    setDamageVideos([]);
    setPriceProofs([]);
    setShowForm(false);
  };
  const submitRequest = async () => {
    if (!/^\d{8,}$/.test(tracking.trim()))
      return toast.error("송장번호를 숫자 8자리 이상으로 입력해 주세요.");
    if (!details.trim())
      return toast.error("고객 문의 또는 요청 사항을 입력해 주세요.");
    if (
      issueType === "파손/분실" &&
      damagePhotos.length + damageVideos.length === 0
    )
      return toast.error(
        "파손·분실 문의에는 파손 사진 또는 동영상을 1개 이상 첨부해 주세요."
      );
    const requestRef = `CS-${Date.now().toString().slice(-8)}`;
    const queue = (
      Object.entries(selectedFiles) as [EvidenceCategory, EvidenceFile[]][]
    ).flatMap(([category, files]) => files.map(item => ({ category, item })));
    let active: { category: EvidenceCategory; item: EvidenceFile } | undefined;
    try {
      for (const { category, item } of queue) {
        active = { category, item };
        updateUploadState(category, item.id, 12, "uploading");
        const base64 = await readFileAsBase64(item.file);
        updateUploadState(category, item.id, 64, "uploading");
        await evidenceUpload.mutateAsync({
          requestRef,
          category,
          fileName: item.file.name,
          contentType: item.file.type,
          byteSize: item.file.size,
          base64,
        });
        updateUploadState(category, item.id, 100, "success");
      }
      toast.success(
        queue.length
          ? `CS 요청과 증빙 파일 ${queue.length}개를 안전하게 업로드했습니다.`
          : "CS 요청이 접수되었습니다."
      );
      window.setTimeout(clearForm, 700);
    } catch (error) {
      if (active) {
        updateUploadState(active.category, active.item.id, 0, "error");
      }
      toast.error(
        error instanceof Error
          ? error.message
          : "증빙 파일 업로드에 실패했습니다. 다시 시도해 주세요."
      );
    }
  };
  return (
    <main className="min-h-screen bg-[#f5f7f4]">
      <header className="flex h-[72px] items-center gap-4 border-b border-[#e7e8e4] bg-[#fffefb] px-4 sm:px-8">
        <Logo />
        <div className="hidden h-7 w-px bg-[#e2e6e1] sm:block" />
        <div className="hidden text-xs text-[#66758a] md:block">
            <strong className="text-[#283a50]">{organizationName}</strong> 님{" "}
          <span className="mx-1.5 text-[#c3cad1]">|</span> 대리점: 서울중앙물류
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
          >
            <LogOut className="mr-1.5 h-3.5 w-3.5" />
            로그아웃
          </Button>
        </div>
      </header>
      <div className="mx-auto max-w-[1380px] px-4 py-6 sm:px-8">
        <div className="portal-heading">
          <div>
            <p className="eyebrow">SHIPPER PORTAL · LIVE STATUS</p>
            <h1>안녕하세요, {organizationName} 운영팀</h1>
            <p className="subtitle">
              CS 접수와 배송 위험 현황을 한 곳에서 확인하세요.
            </p>
          </div>
          <div className="portal-actions">
            <Button
              onClick={() => setShowForm(true)}
              className="bg-[#0e9f95] hover:bg-[#0b887f]"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              건별 CS 접수
            </Button>
            <Button
              variant="outline"
              onClick={() => toast("엑셀 업로드 화면을 열었습니다.")}
            >
              <FileSpreadsheet className="mr-1.5 h-4 w-4" />
              대량 업로드
            </Button>
            <Button
              variant="outline"
              className="hidden sm:flex"
              onClick={() => toast("CS 처리 보고서를 준비했습니다.")}
            >
              <Download className="mr-1.5 h-4 w-4" />
              처리 보고서
            </Button>
          </div>
        </div>
        <ShipperActionAlerts />
        <div className="portal-tabs">
          <button
            className={tab === "tickets" ? "portal-tab-active" : ""}
            onClick={() => setTab("tickets")}
          >
            <MessageSquareText className="h-4 w-4" />내 CS 문의 <span>2</span>
          </button>
          <button
            className={tab === "risk" ? "portal-tab-active" : ""}
            onClick={() => setTab("risk")}
          >
            <AlertTriangle className="h-4 w-4" />
            배송지연 리스크{" "}
            <span className="bg-[#f8e2df] text-[#bd4949]">2</span>
          </button>
          <button
            className={tab === "completed" ? "portal-tab-active" : ""}
            onClick={() => setTab("completed")}
          >
            <CheckCircle2 className="h-4 w-4" />처리 완료 <span>18</span>
          </button>
          <button
            className={tab === "documents" ? "portal-tab-active" : ""}
            onClick={() => setTab("documents")}
          >
            <FileText className="h-4 w-4" />날인 문서 <span className="bg-[#eef2f8] text-[#263e60]">PDF</span>
          </button>
          <button
            className={tab === "settlement" ? "portal-tab-active" : ""}
            onClick={() => setTab("settlement")}
          >
            <Landmark className="h-4 w-4" />정산 정보
          </button>
        </div>
        {tab === "risk" ? (
          <RiskView shipper />
        ) : tab === "documents" ? (
          <ShipperDocumentCenter organizationName={organizationName} />
        ) : tab === "settlement" ? (
          <ShipperSettlementCenter />
        ) : tab === "completed" ? (
          <>
            <ShipperIssueSummary />
            <section className="data-card mt-5 min-h-[490px] flex items-center justify-center">
              <div className="empty-state max-w-[560px]">
                <div className="empty-icon"><CheckCircle2 /></div>
                <h2>처리 완료 이력 더미를 제거했습니다.</h2>
                <p>실제 완료 이력 조회가 연결되기 전까지는 샘플 티켓 번호와 송장번호를 보여주지 않습니다.</p>
              </div>
            </section>
          </>
        ) : (
          <>
            <ShipperIssueSummary />
            <section className="data-card mt-5 min-h-[490px] flex items-center justify-center">
              <div className="empty-state max-w-[560px]">
                <div className="empty-icon"><MessageSquareText /></div>
                <h2>내 CS 문의 더미를 숨겼습니다.</h2>
                <p>초기화된 상태에서는 실제 접수 내역이 없으므로 샘플 문의 목록 대신 빈 상태만 표시합니다. 새 문의는 상단의 건별 CS 접수로 테스트해 주세요.</p>
              </div>
            </section>
          </>
        )}
      </div>
      {showForm && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cs-request-title"
        >
          <div className="cs-modal cs-evidence-modal">
            <button
              className="modal-close"
              onClick={clearForm}
              aria-label="CS 접수 닫기"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="modal-intro">
              <div>
                <p className="eyebrow">NEW SERVICE REQUEST</p>
                <h2 id="cs-request-title">건별 CS 접수</h2>
                <p>
                  송장번호와 증빙 파일을 함께 등록하면 대리점이 빠르게
                  확인합니다.
                </p>
              </div>
              <div className="evidence-count">
                <Paperclip className="h-3.5 w-3.5" />
                첨부{" "}
                {damagePhotos.length + damageVideos.length + priceProofs.length}
                /8
              </div>
            </div>
            <div className="cs-modal-body">
              <div className="request-fields">
                <label>
                  송장번호
                  <Input
                    value={tracking}
                    onChange={event =>
                      setTracking(event.target.value.replace(/\D/g, ""))
                    }
                    inputMode="numeric"
                    placeholder="예: 6012938192"
                  />
                </label>
                <label>
                  문의 유형
                  <select
                    className="modal-select"
                    value={issueType}
                    onChange={event =>
                      setIssueType(event.target.value as Ticket["type"])
                    }
                  >
                    <option>파손/분실</option>
                    <option>배송지연</option>
                    <option>오배송</option>
                    <option>주소변경</option>
                  </select>
                </label>
              </div>
              <label>
                상세 내용
                <textarea
                  value={details}
                  onChange={event => setDetails(event.target.value)}
                  placeholder="고객 문의, 파손 상태 또는 요청 사항을 구체적으로 입력하세요."
                />
              </label>
              <section className="evidence-section">
                <div className="evidence-section-head">
                  <div>
                    <p>파손 증빙</p>
                    <strong>
                      파손 사진 또는 동영상 <span>파손/분실 접수 시 필수</span>
                    </strong>
                  </div>
                  <small>사진 최대 5개 · 영상 최대 2개</small>
                </div>
                <div className="evidence-upload-grid">
                  <div className="evidence-upload-card">
                    <input
                      ref={photoInputRef}
                      className="sr-only"
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp"
                      onChange={event => {
                        updateEvidence("damage_photo", event.target.files);
                        event.currentTarget.value = "";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="evidence-dropzone"
                    >
                      <UploadCloud />
                      <span>파손 사진 추가</span>
                      <small>JPG · PNG · WEBP / 장당 7MB</small>
                    </button>
                    {damagePhotos.length > 0 && (
                      <div className="image-preview-row">
                        {damagePhotos.map(item => (
                          <div className="evidence-image" key={item.id}>
                            <img
                              src={item.previewUrl}
                              alt={`${item.file.name} 미리보기`}
                            />
                            <i
                              className={`upload-progress upload-${item.status}`}
                              style={{ width: `${item.progress}%` }}
                            />
                            <button
                              type="button"
                              onClick={() =>
                                removeEvidence("damage_photo", item.id)
                              }
                              aria-label={`${item.file.name} 삭제`}
                            >
                              <Trash2 />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="evidence-upload-card">
                    <input
                      ref={videoInputRef}
                      className="sr-only"
                      type="file"
                      multiple
                      accept="video/mp4,video/quicktime"
                      onChange={event => {
                        updateEvidence("damage_video", event.target.files);
                        event.currentTarget.value = "";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => videoInputRef.current?.click()}
                      className="evidence-dropzone"
                    >
                      <FileVideo />
                      <span>파손 영상 추가</span>
                      <small>MP4 · MOV / 편당 30MB</small>
                    </button>
                    {damageVideos.length > 0 && (
                      <div className="file-preview-stack">
                        {damageVideos.map(item => (
                          <div className="evidence-file" key={item.id}>
                            <FileVideo />
                            <div>
                              <strong>{item.file.name}</strong>
                              <small>
                                {item.status === "uploading"
                                  ? `업로드 중 ${item.progress}%`
                                  : item.status === "success"
                                    ? "업로드 완료"
                                    : item.status === "error"
                                      ? "업로드 실패 · 다시 시도"
                                      : formatFileSize(item.file.size)}
                              </small>
                              <i
                                className={`upload-progress upload-${item.status}`}
                                style={{ width: `${item.progress}%` }}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                removeEvidence("damage_video", item.id)
                              }
                              aria-label={`${item.file.name} 삭제`}
                            >
                              <Trash2 />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </section>
              <section className="evidence-section price-proof-section">
                <div className="evidence-section-head">
                  <div>
                    <p>보상 산정 증빙</p>
                    <strong>물품 판매가격 증빙 이미지</strong>
                  </div>
                  <small>상품 상세·주문서·영수증 등</small>
                </div>
                <input
                  ref={priceInputRef}
                  className="sr-only"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={event => {
                    updateEvidence("price_proof", event.target.files);
                    event.currentTarget.value = "";
                  }}
                />
                {priceProofs.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => priceInputRef.current?.click()}
                    className="price-proof-dropzone"
                  >
                    <UploadCloud />
                    <span>판매가격 증빙 이미지 등록</span>
                    <small>JPG · PNG · WEBP / 7MB 이하</small>
                  </button>
                ) : (
                  <div className="price-proof-preview">
                    {priceProofs.map(item => (
                      <div className="evidence-file price-file" key={item.id}>
                        <img
                          src={item.previewUrl}
                          alt={`${item.file.name} 미리보기`}
                        />
                        <div>
                          <strong>{item.file.name}</strong>
                          <small>
                            {item.status === "uploading"
                              ? `업로드 중 ${item.progress}%`
                              : item.status === "success"
                                ? "업로드 완료 · 판매가격 증빙"
                                : item.status === "error"
                                  ? "업로드 실패 · 다시 시도"
                                  : `${formatFileSize(item.file.size)} · 판매가격 증빙`}
                          </small>
                          <i
                            className={`upload-progress upload-${item.status}`}
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeEvidence("price_proof", item.id)}
                          aria-label={`${item.file.name} 삭제`}
                        >
                          <Trash2 />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={replacePriceProof}
                      className="replace-evidence"
                    >
                      교체
                    </button>
                  </div>
                )}
              </section>
              <p className="evidence-notice">
                <ShieldCheck />
                증빙 파일은 CS 처리와 보상 검토 목적으로만 안전하게 보관됩니다.
              </p>
            </div>
            <div className="modal-actions">
              <Button
                variant="outline"
                onClick={clearForm}
                disabled={evidenceUpload.isPending}
              >
                취소
              </Button>
              <Button
                className="bg-[#0e9f95] hover:bg-[#0b887f]"
                onClick={submitRequest}
                disabled={evidenceUpload.isPending}
              >
                {evidenceUpload.isPending ? (
                  <>
                    <UploadCloud className="mr-1.5 h-3.5 w-3.5 animate-pulse" />
                    증빙 업로드 중
                  </>
                ) : (
                  <>
                    <Send className="mr-1.5 h-3.5 w-3.5" />
                    접수하기
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function ShipperActionAlerts() {
  const dashboard = trpc.operations.shipperDocumentDashboard.useQuery(undefined, { retry: false });
  if (dashboard.isLoading) return <div className="mt-5 flex items-center gap-2 rounded-xl border border-[#dae5e2] bg-[#f7f9f7] px-4 py-3 text-sm text-[#637287]"><Clock3 className="h-4 w-4 animate-pulse" />정산 및 날인 문서 상태를 확인하는 중입니다.</div>;
  if (dashboard.isError) return <div className="mt-5 flex items-center gap-2 rounded-xl border border-[#efc8c8] bg-[#fff5f5] px-4 py-3 text-sm text-[#a34d4d]"><AlertTriangle className="h-4 w-4" />정산 및 날인 문서 상태를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.</div>;
  const pendingSettlement = dashboard.data?.pendingSettlement;
  const pendingDocuments = dashboard.data?.pendingSignatureDocuments ?? [];
  if (!pendingSettlement && pendingDocuments.length === 0) return <div className="mt-5 flex items-center gap-2 rounded-xl border border-[#cbe9e3] bg-[#effaf8] px-4 py-3 text-sm text-[#087970]"><CheckCircle2 className="h-4 w-4" />정산 및 날인 문서에 현재 확인이 필요한 항목이 없습니다.</div>;
  return <section className="mt-5 grid gap-3 md:grid-cols-2" aria-label="확인이 필요한 업무 알림">
    {pendingSettlement && <article className="rounded-xl border border-[#f2c882] bg-[#fff7e9] p-4 shadow-sm"><div className="flex items-start gap-3"><span className="rounded-lg bg-[#ffe2ad] p-2 text-[#9a631f]"><Landmark className="h-4 w-4" /></span><div><div className="flex items-center gap-2"><p className="text-[11px] font-bold tracking-[.13em] text-[#a3651d]">ACTION REQUIRED</p><Badge className="bg-[#d9683f] text-white">정산 확인 필요</Badge></div><h2 className="mt-1 font-bold text-[#5e3d1d]">등록한 정산 계좌를 확인해 주세요.</h2><p className="mt-1 text-xs text-[#8c6538]">대리점 검토가 완료되어야 보상금 지급 절차를 시작할 수 있습니다.</p></div></div></article>}
    {pendingDocuments.length > 0 && <article className="rounded-xl border border-[#e4c4d9] bg-[#fff4fa] p-4 shadow-sm"><div className="flex items-start gap-3"><span className="rounded-lg bg-[#f7d7e9] p-2 text-[#a44270]"><FilePenLine className="h-4 w-4" /></span><div><div className="flex items-center gap-2"><p className="text-[11px] font-bold tracking-[.13em] text-[#a44270]">SIGNATURE PENDING</p><Badge className="bg-[#c34578] text-white">서명 대기 {pendingDocuments.length}건</Badge></div><h2 className="mt-1 font-bold text-[#6f3150]">날인 또는 확정이 필요한 보상 문서가 있습니다.</h2><p className="mt-1 text-xs text-[#8d5a70]">날인 문서 탭에서 문서 상태와 합의 내용을 확인해 주세요.</p></div></div></article>}
  </section>;
}

function ShipperSettlementCenter() {
  const dashboard = trpc.operations.shipperDocumentDashboard.useQuery(undefined, { retry: false });
  const utils = trpc.useUtils();
  const [bank, setBank] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const save = trpc.operations.upsertSettlement.useMutation({
    onSuccess: async result => {
      await utils.operations.shipperDocumentDashboard.invalidate();
      setBank("");
      setAccountHolder("");
      setAccountNumber("");
      toast.success(`정산 정보를 저장했습니다. 대리점 검토 후 확정됩니다. (****${result.accountLast4})`);
    },
    onError: error => toast.error(error.message),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!bank) return toast.error("정산 은행을 선택해 주세요.");
    if (accountHolder.trim().length < 2) return toast.error("예금주명을 입력해 주세요.");
    if (!/^\d{8,30}$/.test(accountNumber)) return toast.error("계좌번호는 숫자 8~30자리로 입력해 주세요.");
    save.mutate({ bank, accountHolder: accountHolder.trim(), accountNumber });
  };
  if (dashboard.isLoading) return <section className="data-card mt-5 min-h-[360px] p-10 text-center text-sm text-[#637287]"><Clock3 className="mx-auto mb-3 h-5 w-5 animate-pulse" />정산 정보 상태를 불러오는 중입니다.</section>;
  if (dashboard.isError) return <section className="data-card mt-5 min-h-[360px] p-10 text-center"><AlertTriangle className="mx-auto mb-3 h-6 w-6 text-[#bd4949]" /><h2 className="font-bold">정산 정보를 불러오지 못했습니다.</h2><p className="mt-2 text-sm text-[#637287]">{dashboard.error.message}</p><Button className="mt-4 bg-[#0e9f95] hover:bg-[#0b887f]" onClick={() => dashboard.refetch()}>다시 시도</Button></section>;
  const pending = dashboard.data?.pendingSettlement ?? true;
  return <section className="data-card mt-5 max-w-[760px]"><div className="data-card-head"><div><p className="panel-kicker">SETTLEMENT ACCOUNT</p><h2>정산 정보 업데이트</h2><p className="mt-1 text-sm text-[#637287]">보상금 지급에 사용될 정산 계좌를 등록합니다. 등록 즉시 대리점 검토가 시작됩니다.</p></div><Badge className={pending ? "bg-[#fff7e9] text-[#a3651d]" : "bg-[#eaf6f4] text-[#087970]"}>{pending ? "검토 필요 · 미확정" : "검토 완료"}</Badge></div><form onSubmit={submit} className="mt-5 grid gap-4"><div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1.5 text-sm font-medium text-[#3d4a5c]">정산 은행<select value={bank} onChange={event => setBank(event.target.value)} className="h-10 rounded-lg border border-[#dae5e2] bg-white px-3 text-sm"><option value="">은행 선택</option><option>국민은행</option><option>신한은행</option><option>우리은행</option><option>하나은행</option><option>기업은행</option><option>농협</option><option>카카오뱅크</option></select></label><label className="grid gap-1.5 text-sm font-medium text-[#3d4a5c]">예금주<Input value={accountHolder} onChange={event => setAccountHolder(event.target.value)} placeholder="예금주명 (사업자명과 동일하게)" /></label></div><label className="grid gap-1.5 text-sm font-medium text-[#3d4a5c]">정산 계좌번호<Input value={accountNumber} onChange={event => setAccountNumber(event.target.value.replace(/\D/g, "").slice(0, 30))} inputMode="numeric" placeholder="숫자만 입력 (8~30자리)" /></label><div className="flex flex-wrap items-center gap-3"><Button type="submit" disabled={save.isPending} className="bg-[#0e9f95] hover:bg-[#0b887f]">{save.isPending ? "저장 중..." : "정산 정보 저장하고 검토 요청"}</Button><p className="text-xs text-[#708093]">계좌번호는 암호화되어 저장되며 대리점에는 뒤 4자리만 표시됩니다.</p></div></form></section>;
}

function ShipperDocumentCenter({ organizationName }: { organizationName: string }) {
  const dashboard = trpc.operations.shipperDocumentDashboard.useQuery(undefined, { retry: false });
  const downloadAudit = trpc.operations.recordDocumentDownload.useMutation();
  const utils = trpc.useUtils();
  const downloadDocument = async (documentRef: string, finalizedAt: Date) => {
    try {
      await downloadAgreementPdf({ documentRef, shipperName: organizationName, finalizedAt });
      await downloadAudit.mutateAsync({ documentRef });
      await utils.operations.shipperDocumentDashboard.invalidate();
      toast.success("날인 문서 PDF를 다운로드하고 이력을 기록했습니다.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "문서 PDF를 준비하지 못했습니다. 다시 시도해 주세요.");
    }
  };
  if (dashboard.isLoading) return <section className="data-card mt-5 min-h-[360px] p-10 text-center text-sm text-[#637287]"><Clock3 className="mx-auto mb-3 h-5 w-5 animate-pulse" />날인 문서와 다운로드 이력을 불러오는 중입니다.</section>;
  if (dashboard.isError) return <section className="data-card mt-5 min-h-[360px] p-10 text-center"><AlertTriangle className="mx-auto mb-3 h-6 w-6 text-[#bd4949]" /><h2 className="font-bold">문서 이력을 불러오지 못했습니다.</h2><p className="mt-2 text-sm text-[#637287]">{dashboard.error.message}</p><Button className="mt-4 bg-[#0e9f95] hover:bg-[#0b887f]" onClick={() => dashboard.refetch()}>다시 시도</Button></section>;
  const data = dashboard.data;
  if (!data) return null;
  return <section className="data-card mt-5 min-h-[420px]"><div className="data-card-head"><div><p className="panel-kicker">STAMPED DOCUMENT ARCHIVE</p><h2>날인 문서 및 다운로드 이력</h2><p className="mt-1 text-sm text-[#637287]">확정된 보상 합의서를 PDF로 보관하고, 다운로드 시점을 확인합니다.</p></div><Badge className="bg-[#edf7f5] text-[#197a70]"><FileText className="mr-1 h-3.5 w-3.5" />확정 {data.finalizedDocuments.length}건</Badge></div>{data.finalizedDocuments.length ? <div className="divide-y divide-[#e6ece9]">{data.finalizedDocuments.map(document => <article key={document.documentRef} className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><span className="rounded-xl bg-[#eef2f8] p-3 text-[#263e60]"><FileText className="h-5 w-5" /></span><div><div className="flex flex-wrap items-center gap-2"><strong>보상 합의서</strong><Badge className="bg-[#eaf6f4] text-[#087970]">직인 날인·확정</Badge></div><p className="mt-1 font-mono text-xs text-[#65758a]">{document.documentRef}</p><p className="mt-1 text-xs text-[#708093]">확정 {new Date(document.finalizedAt).toLocaleString("ko-KR")} · 다운로드 {document.downloadCount}회{document.lastDownloadedAt ? ` · 최근 ${new Date(document.lastDownloadedAt).toLocaleString("ko-KR")}` : ""}</p></div></div><Button variant="outline" onClick={() => downloadDocument(document.documentRef, document.finalizedAt)} disabled={downloadAudit.isPending}><Download className="mr-1.5 h-4 w-4" />{downloadAudit.isPending ? "PDF 준비 중" : "PDF 다운로드"}</Button></article>)}</div> : <div className="py-16 text-center"><Stamp className="mx-auto mb-3 h-8 w-8 text-[#93a2b1]" /><h2 className="font-bold">다운로드할 날인 문서가 없습니다.</h2><p className="mt-2 text-sm text-[#68788c]">대리점과 화주의 합의가 확정되면 이곳에서 PDF로 내려받을 수 있습니다.</p></div>}{data.downloadEvents.length > 0 && <section className="mt-6 border-t border-[#e6ece9] pt-5"><div className="mb-3 flex items-center justify-between"><div><p className="panel-kicker">DOWNLOAD AUDIT LOG</p><h3 className="mt-1 font-bold">최근 다운로드 이력</h3></div><Badge variant="outline">총 {data.downloadEvents.length}회</Badge></div><div className="divide-y divide-[#edf0ed] rounded-xl border border-[#e1e8e5] bg-[#fcfdfb] px-4">{[...data.downloadEvents].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8).map((event, index) => <div key={`${event.documentRef}-${event.createdAt}-${index}`} className="flex items-center justify-between gap-4 py-3"><div className="min-w-0"><p className="font-mono text-xs font-semibold text-[#334963]">{event.documentRef}</p><p className="mt-1 text-xs text-[#708093]">화주 담당자 PDF 다운로드</p></div><time className="shrink-0 text-right text-xs text-[#65758a]">{new Date(event.createdAt).toLocaleString("ko-KR")}</time></div>)}</div></section>}<div className="mt-5 rounded-xl bg-[#f5f7f4] p-4 text-xs text-[#65758a]"><ShieldCheck className="mr-2 inline h-4 w-4 text-[#0e9f95]" />다운로드 이력에는 문서번호와 시각만 기록됩니다. 직인 이미지와 정산 계좌 원문은 다운로드 이력에 포함되지 않습니다.</div></section>;
}

export default function Home() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const profile = trpc.auth.profile.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  if (authLoading || (isAuthenticated && profile.isLoading)) return <main className="console-access-gate"><div><ShieldCheck /><p className="eyebrow">SECURE WORKSPACE</p><h1>조직 권한을 확인하고 있습니다.</h1><span>담당자별 메뉴를 준비하는 중입니다.</span></div></main>;
  if (!isAuthenticated) return <main className="console-access-gate"><div><LockKeyhole /><p className="eyebrow">SIGN IN REQUIRED</p><h1>로그인 후 업무 공간을 열 수 있습니다.</h1><span>대리점 운영자 또는 화주 담당자의 개인 계정으로 접속해 주세요.</span><Button onClick={() => window.location.assign("/login?returnTo=/console")} className="mt-5 bg-[#0e9f95] hover:bg-[#0b887f]">로그인하기 <ArrowRight /></Button></div></main>;
  if (profile.isError || !profile.data?.organizationType) return <main className="console-access-gate"><div><AlertTriangle /><p className="eyebrow">ROLE NOT ASSIGNED</p><h1>조직 역할을 확인할 수 없습니다.</h1><span>계정 활성화가 완료되지 않았거나 이 업무 공간에 접근할 권한이 없습니다. 초대를 보낸 운영자에게 문의해 주세요.</span><Button onClick={() => window.location.assign("/login")} variant="outline" className="mt-5">로그인 화면으로</Button></div></main>;
  const role: Role = profile.data.organizationType;
  return role === "agency" ? <AgencyConsole /> : <ShipperPortal organizationName={profile.data.organizationName ?? "화주"} />;
}

type Permission = "전체 관리" | "티켓 관리" | "보상 검토" | "화주 관리" | "보고서 열람" | "설정 관리";


function AgreementStampDialog({ onClose }: { onClose: () => void }) {
  const [sealed, setSealed] = useState(false);
  const [amount, setAmount] = useState("185,000");
  const [sealSource] = useState(() => typeof window === "undefined" ? "" : sessionStorage.getItem("logiflow:shipper-seal-preview") || "");
  const [sealName] = useState(() => typeof window === "undefined" ? "화주 프로필 등록 직인" : sessionStorage.getItem("logiflow:shipper-seal-name") || "화주 프로필 등록 직인");
  const { isAuthenticated, user } = useAuth();
  const profile = trpc.auth.profile.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const linkedShippers = trpc.operations.agencyShipperHistory.useQuery(undefined, { enabled: isAuthenticated && profile.data?.organizationType === "agency", retry: false });
  const sealOwnerUserId = profile.data?.organizationType === "agency" ? linkedShippers.data?.find(item => item.ownerUserId)?.ownerUserId ?? user?.id ?? 1 : user?.id ?? 1;
  const storedSeal = trpc.seal.forDocument.useQuery({ ownerUserId: sealOwnerUserId }, { enabled: isAuthenticated && Boolean(sealOwnerUserId), retry: false });
  const recordSealEvent = trpc.operations.recordSealEvent.useMutation();
  const activeSealUrl = storedSeal.data?.url || sealSource;
  const activeSealName = storedSeal.data?.fileName || sealName;
  const applySeal = async () => {
    try {
      if (isAuthenticated) await recordSealEvent.mutateAsync({ shipperUserId: sealOwnerUserId, documentRef: "LF-CA-20260827-021", eventType: "applied" });
      setSealed(true);
      toast.success("화주 등록 직인을 합의서 미리보기에 적용했습니다.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "직인 적용 이력을 기록하지 못했습니다.");
    }
  };
  const finalize = async () => {
    if (!sealed) return toast.error("합의서에 화주 직인을 먼저 적용해 주세요.");
    try {
      if (isAuthenticated) await recordSealEvent.mutateAsync({ shipperUserId: sealOwnerUserId, documentRef: "LF-CA-20260827-021", eventType: "finalized" });
      toast.success("보상 합의서를 생성하고 직인 적용 이력을 기록했습니다.");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "합의서 확정 이력을 기록하지 못했습니다.");
    }
  };
  return <div className="modal-backdrop agreement-backdrop" role="dialog" aria-modal="true" aria-labelledby="agreement-title"><div className="agreement-modal"><header><div><p className="eyebrow">COMPENSATION AGREEMENT · TK-89210</p><h2 id="agreement-title">보상 합의서 및 직인 적용</h2></div><button className="modal-close" onClick={onClose} aria-label="합의서 닫기"><X /></button></header><div className="agreement-layout"><aside><p>문서 정보</p><dl><div><dt>화주</dt><dd>(주)에이블컴퍼니</dd></div><div><dt>사고 유형</dt><dd>파손/분실</dd></div><div><dt>지급 금액</dt><dd><Input value={amount} onChange={event => setAmount(event.target.value)} inputMode="numeric" /> 원</dd></div></dl><div className="seal-source">{activeSealUrl ? <img src={activeSealUrl} alt="화주 등록 직인" /> : <Stamp />}<div><span>직인 출처</span><strong>{activeSealName}</strong><small>{storedSeal.data ? "보안 저장된 화주 직인 자산" : sealSource ? "화주 온보딩에서 선택한 직인 미리보기" : "등록된 직인 이미지 미리보기"}</small></div><BadgeCheck /></div><Button variant="outline" onClick={applySeal} className={sealed ? "seal-apply applied" : "seal-apply"}>{sealed ? <CheckCircle2 /> : <Stamp />}{sealed ? "직인 적용 완료" : "등록 직인 자동 적용"}</Button><p className="agreement-security"><ShieldCheck />직인 적용·문서 생성·다운로드 이벤트는 조직 활동 이력에 기록됩니다.</p></aside><section className="agreement-paper"><div className="paper-meta"><span>DOCUMENT NO. LF-CA-20260827-021</span><span>보상 합의서</span></div><h3>물류 사고 보상 합의서</h3><p>본 합의서는 배송 과정 중 발생한 물품 파손/분실 건에 관한 보상 조건을 확인하기 위하여 작성되었습니다.</p><div className="paper-lines"><span>송장번호 <b>6012938192</b></span><span>보상 대상 <b>파손 상품 1건</b></span><span>합의 금액 <b>₩ {amount}</b></span></div><p>화주와 대리점은 상기 보상 금액 및 처리 조건을 확인하고, 본 문서의 내용을 협의하였습니다.</p><div className="paper-signatures"><div><span>대리점</span><strong>서울중앙물류</strong><i>담당자: 박매니저</i></div><div className="shipper-signature"><span>화주</span><strong>(주)에이블컴퍼니</strong><i>대표자 또는 위임 담당자</i>{sealed && (activeSealUrl ? <img className="seal-imprint-image" src={activeSealUrl} alt="화주 등록 직인 날인" /> : <div className="seal-imprint"><b>에이블</b><span>컴퍼니</span><em>대표인</em></div>)}</div></div><div className="paper-footer">LogiFlow CS Console · Generated preview</div></section></div><footer><span>{sealed ? "직인 적용 미리보기 상태입니다." : "직인을 적용하면 문서의 화주 서명란에 표시됩니다."}</span><div><Button variant="outline" onClick={() => toast("합의서 초안을 저장했습니다.")}>초안 저장</Button><Button onClick={finalize} className="bg-[#0e9f95] hover:bg-[#0b887f]"><FilePenLine />합의서 생성 및 확정</Button></div></footer></div></div>;
}

function ShippersView() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("전체 카테고리");
  const [selectedToken, setSelectedToken] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [shipperName, setShipperName] = useState("");
  const [shipperBusinessNumber, setShipperBusinessNumber] = useState("");
  const [linkToken, setLinkToken] = useState("");
  const { isAuthenticated } = useAuth();
  const profile = trpc.auth.profile.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const history = trpc.operations.agencyShipperHistory.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const agencyName = profile.data?.organizationName || "서울중앙물류";
  const rows = (history.data ?? []).map((item, index) => ({
    token: item.token,
    name: item.name,
    code: `SH-${String(index + 1).padStart(4, "0")}`,
    manager: item.contactCount > 0 ? `담당자 ${item.contactCount}명` : "담당자 미등록",
    ticket: item.sealEvents.length > 0 ? String(item.sealEvents.length) : "0",
    category: item.settlement ? "정산 등록" : "초대/가입",
    subcategory: item.settlement ? `${item.settlement.bank} · ****${item.settlement.accountLast4}` : item.inviteStatus === "claimed" ? "가입 완료" : item.inviteStatus === "expired" ? "초대 만료" : "초대 대기",
    last: new Date(item.claimedAt ?? item.invitedAt).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" }),
    shipments: "-",
    contact: item.contactCount > 0 ? `담당자 ${item.contactCount}명 연결` : "담당자 정보 없음",
    address: "가입 후 상세 정보 확인",
    invite: new Date(item.invitedAt).toLocaleDateString("ko-KR"),
  })).filter(row => (category === "전체 카테고리" || row.category === category) && `${row.name}${row.code}${row.manager}${row.category}${row.subcategory}`.includes(query));
  const inviteUrl = linkToken ? (typeof window === "undefined" ? `/join/${linkToken}` : `${window.location.origin}/join/${linkToken}`) : "";
  const createInvite = trpc.invites.create.useMutation({
    onSuccess: result => {
      setLinkToken(result.token);
      toast.success(`${shipperName.trim()} 전용 초대 링크를 생성했습니다.`);
    },
    onError: error => toast.error(error.message),
  });
  const generate = () => {
    if (!isAuthenticated) return toast.error("대리점 운영자 계정으로 로그인한 뒤 초대 링크를 생성해 주세요.");
    if (profile.data?.organizationType && profile.data.organizationType !== "agency") return toast.error("대리점 계정에서만 화주 초대 링크를 생성할 수 있습니다.");
    if (!shipperName.trim()) return toast.error("초대할 화주사명을 입력해 주세요.");
    if (!/^\d{10}$/.test(shipperBusinessNumber)) return toast.error("초대할 화주의 사업자등록번호 10자리를 숫자로 입력해 주세요.");
    createInvite.mutate({ agencyName, shipperName: shipperName.trim(), businessNumber: shipperBusinessNumber });
  };
  const selected = rows.find(row => row.token === selectedToken) ?? null;
  if (history.isLoading) return <div className="management-page page-enter"><div className="empty-state"><div className="empty-icon"><Building2 /></div><h2>화주 목록을 불러오고 있습니다.</h2><p>초대 및 가입 이력을 실제 DB 기준으로 확인합니다.</p></div></div>;
  if (history.isError) return <div className="management-page page-enter"><div className="empty-state"><div className="empty-icon"><AlertTriangle /></div><h2>화주 목록을 불러오지 못했습니다.</h2><p>{history.error.message}</p><Button onClick={() => history.refetch()} className="mt-4 bg-[#0e9f95] hover:bg-[#0b887f]">다시 시도</Button></div></div>;
  if (selected) return <div className="management-page page-enter company-detail-page"><button className="back-to-directory" onClick={() => setSelectedToken("")}>← 화주 목록</button><div className="management-title"><div><p className="eyebrow">SHIPPER PROFILE · {selected.code}</p><h1>{selected.name}</h1><p>{selected.category} · {selected.subcategory}를 주로 취급하는 연결 화주입니다.</p></div><Button variant="outline" onClick={() => toast(`${selected.name} 담당자에게 운영 안내를 준비했습니다.`)}><Send />운영 안내 보내기</Button></div><div className="company-overview"><div className="company-profile-mark">{selected.name.replace("(주)", "").charAt(0)}</div><div><span>연결 대리점</span><strong>{agencyName}</strong><small><Link2 />초대 링크 가입일 {selected.invite}</small></div><div><span>주력 상품 카테고리</span><strong>{selected.category}</strong><small>{selected.subcategory}</small></div><div><span>월 출고 건수</span><strong>{selected.shipments}건</strong><small>최근 30일 기준</small></div></div><div className="company-detail-grid"><section><header><p className="panel-kicker">BUSINESS PROFILE</p><h2>업체 및 담당자 정보</h2></header><dl><div><dt>화주 코드</dt><dd>{selected.code}</dd></div><div><dt>사업장</dt><dd>{selected.address}</dd></div><div><dt>대표 연락처</dt><dd>{selected.contact}</dd></div><div><dt>등록 담당자</dt><dd>{selected.manager}</dd></div></dl><div className="company-members"><p>CS 수신 담당자</p><div><span>박지수</span><small>CS 담당 · 010-25**-1842</small></div><div><span>최윤서</span><small>물류 담당 · 010-78**-2240</small></div></div></section><section><header><p className="panel-kicker">CS ACTIVITY</p><h2>최근 운영 현황</h2></header><div className="company-activity"><div><strong>{selected.ticket}</strong><span>진행 CS</span></div><div><strong>18m</strong><span>평균 1차 응답</span></div><div><strong>98.6%</strong><span>배송 SLA</span></div></div><div className="company-category-card"><Package /><div><span>취급 카테고리 운영 메모</span><strong>{selected.category} 상품은 완충 포장 및 파손 증빙 안내를 우선 적용합니다.</strong></div></div><Button className="w-full bg-[#12233f] hover:bg-[#203b5e]" onClick={() => toast(`${selected.name}의 티켓 목록을 준비했습니다.`)}>이 화주의 CS 티켓 보기 <ArrowUpRight /></Button></section></div></div>;
  return <div className="management-page page-enter"><div className="management-title"><div><p className="eyebrow">SHIPPER DIRECTORY · 420 ACCOUNTS</p><h1>화주 목록</h1><p>화주별 담당자와 주력 상품 카테고리, 진행 중인 CS 현황을 관리합니다.</p></div><Button className="bg-[#0e9f95] hover:bg-[#0b887f]" onClick={() => setInviteOpen(true)}><Plus />화주 초대</Button></div><div className="management-toolbar"><div className="search-field"><Search /><Input value={query} onChange={event => setQuery(event.target.value)} placeholder="화주명, 코드, 담당자, 카테고리 검색" /></div><select value={category} onChange={event => setCategory(event.target.value)}><option>전체 카테고리</option><option>초대/가입</option><option>정산 등록</option></select><Button variant="outline" onClick={() => toast.success(`실제 DB 기준 화주 ${rows.length}개를 불러왔습니다.`)}><Download />새로고침 안내</Button></div><section className="directory-grid"><div className="directory-stats"><div><span>연결 화주</span><strong>{rows.length}</strong><small>실제 초대/가입 이력 기준</small></div><div><span>가입 완료</span><strong>{rows.filter(row => row.subcategory === "가입 완료").length}</strong><small>claimed 상태 기준</small></div><div><span>정산 등록</span><strong>{rows.filter(row => row.category === "정산 등록").length}</strong><small>정산 정보 저장 기준</small></div></div><div className="directory-table category-directory"><div className="directory-head"><span>화주 / 코드</span><span>등록 담당자</span><span>주력 상품 카테고리</span><span>진행 CS</span><span>최근 활동</span><span /></div>{rows.map(row => <div className="directory-row" key={row.code}><div><strong>{row.name}</strong><small>{row.code}</small></div><div className="member-chip"><UsersRound />{row.manager}</div><div className="category-chip"><Package /><span><strong>{row.category}</strong><small>{row.subcategory}</small></span></div><b>{row.ticket}</b><time>{row.last}</time><button onClick={() => setSelectedToken(row.token)} aria-label={`${row.name} 업체 정보 보기`}><ChevronDown /></button></div>)}{rows.length === 0 && <div className="directory-empty">선택한 조건에 맞는 화주가 없습니다.</div>}</div></section>{inviteOpen && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="shipper-invite-title"><div className="shipper-invite-modal"><button className="modal-close" onClick={() => setInviteOpen(false)} aria-label="화주 초대 닫기"><X /></button><p className="eyebrow">SHIPPER INVITE · {agencyName.toUpperCase()}</p><h2 id="shipper-invite-title">화주 초대 링크 생성</h2><p>이 링크를 통해 가입한 화주는 {agencyName}의 화주로 자동 연결됩니다.</p><div className="invite-target-form"><label>초대할 화주사명<Input value={shipperName} onChange={event => setShipperName(event.target.value)} placeholder="예: (주)에이블컴퍼니" /></label><label>화주 사업자등록번호<Input value={shipperBusinessNumber} onChange={event => setShipperBusinessNumber(event.target.value.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" placeholder="숫자 10자리" /></label></div><div className="invite-link-display"><Link2 /><span>{inviteUrl || "화주사명과 사업자등록번호를 입력한 뒤 링크를 생성해 주세요."}</span><button disabled={!linkToken} onClick={() => { navigator.clipboard?.writeText(inviteUrl); toast.success("화주 초대 링크를 복사했습니다."); }}><Copy />복사</button></div><div className="invite-flow-preview"><span>01. 링크 전달</span><ArrowRight /><span>02. 화주 정보 등록</span><ArrowRight /><span>03. 자동 소속 연결</span></div><div className="invite-modal-actions"><button onClick={generate} disabled={createInvite.isPending}>{createInvite.isPending ? "링크 생성 중..." : linkToken ? "새 링크 생성" : "링크 생성"}</button><Button onClick={() => { if (!linkToken) return toast.error("먼저 유효한 화주 초대 링크를 생성해 주세요."); setInviteOpen(false); toast.success("이 링크로 화주 공지 발송 화면을 준비했습니다."); }} className="bg-[#0e9f95] hover:bg-[#0b887f]"><Send />이 링크로 화주 공지 준비</Button></div></div></div>}</div>;
}

function ShipperOperationsHistoryView() {
  const history = trpc.operations.agencyShipperHistory.useQuery(undefined, { retry: false });
  const [selectedToken, setSelectedToken] = useState("");
  const rows = history.data ?? [];
  const selected = rows.find(item => item.token === selectedToken) ?? rows[0];
  const activeInvites = rows.filter(item => item.inviteStatus === "active").length;
  const pendingSettlements = rows.filter(item => !item.settlement || item.settlement.status !== "verified").length;
  const documentCount = rows.reduce((sum, item) => sum + item.sealEvents.length, 0);
  const formatDate = (value: Date | null | undefined) => value ? new Date(value).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" }) : "기록 없음";
  const inviteLabel = (status: "active" | "claimed" | "expired") => status === "claimed" ? "가입 완료" : status === "expired" ? "초대 만료" : "초대 대기";
  if (history.isLoading) return <div className="management-page page-enter"><div className="empty-state"><div className="empty-icon"><History /></div><h2>화주 운영 이력을 불러오고 있습니다.</h2><p>초대, 정산, 문서 날인 기록을 권한 범위에서 조회합니다.</p></div></div>;
  if (history.isError) return <div className="management-page page-enter"><div className="empty-state"><div className="empty-icon"><AlertTriangle /></div><h2>화주 운영 이력을 불러오지 못했습니다.</h2><p>{history.error.message}</p><Button onClick={() => history.refetch()} className="mt-4 bg-[#0e9f95] hover:bg-[#0b887f]">다시 시도</Button></div></div>;
  if (!selected) return <div className="management-page page-enter"><div className="management-title"><div><p className="eyebrow">SHIPPER OPERATIONS LEDGER</p><h1>화주 운영 이력</h1><p>초대된 화주가 생기면 정산과 문서 날인 활동을 이곳에서 확인할 수 있습니다.</p></div></div><div className="empty-state"><div className="empty-icon"><Building2 /></div><h2>표시할 화주 이력이 없습니다.</h2><p>대리점 전용 초대 링크를 발급하면 화주별 운영 이력이 자동으로 생성됩니다.</p></div></div>;
  const inviteEvents = [{ label: inviteLabel(selected.inviteStatus), detail: `초대 링크 발급 · ${formatDate(selected.invitedAt)}`, time: formatDate(selected.claimedAt ?? selected.expiresAt), tone: "navy" }, ...(selected.settlement ? [{ label: selected.settlement.status === "verified" ? "정산 정보 확인" : "정산 정보 등록", detail: `${selected.settlement.bank} · ****${selected.settlement.accountLast4}`, time: formatDate(selected.settlement.updatedAt), tone: "amber" }] : [])];
  return <div className="management-page history-dashboard page-enter"><div className="management-title"><div><p className="eyebrow">SHIPPER OPERATIONS LEDGER · LIVE STATUS</p><h1>화주 운영 이력</h1><p>초대·정산·문서 날인 활동을 실제 화주 데이터 기준으로 모아 확인합니다.</p></div><Button variant="outline" onClick={() => toast("화주 운영 이력 내보내기를 준비했습니다.")}><Download />이력 내보내기</Button></div><div className="report-kpis"><MetricCard label="초대 대기 화주" value={`${activeInvites}`} detail="유효기간 내 계정 설정 필요" icon={Link2} tone="amber" /><MetricCard label="정산 확인 필요" value={`${pendingSettlements}`} detail="계좌 증빙 또는 정보 보완" icon={Landmark} tone="navy" /><MetricCard label="직인 적용 문서" value={`${documentCount}`} detail="저장된 감사 이력 기준" icon={Stamp} tone="teal" /><MetricCard label="연결 화주" value={`${rows.length}`} detail="초대 발급 이력 기준" icon={Building2} tone="navy" /></div><section className="data-card mt-5"><div className="data-card-head"><div><p className="panel-kicker">SHIPPER LEDGER</p><h2>화주별 운영 상태</h2></div><label className="table-search"><Search className="h-3.5 w-3.5" /><select value={selected.token} onChange={event => setSelectedToken(event.target.value)} aria-label="화주 선택">{rows.map(item => <option key={item.token} value={item.token}>{item.name} · {item.businessNumber}</option>)}</select></label></div><div className="history-company-summary"><div><span>선택 화주</span><strong>{selected.name}</strong><small>사업자등록번호 {selected.businessNumber}</small></div><div><span>초대 상태</span><strong>{inviteLabel(selected.inviteStatus)} · {formatDate(selected.claimedAt ?? selected.invitedAt)}</strong><small>등록 담당자 {selected.contactCount}명</small></div><div><span>정산 상태</span><strong>{selected.settlement ? (selected.settlement.status === "verified" ? "정산 정보 확인" : "정산 계좌 검토") : "정산 정보 미등록"}</strong><small>{selected.settlement ? `${selected.settlement.bank} · ****${selected.settlement.accountLast4}` : "화주 온보딩 후 등록 필요"}</small></div><div><span>문서 날인</span><strong>{selected.sealEvents.length}건</strong><small>직인 원본은 노출하지 않음</small></div></div></section><div className="history-ledger-grid mt-5"><section className="data-card"><div className="data-card-head"><div><p className="panel-kicker">INVITATION & SETTLEMENT</p><h2>초대·정산 이력</h2></div><Badge className="bg-[#edf7f5] text-[#197a70]">실시간 조회</Badge></div><div className="history-event-list">{inviteEvents.map(event => <article key={`${event.label}-${event.time}`}><i className={`history-dot history-${event.tone}`} /><div><strong>{event.label}</strong><small>{event.detail}</small></div><time>{event.time}</time></article>)}</div><div className="history-note"><Landmark /><p><strong>정산 계좌는 마스킹되어 표시됩니다.</strong><span>계좌 원문은 암호화 저장되며, 권한을 가진 처리 절차에서만 사용합니다.</span></p></div></section><section className="data-card"><div className="data-card-head"><div><p className="panel-kicker">DOCUMENT SEAL AUDIT</p><h2>문서 날인 이력</h2></div><Badge className="bg-[#fff4dd] text-[#9c671d]">{selected.sealEvents.length}건</Badge></div><div className="history-event-list">{selected.sealEvents.length ? selected.sealEvents.map(event => <article key={`${event.documentRef}-${event.createdAt}`}><i className="history-dot history-teal" /><div><strong>{event.eventType === "finalized" ? "보상 합의서 확정" : "보상 합의서 직인 적용"}</strong><small>{event.documentRef}</small></div><time>{formatDate(event.createdAt)}</time></article>) : <div className="history-empty"><Stamp /><p>아직 직인 적용 문서가 없습니다.</p><small>화주가 등록한 직인을 문서에 적용하면 감사 이력이 생성됩니다.</small></div>}</div><div className="history-note"><ShieldCheck /><p><strong>직인 원본은 이력 화면에 노출하지 않습니다.</strong><span>문서번호·이벤트·일시만 감사 목적으로 기록합니다.</span></p></div></section></div></div>;
}

function ReportsView() {
  const [period, setPeriod] = useState("이번 주");
  const history = trpc.operations.agencyShipperHistory.useQuery(undefined, { retry: false });
  if (history.isLoading) return <div className="management-page page-enter"><div className="empty-state"><div className="empty-icon"><ClipboardList /></div><h2>업무 보고서를 준비하고 있습니다.</h2><p>실제 초대·정산·문서 이력을 집계 중입니다.</p></div></div>;
  if (history.isError) return <div className="management-page page-enter"><div className="empty-state"><div className="empty-icon"><AlertTriangle /></div><h2>업무 보고서를 불러오지 못했습니다.</h2><p>{history.error.message}</p><Button onClick={() => history.refetch()} className="mt-4 bg-[#0e9f95] hover:bg-[#0b887f]">다시 시도</Button></div></div>;
  const rows = history.data ?? [];
  const claimed = rows.filter(item => item.inviteStatus === "claimed").length;
  const pendingSettlement = rows.filter(item => !item.settlement || item.settlement.status !== "verified").length;
  const documentCount = rows.reduce((sum, item) => sum + item.sealEvents.length, 0);
  const downloads = rows.reduce((sum, item) => sum + item.downloadEvents.length, 0);
  if (rows.length === 0) return <div className="management-page page-enter"><div className="management-title"><div><p className="eyebrow">OPERATIONS REPORT · LIVE RESET</p><h1>업무 보고서</h1><p>실제 초대·정산·문서 이력이 아직 없어 보고서도 빈 상태로 유지합니다.</p></div><div className="report-actions"><select value={period} onChange={event => setPeriod(event.target.value)}><option>오늘</option><option>이번 주</option><option>이번 달</option></select></div></div><div className="report-kpis"><MetricCard label="가입 완료 화주" value={`${claimed}`} detail="실제 DB claimed 초대 기준" icon={CheckCircle2} tone="teal" /><MetricCard label="초대 대기 화주" value={`${rows.length - claimed}`} detail="active/expired 포함" icon={Clock3} tone="navy" /><MetricCard label="정산 확인 필요" value={`${pendingSettlement}`} detail="정산 정보 미등록 또는 검토중" icon={FilePenLine} tone="amber" /><MetricCard label="문서/다운로드 이력" value={`${documentCount}/${downloads}`} detail="직인 이벤트 / PDF 다운로드" icon={AlertTriangle} tone="red" /></div><section className="data-card mt-5 flex min-h-[360px] items-center justify-center"><div className="empty-state max-w-[560px]"><div className="empty-icon"><ClipboardList /></div><h2>표시할 운영 보고서가 없습니다.</h2><p>현재 보이는 KPI만 실제 DB 기준입니다. 아래 일별 추이 차트와 할 일 보드는 샘플 데이터라 숨겨 두었습니다.</p></div></section></div>;
  return <div className="management-page page-enter"><div className="management-title"><div><p className="eyebrow">OPERATIONS REPORT · WEEK 35</p><h1>업무 보고서</h1><p>CS 응답, 보상 처리, 배송 리스크의 운영 신호를 빠르게 확인합니다.</p></div><div className="report-actions"><select value={period} onChange={event => setPeriod(event.target.value)}><option>오늘</option><option>이번 주</option><option>이번 달</option></select></div></div><div className="report-kpis"><MetricCard label="가입 완료 화주" value={`${claimed}`} detail="실제 DB claimed 초대 기준" icon={CheckCircle2} tone="teal" /><MetricCard label="초대 대기 화주" value={`${rows.length - claimed}`} detail="active/expired 포함" icon={Clock3} tone="navy" /><MetricCard label="정산 확인 필요" value={`${pendingSettlement}`} detail="정산 정보 미등록 또는 검토중" icon={FilePenLine} tone="amber" /><MetricCard label="문서/다운로드 이력" value={`${documentCount}/${downloads}`} detail="직인 이벤트 / PDF 다운로드" icon={AlertTriangle} tone="red" /></div><section className="data-card mt-5 flex min-h-[360px] items-center justify-center"><div className="empty-state max-w-[560px]"><div className="empty-icon"><ClipboardList /></div><h2>리포트 상세는 아직 실데이터 연동 전입니다.</h2><p>상단 KPI만 실제 DB 기준으로 표시하고, 차트·액션보드는 더미 데이터가 섞이지 않도록 숨겨 두었습니다.</p></div></section></div>;
}


const permissionRows: { name: string; role: string; organization: string; permissions: Permission[]; initial: string }[] = [
  { name: "김대리", role: "운영 리더", organization: "서울중앙물류", permissions: ["전체 관리"], initial: "김" },
  { name: "박매니저", role: "사고 보상 담당", organization: "서울중앙물류", permissions: ["티켓 관리", "보상 검토", "보고서 열람"], initial: "박" },
  { name: "박지수", role: "화주 CS 담당", organization: "(주)에이블컴퍼니", permissions: ["티켓 관리"], initial: "박" },
  { name: "이현우", role: "화주 운영 매니저", organization: "글로벌커머스", permissions: ["티켓 관리", "보고서 열람"], initial: "이" },
];

function SettingsView() {
  const [tab, setTab] = useState<"agency" | "members" | "shipper" | "documents">("agency");
  const [members, setMembers] = useState(permissionRows);
  const togglePermission = (person: string, permission: Permission) => setMembers(current => current.map(member => member.name !== person ? member : { ...member, permissions: member.permissions.includes(permission) ? member.permissions.filter(item => item !== permission) : [...member.permissions, permission] }));
  return <div className="management-page settings-page page-enter"><div className="management-title"><div><p className="eyebrow">AGENCY ADMINISTRATION · ACCESS CONTROL</p><h1>대리점 설정</h1><p>조직 정보, 화주 연결, 담당자 권한, 문서 자동화 정책을 설정합니다.</p></div><Button variant="outline" onClick={() => toast("설정 변경 사항을 저장했습니다.")}><Check />변경 사항 저장</Button></div><div className="settings-layout"><nav className="settings-nav">{([{ id: "agency", icon: Settings, label: "대리점 기본 설정" }, { id: "members", icon: UserCog, label: "조직 및 담당자 권한" }, { id: "shipper", icon: Building2, label: "화주 조직 관리" }, { id: "documents", icon: FilePenLine, label: "문서·직인 정책" }] as const).map(item => <button key={item.id} onClick={() => setTab(item.id)} className={tab === item.id ? "settings-active" : ""}><item.icon />{item.label}<ChevronDown /></button>)}</nav><section className="settings-content">{tab === "agency" && <><div className="settings-heading"><Settings /><div><h2>대리점 기본 정보</h2><p>화주에게 표시되는 운영 주체와 기본 공지 정보를 관리합니다.</p></div></div><div className="settings-form-grid"><label>대리점명 <Input defaultValue="서울중앙물류" /></label><label>대표 운영 이메일 <Input defaultValue="operation@seoulcentral.co.kr" /></label><label>대표 연락처 <Input defaultValue="02-3278-2100" /></label><label>CS 응답 기준 <select defaultValue="30"><option value="30">30분 이내</option><option value="60">1시간 이내</option><option value="120">2시간 이내</option></select></label></div><div className="settings-notice"><Bell /><div><strong>화주 공지 발송 권한</strong><span>운영 리더와 초대 권한 보유자만 발송 최종 확인 화면을 진행할 수 있습니다.</span></div><BadgeCheck /></div></>}{tab === "members" && <><div className="settings-heading"><UserCog /><div><h2>대리점·화주 담당자 권한</h2><p>조직별로 여러 담당자를 등록하고, 업무 범위에 맞는 최소 권한을 부여합니다.</p></div><div className="ml-auto flex gap-2"><Button variant="outline" onClick={() => window.location.assign("/staff-invite?role=shipper")}>화주 담당자 초대</Button><Button onClick={() => window.location.assign("/staff-invite?role=agency&organization=%EC%84%9C%EC%9A%B8%EC%A4%91%EC%95%99%EB%AC%BC%EB%A5%98")} className="bg-[#0e9f95] hover:bg-[#0b887f]"><Plus />대리점 담당자 추가</Button></div></div><div className="permission-table">{members.map(member => <article key={`${member.organization}-${member.name}`}><div className="permission-person"><span>{member.initial}</span><div><strong>{member.name}</strong><small>{member.role} · {member.organization}</small></div></div><div className="permission-chips">{(["전체 관리", "티켓 관리", "보상 검토", "화주 관리", "보고서 열람", "설정 관리"] as Permission[]).map(permission => <button key={permission} className={member.permissions.includes(permission) ? "permission-on" : ""} onClick={() => { togglePermission(member.name, permission); toast(`${member.name}의 ${permission} 권한을 변경했습니다.`); }}><Check />{permission}</button>)}</div><button className="more-member" onClick={() => toast(`${member.name}의 상세 권한 설정을 엽니다.`)}><MoreHorizontal /></button></article>)}</div></>}{tab === "shipper" && <><div className="settings-heading"><Building2 /><div><h2>화주 조직 연결 관리</h2><p>초대 링크로 가입한 화주의 소속과 담당자 수신 정책을 관리합니다.</p></div></div><div className="org-directory empty-state"><Building2 /><h2>연결된 화주 조직이 없습니다.</h2><p>화주가 초대 링크로 가입하면 이곳에 소속과 담당자 수신 정책이 표시됩니다.</p></div></>}{tab === "documents" && <><div className="settings-heading"><FilePenLine /><div><h2>문서 및 직인 사용 정책</h2><p>보상 합의서 등 지정 문서에 적용할 화주 등록 직인과 기록 방식을 관리합니다.</p></div></div><div className="document-policy"><section><div className="policy-icon"><Stamp /></div><div><strong>화주 등록 직인 사용</strong><small>보상 합의서 미리보기에서 자동 적용을 허용합니다.</small></div><button className="policy-switch policy-switch-on" onClick={() => toast("직인 자동 적용 정책은 현재 활성 상태입니다.")}><i /></button></section><section><div className="policy-icon"><History /></div><div><strong>직인 사용 이력 기록</strong><small>문서 생성, 직인 적용, 다운로드 기록을 보관합니다.</small></div><button className="policy-switch policy-switch-on" onClick={() => toast("문서 이력 기록은 현재 활성 상태입니다.")}><i /></button></section><section><div className="policy-icon"><KeyRound /></div><div><strong>직인 적용 권한</strong><small>사고 보상 담당 및 대리점 운영 리더만 실행할 수 있습니다.</small></div><button onClick={() => toast("직인 적용 권한 설정을 엽니다.")} className="policy-link">권한 보기 <ArrowDownRight /></button></section></div><div className="policy-alert"><LockKeyhole /><p><strong>직인은 민감 문서 자산으로 관리됩니다.</strong><span>이 화면의 자동 날인은 내부 운영 미리보기이며, 실제 문서 발행·보관 환경에서는 조직별 접근 제어와 저장 정책을 적용해야 합니다.</span></p></div></>}</section></div></div>;
}
