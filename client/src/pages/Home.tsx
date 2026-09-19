/**
 * Design system: Operational Blueprint — restrained Swiss information design for a logistics command console.
 * Dense operational data is ordered through calm ivory surfaces, ink-navy type, and selective signal-teal actions.
 */
import { useEffect, useMemo, useRef, useState } from "react";
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
  BellRing,
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
  MoreVertical,
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

type TicketType = "파손/분실" | "배송지연" | "오배송" | "주소변경" | "미수령 확인요청" | "배송문의" | "기타";
type TicketStatus = "접수" | "확인 중" | "보상 접수 요청" | "보상 검토" | "보상 확정" | "처리 완료";
type CsTicket = {
  code: string;
  type: TicketType;
  status: TicketStatus;
  checkDetail: CheckDetail | null;
  isIssue: boolean;
  issueNote: string;
  feedbackAt: Date | string | null;
  feedbackSeenAt: Date | string | null;
  events: { id: number; actorRole: "shipper" | "agency"; actorName: string; action: string; createdAt: Date | string }[];
  shipperName: string;
  trackingNumber: string;
  recipient: string;
  note: string;
  result: string;
  createdByRole: "shipper" | "agency";
  shipperUserId: number;
  agencyUserId: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  evidence: { category: EvidenceCategory; fileName: string; url: string; createdAt: Date | string }[];
};

const ticketStatusStyles: Record<TicketStatus, string> = {
  접수: "bg-[#eef2ff] text-[#5264a7] border-[#dce2fb]",
  "확인 중": "bg-[#e7f6f2] text-[#0b7d72] border-[#cbe9e3]",
  "보상 접수 요청": "bg-[#fff7df] text-[#a16b07] border-[#f2e1aa]",
  "보상 검토": "bg-[#fff7df] text-[#a16b07] border-[#f2e1aa]",
  "보상 확정": "bg-[#eaf6f4] text-[#087970] border-[#cbe9e3]",
  "처리 완료": "bg-[#f0f3ef] text-[#5d7264] border-[#dde5dc]",
};
const ticketTypeOptions: TicketType[] = ["파손/분실", "배송지연", "오배송", "주소변경", "미수령 확인요청", "배송문의", "기타"];
type CheckDetail = "대리점 확인중" | "기사 확인중";

const isUnreadTicket = (ticket: CsTicket) => Boolean(ticket.feedbackAt && (!ticket.feedbackSeenAt || new Date(ticket.feedbackAt) > new Date(ticket.feedbackSeenAt)));

function CsTicketHistory({ ticket, hideBulk, onDoubleClick }: { ticket: CsTicket; hideBulk?: boolean; onDoubleClick?: React.MouseEventHandler<HTMLElement> }) {
  return (
    <aside className="cs-ticket-history" onDoubleClick={onDoubleClick} aria-label={`${ticket.code} 처리 히스토리`}>
      <p className="cs-history-title">HISTORY</p>
      {ticket.events.length === 0 ? (
        <p className="cs-history-empty">아직 기록이 없습니다.</p>
      ) : (
        <ol>
          {ticket.events.map(event => (
            <li key={event.id}>
              <span className={`cs-history-dot ${event.actorRole}`} />
              <div>
                <p>{hideBulk ? event.action.replace(" · 일괄 처리", "") : event.action}</p>
                <small>{event.actorName || (event.actorRole === "shipper" ? "화주" : "대리점")} · {new Date(event.createdAt).toLocaleString("ko-KR")}</small>
              </div>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}

type EvidenceCategory = "damage_photo" | "damage_video" | "price_proof" | "compensation_proof";
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
  compensation_proof: {
    maxFiles: 5,
    maxBytes: 7 * 1024 * 1024,
    accept: ["image/jpeg", "image/png", "image/webp"],
    label: "보상 증빙 이미지",
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

const COURIERS = ["한진택배", "CJ대한통운", "로젠택배", "우체국택배", "대신통운", "경동해운", "기타"];

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
      <span className="logo-mark"><Sparkles /></span>
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

function TicketTag({ type }: { type: TicketType }) {
  const classes = {
    "파손/분실": "bg-[#f9eded] text-[#b04a4a] border-[#efd7d7]",
    배송지연: "bg-[#fff7df] text-[#a16b07] border-[#f2e1aa]",
    오배송: "bg-[#eef2ff] text-[#5264a7] border-[#dce2fb]",
    주소변경: "bg-[#eef8f7] text-[#17796f] border-[#d8eeea]",
    "미수령 확인요청": "bg-[#fdf2ec] text-[#a06b3a] border-[#f2ddcb]",
    배송문의: "bg-[#f0f4f8] text-[#4a6a8a] border-[#dbe4ec]",
    기타: "bg-[#f2f2f0] text-[#6a7568] border-[#e0e5df]",
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
              <span className="ml-auto text-[11px] text-white/40"><ShipperCountValue /></span>
            )}
          </button>
        ))}
      </div>
      <div
        className="sidebar-utility mt-auto overflow-hidden"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(18,35,63,.82), rgba(18,35,63,.95))",
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
          <ShipperCountValue />
        </span>
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      <TrackingLookup />
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
      <ConsoleIdentity />
    </header>
  );
}

function ConsoleIdentity() {
  const profile = trpc.auth.profile.useQuery();
  const name = profile.data?.contactName || "담당자";
  return <div className="hidden items-center gap-2.5 border-l border-[#e2e6e1] pl-4 sm:flex"><Avatar className="h-8 w-8 border border-[#dce7e4]"><AvatarFallback className="bg-[#e7f5f3] text-[11px] font-bold text-[#17796f]">{name.slice(0, 1)}</AvatarFallback></Avatar><div className="leading-tight"><p className="text-xs font-bold text-[#25364b]">{name}</p><p className="mt-0.5 text-[#8490a0]">{profile.data?.organizationName || "대리점"}</p></div></div>;
}

function ShipperCountValue() {
  const list = trpc.invites.list.useQuery(undefined, { retry: false });
  return <>{list.data?.length ?? "..."}</>;
}

function TrackingLookup() {
  const [trackingNumber, setTrackingNumber] = useState("");
  const utils = trpc.useUtils();
  const submit = () => {
    if (!/^[0-9A-Za-z-]{6,24}$/.test(trackingNumber)) return toast.error("송장번호 6~24자를 입력해 주세요.");
    toast.promise(utils.tracking.lookup.fetch({ trackingNumber }).then(result => result.message), { success: message => message, error: error => (error instanceof Error ? error.message : "배송 조회에 실패했습니다.") });
  };
  return <div className="track-shell"><Truck className="h-4 w-4" /><Input className="h-8 w-44 border-0 bg-transparent px-1 text-[12px] shadow-none focus-visible:ring-0" value={trackingNumber} onChange={event => setTrackingNumber(event.target.value)} placeholder="송장번호 입력 후 조회" onKeyDown={event => { if (event.key === "Enter") submit(); }} /><button type="button" className="track-button" onClick={submit}>조회</button></div>;
}

function csDisplayStatus(ticket: CsTicket): string {
  return ticket.status === "확인 중" && ticket.checkDetail ? ticket.checkDetail : ticket.status;
}

function CsDetailModal({ ticket, onClose, hideBulk }: { ticket: CsTicket; onClose: () => void; hideBulk?: boolean }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={`${ticket.code} 상세`}>
      <div className="shipper-invite-modal cs-detail-modal">
        <button className="modal-close" onClick={onClose} aria-label="CS 상세 닫기"><X /></button>
        <p className="eyebrow">CS TICKET DETAIL</p>
        <div className="flex flex-wrap items-center gap-2">
          <strong className="text-lg text-[#2c4357]">{ticket.code}</strong>
          <TicketTag type={ticket.type} />
          <Badge className={ticket.status === "확인 중" && ticket.checkDetail ? ticketStatusStyles["확인 중"] : ticketStatusStyles[ticket.status]}>{csDisplayStatus(ticket)}</Badge>
          {ticket.isIssue && <Badge className="bg-[#f9eded] text-[#b04a4a] border-[#efd7d7]">이슈건</Badge>}
        </div>
        <div className="cs-detail-grid">
          <div><small>접수 주체</small><p>{ticket.createdByRole === "shipper" ? "화주 접수" : "대리점 접수"}</p></div>
          <div><small>접수 시각</small><p>{new Date(ticket.createdAt).toLocaleString("ko-KR")}</p></div>
          <div><small>송장번호</small><p>{ticket.trackingNumber || "-"}</p></div>
          <div><small>수령인</small><p>{ticket.recipient || "-"}</p></div>
        </div>
        <div className="cs-detail-section">
          <small>상세 내용</small>
          <p>{ticket.note}</p>
        </div>
        {ticket.result ? <div className="cs-detail-section"><small>처리결과</small><p>{ticket.result}</p></div> : null}
        {ticket.isIssue && ticket.issueNote ? <div className="cs-detail-section"><small>이슈 사유</small><p>{ticket.issueNote}</p></div> : null}
        <div className="cs-detail-section">
          <small>첨부 증빙 {ticket.evidence.length}건</small>
          {ticket.evidence.length === 0 ? <p className="cs-detail-empty">첨부된 증빙이 없습니다.</p> : (
            <div className="cs-ticket-evidence">
              {ticket.evidence.map((ev, index) => (
                <a key={index} href={ev.url} target="_blank" rel="noreferrer">{evidenceRules[ev.category]?.label ?? ev.category} · {ev.fileName}</a>
              ))}
            </div>
          )}
        </div>
        <div className="cs-detail-section">
          <small>처리 히스토리</small>
          <CsTicketHistory ticket={ticket} hideBulk={hideBulk} />
        </div>
      </div>
    </div>
  );
}

function TicketsView() {
  const utils = trpc.useUtils();
  const csList = trpc.cs.list.useQuery(undefined, { retry: false });
  const history = trpc.operations.agencyShipperHistory.useQuery(undefined, { retry: false });
  const csUpdate = trpc.cs.agencyUpdate.useMutation({
    onSuccess: async () => {
      await utils.cs.list.invalidate();
      toast.success("CS 상태를 변경했습니다.");
    },
    onError: error => toast.error(error.message),
  });
  const csBulk = trpc.cs.bulkConfirm.useMutation({
    onSuccess: async (_data, variables) => {
      await utils.cs.list.invalidate();
      toast.success(`선택한 ${variables.codes.length}건을 확인 중(${variables.checkDetail})으로 변경했습니다.`);
    },
    onError: error => toast.error(error.message),
  });
  const csCreate = trpc.cs.create.useMutation({
    onSuccess: async () => {
      await utils.cs.list.invalidate();
      toast.success("화주에게 CS를 접수했습니다. 화주 포털에 즉시 표시됩니다.");
    },
    onError: error => toast.error(error.message),
  });
  const rows = csList.data ?? [];
  const todayKey = new Date().toDateString();
  const todayCount = rows.filter(ticket => new Date(ticket.createdAt).toDateString() === todayKey).length;
  const checkingRows = rows.filter(ticket => ticket.status === "확인 중");
  const issueRows = rows.filter(ticket => ticket.isIssue && ticket.status !== "처리 완료");
  const doneCount = rows.filter(ticket => ticket.status === "처리 완료").length;
  const claimedShippers = (history.data ?? []).filter(item => item.inviteStatus === "claimed" && item.ownerUserId);
  const [createOpen, setCreateOpen] = useState(false);
  const [formType, setFormType] = useState<TicketType>("파손/분실");
  const [formTracking, setFormTracking] = useState("");
  const [formNote, setFormNote] = useState("");
  const [formShipper, setFormShipper] = useState("");
  const [typeEdits, setTypeEdits] = useState<Record<string, TicketType>>({});
  const [checkEdits, setCheckEdits] = useState<Record<string, CheckDetail>>({});
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [bulkDetail, setBulkDetail] = useState<CheckDetail>("대리점 확인중");
  const [issueEditCode, setIssueEditCode] = useState<string | null>(null);
  const [detailCode, setDetailCode] = useState<string | null>(null);
  const detailTicket = detailCode ? rows.find(ticket => ticket.code === detailCode) ?? null : null;
  const [issueEditText, setIssueEditText] = useState("");
  const toggleSelect = (code: string) => setSelectedCodes(current => current.includes(code) ? current.filter(item => item !== code) : [...current, code]);
  return (
    <div className="page-enter flex min-h-0 flex-1 flex-col overflow-y-auto p-4 sm:p-6">
      <div className="content-title-row">
        <div>
          <p className="eyebrow">CS TICKETS · LIVE DATA</p>
          <h1>CS 처리 현황</h1>
          <p className="subtitle">전체 화주가 접수한 CS와 대리점 접수 CS를 한 곳에서 처리합니다.</p>
        </div>
        <Button className="bg-[#0e9f95] hover:bg-[#0b887f]" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          화주 CS 접수
        </Button>
      </div>
      <div className="cs-stat-grid">
        <div className="cs-stat navy"><p>금일 접수 CS</p><strong>{todayCount}<span>건</span></strong><small>전체 화주 접수 기준 · 실시간</small></div>
        <div className="cs-stat mint"><p>확인 중</p><strong>{checkingRows.length}<span>건</span></strong><small>대리점 확인중 {checkingRows.filter(t => t.checkDetail === "대리점 확인중").length} · 기사 확인중 {checkingRows.filter(t => t.checkDetail === "기사 확인중").length}</small></div>
        <div className="cs-stat orange"><p>이슈건</p><strong>{issueRows.length}<span>건</span></strong><small>확인·판단이 지연된 건</small></div>
        <div className="cs-stat steel"><p>처리 완료</p><strong>{doneCount}<span>건</span></strong><small>누적 기준</small></div>
      </div>
      <section className="data-card mt-5">
        <div className="data-card-head">
          <div><p className="panel-kicker">TICKET BOARD · 전체 {rows.length}건 · 금일 {todayCount}건</p><h2>실시간 CS 티켓</h2></div>
          <Badge className="bg-[#edf7f5] text-[#197a70]">실시간 조회</Badge>
        </div>
        {selectedCodes.length > 0 && (
          <div className="cs-bulk-bar">
            <strong>선택 {selectedCodes.length}건</strong>
            <select value={bulkDetail} onChange={event => setBulkDetail(event.target.value as CheckDetail)}>
              <option value="대리점 확인중">대리점 확인중</option>
              <option value="기사 확인중">기사 확인중</option>
            </select>
            <button className="cs-action teal" onClick={() => csBulk.mutate({ codes: selectedCodes, checkDetail: bulkDetail }, { onSuccess: () => setSelectedCodes([]) })}>일괄 확인 중 변경</button>
            <button className="cs-action" onClick={() => setSelectedCodes([])}>선택 해제</button>
          </div>
        )}
        {csList.isLoading ? (
          <p className="p-8 text-center text-sm text-[#637287]">CS 티켓을 불러오는 중입니다.</p>
        ) : rows.length === 0 ? (
          <div className="empty-state m-6">
            <div className="empty-icon"><Inbox /></div>
            <h2>아직 접수된 CS가 없습니다.</h2>
            <p>화주 포털의 건별 CS 접수 또는 우측 상단의 화주 CS 접수로 티켓이 생성됩니다.</p>
          </div>
        ) : (
          <div className="cs-ticket-list">
            {rows.map(ticket => {
              const pendingType = typeEdits[ticket.code] ?? ticket.type;
              const pendingCheck = checkEdits[ticket.code] ?? ticket.checkDetail ?? "대리점 확인중";
              return (
                <article className={`cs-ticket-card${ticket.isIssue ? " is-issue" : ""}`} key={ticket.code} onDoubleClick={() => setDetailCode(ticket.code)} title="더블클릭하면 상세 내용이 열립니다.">
                  <label className="cs-ticket-check">
                    <input type="checkbox" checked={selectedCodes.includes(ticket.code)} onChange={() => toggleSelect(ticket.code)} aria-label={`${ticket.code} 선택`} />
                  </label>
                  <div className="cs-ticket-main">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong>{ticket.code}</strong>
                      <TicketTag type={ticket.type} />
                      <Badge className={ticket.status === "확인 중" && ticket.checkDetail ? ticketStatusStyles["확인 중"] : ticketStatusStyles[ticket.status]}>{csDisplayStatus(ticket)}</Badge>
                      {ticket.isIssue && <Badge className="bg-[#f9eded] text-[#b04a4a] border-[#efd7d7]">이슈건</Badge>}
                      <small>{ticket.createdByRole === "shipper" ? "화주 접수" : "대리점 접수"} · {new Date(ticket.createdAt).toLocaleString("ko-KR")}</small>
                    </div>
                    <p className="cs-ticket-note">{ticket.note}</p>
                    <small>{ticket.shipperName} · 송장 {ticket.trackingNumber}{ticket.result ? ` · 처리결과: ${ticket.result}` : ""}</small>
                    {ticket.isIssue && <p className="cs-issue-note">이슈건으로 관리 중입니다. 확인되는 대로 업데이트하겠습니다.{ticket.issueNote ? ` · 사유: ${ticket.issueNote}` : ""}</p>}
                    {ticket.evidence.length > 0 && (
                      <div className="cs-ticket-evidence">
                        {ticket.evidence.map((ev, index) => (
                          <a key={index} href={ev.url} target="_blank" rel="noreferrer">{evidenceRules[ev.category]?.label ?? ev.category} · {ev.fileName}</a>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="cs-ticket-actions" onDoubleClick={event => event.stopPropagation()}>
                    {(ticket.status === "접수" || ticket.status === "확인 중") && <button className="cs-action" onClick={() => csUpdate.mutate({ ticketCode: ticket.code, status: "확인 중", checkDetail: ticket.checkDetail ?? "대리점 확인중" })}>확인 중 전환</button>}
                    {(ticket.status === "접수" || ticket.status === "확인 중") && <button className="cs-action amber" onClick={() => { if (window.confirm(`${ticket.code} 티켓을 보상 접수 요청 상태로 전환합니다. 화주가 보상 증빙을 등록하면 보상 검토로 이동합니다.`)) csUpdate.mutate({ ticketCode: ticket.code, status: "보상 접수 요청" }); }}>보상 접수 요청</button>}
                    {ticket.status === "보상 검토" && <button className="cs-action teal" onClick={() => { if (window.confirm(`${ticket.code} 티켓을 보상 확정 처리합니다.`)) csUpdate.mutate({ ticketCode: ticket.code, status: "보상 확정" }); }}>보상 확정</button>}
                    {ticket.status !== "처리 완료" && <button className="cs-action" onClick={() => { if (window.confirm(`${ticket.code} 티켓을 처리 완료로 종결합니다.`)) csUpdate.mutate({ ticketCode: ticket.code, status: "처리 완료" }); }}>처리 완료</button>}
                    {ticket.status !== "처리 완료" && (ticket.isIssue ? (
                      <button className="cs-action danger" onClick={() => { if (window.confirm(`${ticket.code} 티켓을 이슈건에서 해제합니다.`)) csUpdate.mutate({ ticketCode: ticket.code, isIssue: false }); }}>이슈건 해제</button>
                    ) : issueEditCode === ticket.code ? (
                      <div className="cs-issue-edit">
                        <input value={issueEditText} onChange={event => setIssueEditText(event.target.value)} placeholder="이슈 사유 입력" autoFocus />
                        <button className="cs-action amber" onClick={() => { if (issueEditText.trim().length < 2) return toast.error("이슈 사유를 2자 이상 입력해 주세요."); csUpdate.mutate({ ticketCode: ticket.code, isIssue: true, issueNote: issueEditText.trim() }, { onSuccess: () => { setIssueEditCode(null); setIssueEditText(""); } }); }}>등록</button>
                        <button className="cs-action" onClick={() => { setIssueEditCode(null); setIssueEditText(""); }}>취소</button>
                      </div>
                    ) : (
                      <button className="cs-action danger" onClick={() => { setIssueEditCode(ticket.code); setIssueEditText(""); }}>이슈건 등록</button>
                    ))}
                    {ticket.status === "확인 중" && (
                      <div className="cs-type-change">
                        <select value={pendingCheck} onChange={event => setCheckEdits(current => ({ ...current, [ticket.code]: event.target.value as CheckDetail }))}>
                          <option value="대리점 확인중">대리점 확인중</option>
                          <option value="기사 확인중">기사 확인중</option>
                        </select>
                        <button disabled={pendingCheck === ticket.checkDetail} onClick={() => { csUpdate.mutate({ ticketCode: ticket.code, checkDetail: pendingCheck }); setCheckEdits(current => { const next = { ...current }; delete next[ticket.code]; return next; }); }}>확인 주체 변경</button>
                      </div>
                    )}
                    <div className="cs-type-change">
                      <select value={pendingType} onChange={event => setTypeEdits(current => ({ ...current, [ticket.code]: event.target.value as TicketType }))}>
                        {ticketTypeOptions.map(option => <option key={option}>{option}</option>)}
                      </select>
                      <button disabled={pendingType === ticket.type} onClick={() => { csUpdate.mutate({ ticketCode: ticket.code, type: pendingType }); setTypeEdits(current => { const next = { ...current }; delete next[ticket.code]; return next; }); }}>유형 변경</button>
                    </div>
                  </div>
                  <CsTicketHistory ticket={ticket} onDoubleClick={event => event.stopPropagation()} />
                </article>
              );
            })}
          </div>
        )}
      </section>
      {createOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="agency-cs-create">
          <div className="shipper-invite-modal">
            <button className="modal-close" onClick={() => setCreateOpen(false)} aria-label="화주 CS 접수 닫기"><X /></button>
            <p className="eyebrow">AGENCY CS REQUEST</p>
            <h2 id="agency-cs-create">화주 CS 접수</h2>
            <p>대리점에서 먼저 CS를 접수하면 해당 화주 포털의 내 CS 문의에 즉시 표시됩니다.</p>
            <div className="invite-target-form">
              <label>대상 화주
                <select value={formShipper} onChange={event => setFormShipper(event.target.value)} className="h-10 rounded-lg border border-[#dae5e2] bg-white px-3 text-sm">
                  <option value="">화주 선택</option>
                  {claimedShippers.map(item => <option key={item.token} value={item.token}>{item.name}</option>)}
                </select>
              </label>
              <label>문의 유형
                <select value={formType} onChange={event => setFormType(event.target.value as TicketType)} className="h-10 rounded-lg border border-[#dae5e2] bg-white px-3 text-sm">
                  {ticketTypeOptions.map(option => <option key={option}>{option}</option>)}
                </select>
              </label>
              <label>송장번호
                <Input value={formTracking} onChange={event => setFormTracking(event.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="예: 6012938192" />
              </label>
              <label>상세 내용
                <textarea value={formNote} onChange={event => setFormNote(event.target.value)} className="min-h-[90px] rounded-lg border border-[#dae5e2] p-3 text-sm" placeholder="CS 내용을 입력하세요." />
              </label>
            </div>
            <div className="invite-modal-actions">
              <button onClick={() => setCreateOpen(false)}>취소</button>
              <Button className="bg-[#0e9f95] hover:bg-[#0b887f]" disabled={csCreate.isPending} onClick={() => {
                const shipper = claimedShippers.find(item => item.token === formShipper);
                if (!shipper) return toast.error("CS를 접수할 화주를 선택해 주세요.");
                if (!/^\d{8,}$/.test(formTracking.trim())) return toast.error("송장번호를 숫자 8자리 이상으로 입력해 주세요.");
                if (formNote.trim().length < 2) return toast.error("상세 내용을 입력해 주세요.");
                csCreate.mutate({ type: formType, trackingNumber: formTracking.trim(), note: formNote.trim(), shipperToken: formShipper }, { onSuccess: () => { setCreateOpen(false); setFormTracking(""); setFormNote(""); } });
              }}>{csCreate.isPending ? "접수 중..." : "CS 접수"}</Button>
            </div>
          </div>
        </div>
      )}
      {detailTicket && <CsDetailModal ticket={detailTicket} onClose={() => setDetailCode(null)} />}
    </div>
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

function ShipperIssueSummary() {
  return <section className="shipper-summary"><div className="shipper-summary-head"><div><p className="panel-kicker">CS ISSUE SNAPSHOT · LIVE RESET</p><h2>실제 접수 데이터가 들어오면 요약이 표시됩니다.</h2></div><span><BarChart3 />현재는 샘플 요약 숨김</span></div><div className="empty-state border border-dashed border-[#d8e1de] bg-[#fbfcfb] py-10"><div className="empty-icon"><BarChart3 /></div><h2>더미 이슈 요약을 제거했습니다.</h2><p>DB 초기화 후에는 실제 접수 건이 쌓이기 전까지 요약 차트와 건수가 비어 있는 상태가 맞습니다.</p></div></section>;
}

function ShipperPortal({ organizationName }: { organizationName: string }) {
  const [tab, setTab] = useState<"tickets" | "risk" | "completed" | "documents" | "settlement">("tickets");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const { logout } = useAuth();

  const [tracking, setTracking] = useState("");
  const [issueType, setIssueType] = useState<TicketType>("파손/분실");
  const [details, setDetails] = useState("");
  const [damagePhotos, setDamagePhotos] = useState<EvidenceFile[]>([]);
  const [damageVideos, setDamageVideos] = useState<EvidenceFile[]>([]);
  const [priceProofs, setPriceProofs] = useState<EvidenceFile[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);
  const evidenceUpload = trpc.evidence.upload.useMutation();
  const csCreate = trpc.cs.create.useMutation();
  const csSubmitReview = trpc.cs.submitForReview.useMutation();
  const csUtils = trpc.useUtils();
  const csMarkSeen = trpc.cs.markFeedbackSeen.useMutation({
    onSuccess: async () => {
      await csUtils.cs.list.invalidate();
      toast.success("CS 피드백을 모두 확인 처리했습니다.");
    },
  });
  const csList = trpc.cs.list.useQuery(undefined, { retry: false });
  const shipperTickets = (csList.data ?? []).filter(ticket =>
    `${ticket.trackingNumber}${ticket.recipient}`.includes(search)
  );
  const completedTickets = shipperTickets.filter(ticket => ticket.status === "처리 완료");
  const unreadFeedbackCount = (csList.data ?? []).filter(isUnreadTicket).length;
  const [compensationProofs, setCompensationProofs] = useState<EvidenceFile[]>([]);
  const [compensationTarget, setCompensationTarget] = useState("");
  const [detailCode, setDetailCode] = useState<string | null>(null);
  const detailTicket = detailCode ? (csList.data ?? []).find(ticket => ticket.code === detailCode) ?? null : null;
  const compensationInputRef = useRef<HTMLInputElement>(null);
  const selectedFiles = {
    damage_photo: damagePhotos,
    damage_video: damageVideos,
    price_proof: priceProofs,
    compensation_proof: compensationProofs,
  };
  const setSelectedFiles: Record<
    EvidenceCategory,
    React.Dispatch<React.SetStateAction<EvidenceFile[]>>
  > = {
    damage_photo: setDamagePhotos,
    damage_video: setDamageVideos,
    price_proof: setPriceProofs,
    compensation_proof: setCompensationProofs,
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
    setCompensationProofs([]);
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
    let requestRef: string;
    try {
      const created = await csCreate.mutateAsync({ type: issueType, trackingNumber: tracking.trim(), note: details.trim() });
      requestRef = created.code;
      await csUtils.cs.list.invalidate();
    } catch (error) {
      return toast.error(error instanceof Error ? error.message : "CS 접수에 실패했습니다. 다시 시도해 주세요.");
    }
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
  const renderTicketCard = (ticket: CsTicket) => (
    <article className="cs-ticket-card" key={ticket.code} onDoubleClick={() => setDetailCode(ticket.code)} title="더블클릭하면 상세 내용이 열립니다.">
      <div className="cs-ticket-main">
        <div className="flex flex-wrap items-center gap-2">
          <strong>{ticket.code}</strong>
          <TicketTag type={ticket.type} />
          <Badge className={ticket.status === "확인 중" && ticket.checkDetail ? ticketStatusStyles["확인 중"] : ticketStatusStyles[ticket.status]}>{csDisplayStatus(ticket)}</Badge>
          {ticket.isIssue && <Badge className="bg-[#f9eded] text-[#b04a4a] border-[#efd7d7]">이슈건</Badge>}
          {isUnreadTicket(ticket) && <Badge className="bg-[#fdeef0] text-[#c0455a] border-[#f4d3d8]">새 피드백</Badge>}
          <small>{ticket.createdByRole === "shipper" ? "내가 접수" : "대리점 접수"} · {new Date(ticket.createdAt).toLocaleString("ko-KR")}</small>
        </div>
        <p className="cs-ticket-note">{ticket.note}</p>
        {ticket.isIssue && <p className="cs-issue-note">대리점에서 확인 중입니다. 확인되는 대로 업데이트해 드리겠습니다.{ticket.issueNote ? ` · 사유: ${ticket.issueNote}` : ""}</p>}
        <small>송장 {ticket.trackingNumber}{ticket.result ? ` · 처리결과: ${ticket.result}` : ""}</small>
        {ticket.evidence.length > 0 && (
          <div className="cs-ticket-evidence">
            {ticket.evidence.map((ev, index) => (
              <a key={index} href={ev.url} target="_blank" rel="noreferrer">
                {evidenceRules[ev.category]?.label ?? ev.category} · {ev.fileName}
              </a>
            ))}
          </div>
        )}
        {ticket.status === "보상 접수 요청" && compensationTarget === ticket.code && (
          <div className="compensation-upload">
            <input
              ref={compensationInputRef}
              className="sr-only"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={event => {
                updateEvidence("compensation_proof", event.target.files);
                event.currentTarget.value = "";
              }}
            />
            <button type="button" className="price-proof-dropzone" onClick={() => compensationInputRef.current?.click()}>
              <UploadCloud />
              <span>보상 증빙 이미지 등록</span>
              <small>JPG · PNG · WEBP / 장당 7MB</small>
            </button>
            {compensationProofs.length > 0 && (
              <div className="image-preview-row">
                {compensationProofs.map(item => (
                  <div className="evidence-image" key={item.id}>
                    <img src={item.previewUrl} alt={`${item.file.name} 미리보기`} />
                    <button type="button" onClick={() => removeEvidence("compensation_proof", item.id)} aria-label={`${item.file.name} 삭제`}>
                      <Trash2 />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <Button
              className="bg-[#0e9f95] hover:bg-[#0b887f]"
              disabled={evidenceUpload.isPending || csSubmitReview.isPending}
              onClick={async () => {
                if (compensationProofs.length === 0)
                  return toast.error("보상 증빙 이미지를 1개 이상 등록해 주세요.");
                try {
                  for (const item of compensationProofs) {
                    await evidenceUpload.mutateAsync({
                      requestRef: ticket.code,
                      category: "compensation_proof",
                      fileName: item.file.name,
                      contentType: item.file.type,
                      byteSize: item.file.size,
                      base64: await readFileAsBase64(item.file),
                    });
                  }
                  await csSubmitReview.mutateAsync({ ticketCode: ticket.code });
                  await csUtils.cs.list.invalidate();
                  setCompensationProofs([]);
                  setCompensationTarget("");
                  toast.success("보상 증빙을 제출했습니다. 대리점이 보상 확정 처리합니다.");
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "보상 증빙 제출에 실패했습니다. 다시 시도해 주세요.");
                }
              }}
            >
              {csSubmitReview.isPending ? "제출 중..." : "보상 증빙 제출하고 검토 요청"}
            </Button>
          </div>
        )}
      </div>
      <CsTicketHistory ticket={ticket} hideBulk onDoubleClick={event => event.stopPropagation()} />
      {ticket.status === "보상 접수 요청" && compensationTarget !== ticket.code && (
        <div className="cs-ticket-actions" onDoubleClick={event => event.stopPropagation()}>
          <button className="cs-action amber" onClick={() => setCompensationTarget(ticket.code)}>보상 증빙 등록</button>
        </div>
      )}
    </article>
  );
  return (
    <main className="min-h-screen bg-[#f5f7f4]">
      <header className="flex h-[72px] items-center gap-4 border-b border-[#e7e8e4] bg-[#fffefb] px-4 sm:px-8">
        <Logo />
        <div className="hidden h-7 w-px bg-[#e2e6e1] sm:block" />
        <div className="hidden text-xs text-[#66758a] md:block">
            <strong className="text-[#283a50]">{organizationName}</strong> 님{" "}
          <span className="mx-1.5 text-[#c3cad1]">|</span> 대리점: <ShipperAgencyLabel />
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
              variant={unreadFeedbackCount > 0 ? "default" : "outline"}
              className={unreadFeedbackCount > 0 ? "cs-feedback-alert" : "cs-feedback-clear"}
              onClick={() => {
                if (unreadFeedbackCount === 0) { toast("확인하지 않은 CS 피드백이 없습니다."); return; }
                csMarkSeen.mutate({ all: true });
              }}
            >
              <BellRing className="mr-1.5 h-4 w-4" />
              확인 안된 CS 피드백 {unreadFeedbackCount}건
            </Button>
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
            <MessageSquareText className="h-4 w-4" />내 CS 문의 <span>{shipperTickets.filter(ticket => ticket.status !== "처리 완료").length}</span>
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
            <CheckCircle2 className="h-4 w-4" />처리 완료 <span>{completedTickets.length}</span>
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
            <section className="data-card mt-5">
              <div className="data-card-head"><div><p className="panel-kicker">COMPLETED CS</p><h2>처리 완료 이력</h2></div></div>
              {csList.isLoading ? <p className="p-8 text-center text-sm text-[#637287]">CS 내역을 불러오는 중입니다.</p> : completedTickets.length === 0 ? <div className="empty-state m-6"><div className="empty-icon"><CheckCircle2 /></div><h2>처리 완료된 CS가 아직 없습니다.</h2><p>대리점에서 처리를 완료하면 이 목록에 기록됩니다.</p></div> : <div className="cs-ticket-list">{completedTickets.map(renderTicketCard)}</div>}
            </section>
          </>
        ) : (
          <>
            <ShipperIssueSummary />
            <section className="data-card mt-5">
              <div className="data-card-head"><div><p className="panel-kicker">MY CS TICKETS</p><h2>내 CS 문의</h2></div><Badge className="bg-[#edf7f5] text-[#197a70]">실시간 조회</Badge></div>
              {csList.isLoading ? <p className="p-8 text-center text-sm text-[#637287]">CS 내역을 불러오는 중입니다.</p> : shipperTickets.length === 0 ? <div className="empty-state m-6"><div className="empty-icon"><MessageSquareText /></div><h2>아직 접수한 CS가 없습니다.</h2><p>상단의 건별 CS 접수 버튼으로 첫 문의를 등록하면 대리점과 실시간으로 연결됩니다.</p></div> : <div className="cs-ticket-list">{shipperTickets.map(renderTicketCard)}</div>}
            </section>
          </>
        )}
      </div>
      {detailTicket && <CsDetailModal ticket={detailTicket} hideBulk onClose={() => setDetailCode(null)} />}
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
                      setIssueType(event.target.value as TicketType)
                    }
                  >
                    <option>파손/분실</option>
                    <option>배송지연</option>
                    <option>오배송</option>
                    <option>주소변경</option>
                    <option>미수령 확인요청</option>
                    <option>배송문의</option>
                    <option>기타</option>
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
              {issueType === "파손/분실" && (
              <>
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
              </>
              )}
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
    {pendingSettlement && <article className="rounded-xl border border-[#f2c882] bg-[#fff7e9] p-4 shadow-sm"><div className="flex items-start gap-3"><span className="rounded-lg bg-[#ffe2ad] p-2 text-[#9a631f]"><Landmark className="h-4 w-4" /></span><div><div className="flex items-center gap-2"><p className="text-[11px] font-bold tracking-[.13em] text-[#a3651d]">ACTION REQUIRED</p><Badge className="bg-[#d9683f] text-white">정산 등록 필요</Badge></div><h2 className="mt-1 font-bold text-[#5e3d1d]">정산 계좌가 아직 등록되지 않았습니다.</h2><p className="mt-1 text-xs text-[#8c6538]">정산 정보 탭에서 계좌를 등록하면 보상금 지급 절차를 진행할 수 있습니다.</p></div></div></article>}
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
      toast.success(`정산 정보를 저장했습니다. (****${result.accountLast4})`);
    },
    onError: error => toast.error(error.message),
  });
  const del = trpc.operations.deleteSettlement.useMutation({
    onSuccess: async () => {
      await utils.operations.shipperDocumentDashboard.invalidate();
      toast.success("등록된 정산 계좌를 삭제했습니다. 정산 상태가 '등록 필요'로 변경되었습니다.");
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
  const settlement = dashboard.data?.settlement ?? null;
  return <section className="data-card mt-5 max-w-[760px]"><div className="data-card-head"><div><p className="panel-kicker">SETTLEMENT ACCOUNT</p><h2>정산 정보 업데이트</h2><p className="mt-1 text-sm text-[#637287]">보상금 지급에 사용될 정산 계좌를 화주가 직접 등록합니다. 저장 즉시 반영되며 별도 승인 절차는 없습니다.</p></div><Badge className={pending ? "bg-[#fff7e9] text-[#a3651d]" : "bg-[#eaf6f4] text-[#087970]"}>{pending ? "등록 필요 · 미확정" : "등록 완료"}</Badge></div>{settlement && <div className="settlement-current"><div><span>현재 등록된 계좌</span><strong>{settlement.bank} · {settlement.accountHolder} · ****{settlement.accountLast4}</strong><small>{new Date(settlement.updatedAt).toLocaleDateString("ko-KR")} 저장</small></div><button type="button" className="settlement-delete" onClick={() => { if (window.confirm("등록된 정산 계좌를 삭제합니다. 삭제하면 정산 상태가 '등록 필요'로 돌아가며 보상금 지급을 위해 다시 등록이 필요합니다. 계속하시겠습니까?")) del.mutate(); }} disabled={del.isPending}>{del.isPending ? "삭제 중..." : "등록 계좌 삭제"}</button></div>}<form onSubmit={submit} className="mt-5 grid gap-4"><div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1.5 text-sm font-medium text-[#3d4a5c]">정산 은행<select value={bank} onChange={event => setBank(event.target.value)} className="h-10 rounded-lg border border-[#dae5e2] bg-white px-3 text-sm"><option value="">은행 선택</option><option>국민은행</option><option>신한은행</option><option>우리은행</option><option>하나은행</option><option>기업은행</option><option>농협</option><option>카카오뱅크</option></select></label><label className="grid gap-1.5 text-sm font-medium text-[#3d4a5c]">예금주<Input value={accountHolder} onChange={event => setAccountHolder(event.target.value)} placeholder="예금주명 (사업자명과 동일하게)" /></label></div><label className="grid gap-1.5 text-sm font-medium text-[#3d4a5c]">정산 계좌번호<Input value={accountNumber} onChange={event => setAccountNumber(event.target.value.replace(/\D/g, "").slice(0, 30))} inputMode="numeric" placeholder="숫자만 입력 (8~30자리)" /></label><div className="flex flex-wrap items-center gap-3"><Button type="submit" disabled={save.isPending} className="bg-[#0e9f95] hover:bg-[#0b887f]">{save.isPending ? "저장 중..." : settlement ? "정산 정보 다시 저장" : "정산 정보 저장"}</Button><p className="text-xs text-[#708093]">계좌번호는 암호화되어 저장되며 대리점에는 뒤 4자리만 표시됩니다.</p></div></form></section>;
}

function ShipperAgencyLabel() {
  const dashboard = trpc.operations.shipperDocumentDashboard.useQuery(undefined, { retry: false });
  return <>{dashboard.data?.agencyName || "대리점"}</>;
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

const formatPhone = (raw: string) => {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return raw;
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return digits.startsWith("02") ? `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}` : `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length === 9 && digits.startsWith("02")) return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
  return digits;
};

function ShippersView() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("전체 카테고리");
  const [selectedToken, setSelectedToken] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [shipperName, setShipperName] = useState("");
  const [shipperContractNumber, setShipperContractNumber] = useState("");
  const [linkToken, setLinkToken] = useState("");
  const [editingInviteId, setEditingInviteId] = useState<number | null>(null);
  const [editShipperName, setEditShipperName] = useState("");
  const [editContractNumber, setEditContractNumber] = useState("");
  const [manageToken, setManageToken] = useState("");
  const [manageName, setManageName] = useState("");
  const [manageContract, setManageContract] = useState("");
  const { isAuthenticated } = useAuth();
  const profile = trpc.auth.profile.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const history = trpc.operations.agencyShipperHistory.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const csList = trpc.cs.list.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const csByShipper = new Map<number, CsTicket[]>();
  (csList.data ?? []).forEach(ticket => {
    const list = csByShipper.get(ticket.shipperUserId) ?? [];
    list.push(ticket);
    csByShipper.set(ticket.shipperUserId, list);
  });
  const agencyName = profile.data?.organizationName || "대리점";
  const rows = (history.data ?? []).map((item, index) => ({
    token: item.token,
    ownerUserId: item.ownerUserId ?? -1,
    name: item.name,
    businessNumber: item.businessNumber || "미등록",
    productCategory: item.productCategory || "미등록",
    code: item.contractNumber || "계약번호 미지정",
    manager: (item.contacts?.length ?? 0) > 0 ? `${item.contacts[0].name}${item.contacts.length > 1 ? ` 외 ${item.contacts.length - 1}명` : ""}` : "담당자 미등록",
    ticket: String(csByShipper.get(item.ownerUserId ?? -1)?.filter(ticket => ticket.status !== "처리 완료").length ?? 0),
    category: item.settlement ? "정산 등록" : "초대/가입",
    joined: item.inviteStatus === "claimed",
    joinLabel: item.inviteStatus === "claimed" ? "가입 완료" : item.inviteStatus === "expired" ? "초대 만료" : "초대 대기",
    subcategory: item.settlement ? `정산 등록 완료 · ${item.settlement.bank} ****${item.settlement.accountLast4}` : item.inviteStatus === "claimed" ? "가입 완료" : item.inviteStatus === "expired" ? "초대 만료" : "초대 대기",
    last: new Date(item.claimedAt ?? item.invitedAt).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" }),
    shipments: "-",
    contact: item.contacts?.[0]?.phone || "등록된 연락처 없음",
    address: item.businessAddress || "주소 미등록",
    invite: new Date(item.invitedAt).toLocaleDateString("ko-KR"),
    contacts: item.contacts ?? [],
  })).filter(row => (category === "전체 카테고리" || row.category === category) && `${row.name}${row.code}${row.manager}${row.productCategory}${row.category}${row.subcategory}`.includes(query));
  const inviteUrl = linkToken ? (typeof window === "undefined" ? `/join/${linkToken}` : `${window.location.origin}/join/${linkToken}`) : "";
  const invitesList = trpc.invites.list.useQuery(undefined, { enabled: (inviteOpen || Boolean(manageToken)) && isAuthenticated, retry: false });
  const manageInvite = (invitesList.data ?? []).find(item => item.token === manageToken);
  const updateInvite = trpc.invites.update.useMutation({ onSuccess: () => { toast.success("초대 링크 정보를 수정했습니다."); setEditingInviteId(null); void invitesList.refetch(); void history.refetch(); }, onError: error => toast.error(error.message) });
  const deleteInvite = trpc.invites.remove.useMutation({ onSuccess: () => { toast.success("초대 링크를 삭제했습니다."); void invitesList.refetch(); void history.refetch(); }, onError: error => toast.error(error.message) });
  const deleteShipper = trpc.invites.deleteShipper.useMutation({ onSuccess: result => { toast.success(result.removedAccount ? "화주 연결과 계정 데이터를 모두 삭제했습니다." : "초대 링크를 삭제했습니다."); setSelectedToken(""); setManageToken(""); void invitesList.refetch(); void history.refetch(); }, onError: error => toast.error(error.message) });
  const createInvite = trpc.invites.create.useMutation({ onSettled: () => { void invitesList.refetch(); void history.refetch(); },

    onSuccess: result => {
      setLinkToken(result.token);
      toast.success(`${shipperName.trim()} 전용 초대 링크를 생성했습니다.`);
    },
    onError: error => toast.error(error.message),
  });
  const generate = () => {
    if (!isAuthenticated) return toast.error("대리점 운영자 계정으로 로그인한 뒤 초대 링크를 생성해 주세요.");
    if (profile.data?.organizationType && profile.data.organizationType !== "agency") return toast.error("대리점 계정에서만 화주 초대 링크를 생성할 수 있습니다.");
    if (!/^[0-9A-Za-z-]{6,24}$/.test(shipperContractNumber.trim())) return toast.error("계약 택배 번호 6~24자를 입력해 주세요.");
    createInvite.mutate({ agencyName: agencyName, shipperName: shipperName.trim(), contractNumber: shipperContractNumber.trim() });
  };
  const selected = rows.find(row => row.token === selectedToken) ?? null;
  const recentTicket = selected ? csByShipper.get(selected.ownerUserId ?? -1)?.[0] : undefined;
  if (history.isLoading) return <div className="management-page page-enter"><div className="empty-state"><div className="empty-icon"><Building2 /></div><h2>화주 목록을 불러오고 있습니다.</h2><p>초대 및 가입 이력을 실제 DB 기준으로 확인합니다.</p></div></div>;
  if (history.isError) return <div className="management-page page-enter"><div className="empty-state"><div className="empty-icon"><AlertTriangle /></div><h2>화주 목록을 불러오지 못했습니다.</h2><p>{history.error.message}</p><Button onClick={() => history.refetch()} className="mt-4 bg-[#0e9f95] hover:bg-[#0b887f]">다시 시도</Button></div></div>;
  if (selected) return <div className="management-page page-enter company-detail-page"><button className="back-to-directory" onClick={() => setSelectedToken("")}>← 화주 목록</button><div className="management-title"><div><p className="eyebrow">SHIPPER PROFILE · {selected.code}</p><h1>{selected.name}</h1><p>{selected.productCategory}를 주로 취급하는 연결 화주입니다.</p></div><Button variant="outline" onClick={() => toast(`${selected.name} 담당자에게 운영 안내를 준비했습니다.`)}><Send />운영 안내 보내기</Button></div><div className="company-overview"><div className="company-profile-mark">{selected.name.replace("(주)", "").charAt(0)}</div><div><span>연결 대리점</span><strong>{agencyName}</strong><small><Link2 />초대 링크 가입일 {selected.invite}</small></div><div><span>주력 상품 카테고리</span><strong>{selected.productCategory}</strong><small>{selected.joinLabel}</small></div><div><span>월 출고 건수</span><strong>{selected.shipments}건</strong><small>최근 30일 기준</small></div></div><div className="company-detail-grid"><section><header><p className="panel-kicker">BUSINESS PROFILE</p><h2>업체 및 담당자 정보</h2></header><dl><div><dt>계약 택배 번호</dt><dd>{selected.code}</dd></div><div><dt>사업자등록번호</dt><dd>{selected.businessNumber}</dd></div><div><dt>사업장</dt><dd>{selected.address}</dd></div><div><dt>대표 연락처</dt><dd>{formatPhone(selected.contact)}</dd></div><div><dt>등록 담당자</dt><dd>{selected.manager}</dd></div></dl><div className="company-members"><p>CS 수신 담당자</p>{selected.contacts.length > 0 ? selected.contacts.map((contact, index) => <div key={index}><span>{contact.name}</span><small>{[contact.department, formatPhone(contact.phone ?? "")].filter(Boolean).join(" · ") || "등록 정보 없음"}</small></div>) : <p className="member-empty">등록된 담당자가 없습니다. 가입 시 입력한 담당자 정보가 이곳에 표시됩니다.</p>}</div></section><section><header><p className="panel-kicker">CS ACTIVITY</p><h2>최근 운영 현황</h2></header><div className="company-activity"><div><strong>{selected.ticket}</strong><span>진행 CS</span></div><div><strong>18m</strong><span>평균 1차 응답</span></div><div><strong>98.6%</strong><span>배송 SLA</span></div></div><div className="company-recent-cs"><p>최근 접수 CS</p>{recentTicket ? <div className="recent-cs-item"><span className="recent-cs-badge">{recentTicket.code} · {recentTicket.type}</span><strong>{recentTicket.note}</strong><small>{recentTicket.status} · {new Date(recentTicket.createdAt).toLocaleDateString("ko-KR")} · {recentTicket.createdByRole === "shipper" ? "화주 접수" : "대리점 접수"}</small></div> : <p className="member-empty">아직 접수한 CS가 없습니다.</p>}</div><div className="company-category-card"><Package /><div><span>주력 취급 카테고리</span><strong>{selected.productCategory}</strong></div></div><Button className="w-full bg-[#12233f] hover:bg-[#203b5e]" onClick={() => toast(`${selected.name}의 티켓 목록을 준비했습니다.`)}>이 화주의 CS 티켓 보기 <ArrowUpRight /></Button></section></div></div>;
  return <div className="management-page page-enter"><div className="management-title"><div><p className="eyebrow">SHIPPER DIRECTORY · {rows.length} ACCOUNTS</p><h1>화주 목록</h1><p>화주별 담당자와 주력 상품 카테고리, 진행 중인 CS 현황을 관리합니다.</p></div><Button className="bg-[#0e9f95] hover:bg-[#0b887f]" onClick={() => setInviteOpen(true)}><Plus />화주 초대</Button></div><div className="management-toolbar"><div className="search-field"><Search /><Input value={query} onChange={event => setQuery(event.target.value)} placeholder="화주명, 계약번호, 담당자, 카테고리 검색" /></div><select value={category} onChange={event => setCategory(event.target.value)}><option>전체 카테고리</option><option>초대/가입</option><option>정산 등록</option></select><Button variant="outline" onClick={() => toast.success(`실제 DB 기준 화주 ${rows.length}개를 불러왔습니다.`)}><Download />새로고침 안내</Button></div><section className="directory-grid"><div className="directory-stats"><div><span>연결 화주</span><strong>{rows.length}</strong><small>실제 초대/가입 이력 기준</small></div><div><span>가입 완료</span><strong>{rows.filter(row => row.joined).length}</strong><small>claimed 상태 기준</small></div><div><span>정산 등록</span><strong>{rows.filter(row => row.category === "정산 등록").length}</strong><small>정산 정보 저장 기준</small></div></div><div className="directory-table category-directory"><div className="directory-head"><span>화주 / 계약 택배 번호</span><span>등록 담당자</span><span>주력 상품 카테고리</span><span>진행 CS</span><span>최근 활동</span><span /></div>{rows.map(row => <div className="directory-row" key={row.token} onClick={() => setSelectedToken(row.token)}><div><strong>{row.name}</strong><small>{row.code}</small></div><div className="member-chip"><UsersRound />{row.manager}</div><div className="category-chip"><Package /><span><strong>{row.productCategory}</strong><small>{row.subcategory}</small></span></div><b>{row.ticket}</b><time>{row.last}</time><button onClick={event => { event.stopPropagation(); setManageToken(row.token); setManageName(row.name); setManageContract(row.code === "계약번호 미지정" ? "" : row.code); }} aria-label={`${row.name} 관리 메뉴`}><MoreVertical /></button><button onClick={() => setSelectedToken(row.token)} aria-label={`${row.name} 업체 정보 보기`}><ChevronDown /></button></div>)}{rows.length === 0 && <div className="directory-empty">선택한 조건에 맞는 화주가 없습니다.</div>}</div></section>{inviteOpen && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="shipper-invite-title"><div className="shipper-invite-modal"><button className="modal-close" onClick={() => setInviteOpen(false)} aria-label="화주 초대 닫기"><X /></button><p className="eyebrow">SHIPPER INVITE · {agencyName.toUpperCase()}</p><h2 id="shipper-invite-title">화주 초대 링크 생성</h2><p>이 링크를 통해 가입한 화주는 {agencyName}의 화주로 자동 연결됩니다.</p><div className="invite-target-form"><label>초대할 화주사명<Input value={shipperName} onChange={event => setShipperName(event.target.value)} placeholder="예: (주)에이블컴퍼니" /></label><label>계약 택배 번호<Input value={shipperContractNumber} onChange={event => setShipperContractNumber(event.target.value.replace(/[^0-9A-Za-z-]/g, "").slice(0, 24))} placeholder="예: 361234567890" /></label></div><div className="invite-link-display"><Link2 /><span>{inviteUrl || "화주사명과 계약 택배 번호를 입력한 뒤 링크를 생성해 주세요."}</span><button disabled={!linkToken} onClick={() => { navigator.clipboard?.writeText(inviteUrl); toast.success("화주 초대 링크를 복사했습니다."); }}><Copy />복사</button></div><div className="invite-flow-preview"><span>01. 링크 전달</span><ArrowRight /><span>02. 화주 정보 등록</span><ArrowRight /><span>03. 자동 소속 연결</span></div><div className="invite-history"><p className="eyebrow">ISSUED LINKS · {invitesList.data?.length ?? 0}</p><h3>발급된 초대 링크</h3>{invitesList.isLoading && <p className="invite-history-empty">초대 이력을 불러오는 중...</p>}{!invitesList.isLoading && (invitesList.data ?? []).length === 0 && <p className="invite-history-empty">아직 발급된 초대 링크가 없습니다. 위에서 첫 링크를 생성해 주세요.</p>}<div className="invite-history-list">{(invitesList.data ?? []).slice().sort((a, b) => b.id - a.id).map(invite => { const isExpired = invite.status !== "claimed" && new Date(invite.expiresAt).getTime() < Date.now(); const statusLabel = invite.status === "claimed" ? "가입 완료" : isExpired ? "만료" : "가입 대기"; const url = `${window.location.origin}/join/${invite.token}`; return <div className="invite-history-row" key={invite.id}>{editingInviteId === invite.id ? <div className="invite-edit-form"><Input value={editShipperName} onChange={event => setEditShipperName(event.target.value)} placeholder="화주사명" /><Input value={editContractNumber} onChange={event => setEditContractNumber(event.target.value.replace(/[^0-9A-Za-z-]/g, "").slice(0, 24))} inputMode="numeric" placeholder="계약 택배 번호" /><button onClick={() => updateInvite.mutate({ id: invite.id, shipperName: editShipperName, contractNumber: editContractNumber })} disabled={updateInvite.isPending || editContractNumber.length !== 10 || editShipperName.trim().length < 2}>{updateInvite.isPending ? "저장 중..." : "저장"}</button><button onClick={() => setEditingInviteId(null)}>취소</button></div> : <><div className="invite-history-info"><strong>{invite.shipperName}</strong><small>계약번호 {invite.contractNumber} · 발급 {new Date(invite.createdAt).toLocaleDateString("ko-KR")} · 만료 {new Date(invite.expiresAt).toLocaleDateString("ko-KR")}</small></div><span className={`invite-status-chip${invite.status === "claimed" ? " ok" : isExpired ? " warn" : ""}`}>{statusLabel}</span><div className="invite-history-actions"><button onClick={() => { navigator.clipboard?.writeText(url); toast.success("초대 링크를 복사했습니다."); }}><Copy />복사</button><button onClick={() => { setEditingInviteId(invite.id); setEditShipperName(invite.shipperName); setEditContractNumber(invite.contractNumber); }}><FilePenLine />수정</button><button className="danger" onClick={() => { if (window.confirm(`${invite.shipperName} 전용 초대 링크를 삭제합니다. 삭제한 링크는 복구할 수 없습니다.`)) deleteInvite.mutate({ id: invite.id }); }}><Trash2 />삭제</button></div></>}</div>; })}</div></div><div className="invite-modal-actions"><button onClick={generate} disabled={createInvite.isPending}>{createInvite.isPending ? "링크 생성 중..." : linkToken ? "새 링크 생성" : "링크 생성"}</button><Button onClick={() => { if (!linkToken) return toast.error("먼저 유효한 화주 초대 링크를 생성해 주세요."); setInviteOpen(false); toast.success("이 링크로 화주 공지 발송 화면을 준비했습니다."); }} className="bg-[#0e9f95] hover:bg-[#0b887f]"><Send />이 링크로 화주 공지 준비</Button></div></div></div>}{manageToken && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="shipper-manage-title"><div className="shipper-invite-modal"><button className="modal-close" onClick={() => setManageToken("")} aria-label="화주 관리 닫기"><X /></button><p className="eyebrow">SHIPPER MANAGE</p><h2 id="shipper-manage-title">화주 정보 관리</h2><p>{manageName} 화주의 기본 정보를 수정하거나 연결을 삭제할 수 있습니다.</p><div className="invite-target-form"><label>화주사명<Input value={manageName} onChange={event => setManageName(event.target.value)} /></label><label>계약 택배 번호<Input value={manageContract} onChange={event => setManageContract(event.target.value.replace(/[^0-9A-Za-z-]/g, "").slice(0, 24))} /></label></div><div className="invite-modal-actions manage-actions"><button onClick={() => { if (!manageInvite) return toast.error("초대 정보를 불러오는 중입니다. 잠시 후 다시 시도해 주세요."); if (manageName.trim().length < 2) return toast.error("화주사명을 2자 이상 입력해 주세요."); if (!/^[0-9A-Za-z-]{6,24}$/.test(manageContract)) return toast.error("계약 택배 번호 6~24자를 입력해 주세요."); updateInvite.mutate({ id: manageInvite.id, shipperName: manageName.trim(), contractNumber: manageContract }); setManageToken(""); }} disabled={updateInvite.isPending}>{updateInvite.isPending ? "저장 중..." : "수정 저장"}</button><button className="manage-delete" onClick={() => { if (!window.confirm(`${manageName} 화주 연결을 삭제합니다. 가입된 화주 계정·담당자·정산·직인 데이터까지 모두 삭제되며 복구할 수 없습니다. 계속하시겠습니까?`)) return; deleteShipper.mutate({ token: manageToken }); }} disabled={deleteShipper.isPending}>{deleteShipper.isPending ? "삭제 중..." : "화주 연결 삭제(계정 포함)"}</button></div><p className="manage-note">수정한 정보는 화주 목록·가입 요약에 즉시 반영됩니다. 삭제는 되돌릴 수 없습니다.</p></div></div>}</div>;
}

function ShipperOperationsHistoryView() {
  const history = trpc.operations.agencyShipperHistory.useQuery(undefined, { retry: false });
  const [selectedToken, setSelectedToken] = useState("");
  const rows = history.data ?? [];
  const selected = rows.find(item => item.token === selectedToken) ?? rows[0];
  const activeInvites = rows.filter(item => item.inviteStatus === "active").length;
  const pendingSettlements = rows.filter(item => !item.settlement).length;
  const documentCount = rows.reduce((sum, item) => sum + item.sealEvents.length, 0);
  const formatDate = (value: Date | null | undefined) => value ? new Date(value).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" }) : "기록 없음";
  const inviteLabel = (status: "active" | "claimed" | "expired") => status === "claimed" ? "가입 완료" : status === "expired" ? "초대 만료" : "초대 대기";
  if (history.isLoading) return <div className="management-page page-enter"><div className="empty-state"><div className="empty-icon"><History /></div><h2>화주 운영 이력을 불러오고 있습니다.</h2><p>초대, 정산, 문서 날인 기록을 권한 범위에서 조회합니다.</p></div></div>;
  if (history.isError) return <div className="management-page page-enter"><div className="empty-state"><div className="empty-icon"><AlertTriangle /></div><h2>화주 운영 이력을 불러오지 못했습니다.</h2><p>{history.error.message}</p><Button onClick={() => history.refetch()} className="mt-4 bg-[#0e9f95] hover:bg-[#0b887f]">다시 시도</Button></div></div>;
  if (!selected) return <div className="management-page page-enter"><div className="management-title"><div><p className="eyebrow">SHIPPER OPERATIONS LEDGER</p><h1>화주 운영 이력</h1><p>초대된 화주가 생기면 정산과 문서 날인 활동을 이곳에서 확인할 수 있습니다.</p></div></div><div className="empty-state"><div className="empty-icon"><Building2 /></div><h2>표시할 화주 이력이 없습니다.</h2><p>대리점 전용 초대 링크를 발급하면 화주별 운영 이력이 자동으로 생성됩니다.</p></div></div>;
  const inviteEvents = [{ label: inviteLabel(selected.inviteStatus), detail: `초대 링크 발급 · ${formatDate(selected.invitedAt)}`, time: formatDate(selected.claimedAt ?? selected.expiresAt), tone: "navy" }, ...(selected.settlement ? [{ label: "정산 계좌 등록", detail: `${selected.settlement.bank} · ****${selected.settlement.accountLast4}`, time: formatDate(selected.settlement.updatedAt), tone: "teal" }] : [])];
  return <div className="management-page history-dashboard page-enter"><div className="management-title"><div><p className="eyebrow">SHIPPER OPERATIONS LEDGER · LIVE STATUS</p><h1>화주 운영 이력</h1><p>초대·정산·문서 날인 활동을 실제 화주 데이터 기준으로 모아 확인합니다.</p></div><Button variant="outline" onClick={() => toast("화주 운영 이력 내보내기를 준비했습니다.")}><Download />이력 내보내기</Button></div><div className="report-kpis"><MetricCard label="초대 대기 화주" value={`${activeInvites}`} detail="유효기간 내 계정 설정 필요" icon={Link2} tone="amber" /><MetricCard label="정산 등록 필요" value={`${pendingSettlements}`} detail="정산 계좌 미등록 화주" icon={Landmark} tone="navy" /><MetricCard label="직인 적용 문서" value={`${documentCount}`} detail="저장된 감사 이력 기준" icon={Stamp} tone="teal" /><MetricCard label="연결 화주" value={`${rows.length}`} detail="초대 발급 이력 기준" icon={Building2} tone="navy" /></div><section className="data-card mt-5"><div className="data-card-head"><div><p className="panel-kicker">SHIPPER LEDGER</p><h2>화주별 운영 상태</h2></div><label className="table-search"><Search className="h-3.5 w-3.5" /><select value={selected.token} onChange={event => setSelectedToken(event.target.value)} aria-label="화주 선택">{rows.map(item => <option key={item.token} value={item.token}>{item.name} · {item.businessNumber}</option>)}</select></label></div><div className="history-company-summary"><div><span>선택 화주</span><strong>{selected.name}</strong><small>사업자등록번호 {selected.businessNumber}</small></div><div><span>초대 상태</span><strong>{inviteLabel(selected.inviteStatus)} · {formatDate(selected.claimedAt ?? selected.invitedAt)}</strong><small>등록 담당자 {selected.contactCount}명</small></div><div><span>정산 상태</span><strong>{selected.settlement ? "정산 등록 완료" : "정산 정보 미등록"}</strong><small>{selected.settlement ? `${selected.settlement.bank} · ****${selected.settlement.accountLast4}` : "화주 온보딩 후 등록 필요"}</small></div><div><span>문서 날인</span><strong>{selected.sealEvents.length}건</strong><small>직인 원본은 노출하지 않음</small></div></div></section><div className="history-ledger-grid mt-5"><section className="data-card"><div className="data-card-head"><div><p className="panel-kicker">INVITATION & SETTLEMENT</p><h2>초대·정산 이력</h2></div><Badge className="bg-[#edf7f5] text-[#197a70]">실시간 조회</Badge></div><div className="history-event-list">{inviteEvents.map(event => <article key={`${event.label}-${event.time}`}><i className={`history-dot history-${event.tone}`} /><div><strong>{event.label}</strong><small>{event.detail}</small></div><time>{event.time}</time></article>)}</div><div className="history-note"><Landmark /><p><strong>정산 계좌는 마스킹되어 표시됩니다.</strong><span>계좌 원문은 암호화 저장되며, 권한을 가진 처리 절차에서만 사용합니다.</span></p></div></section><section className="data-card"><div className="data-card-head"><div><p className="panel-kicker">DOCUMENT SEAL AUDIT</p><h2>문서 날인 이력</h2></div><Badge className="bg-[#fff4dd] text-[#9c671d]">{selected.sealEvents.length}건</Badge></div><div className="history-event-list">{selected.sealEvents.length ? selected.sealEvents.map(event => <article key={`${event.documentRef}-${event.createdAt}`}><i className="history-dot history-teal" /><div><strong>{event.eventType === "finalized" ? "보상 합의서 확정" : "보상 합의서 직인 적용"}</strong><small>{event.documentRef}</small></div><time>{formatDate(event.createdAt)}</time></article>) : <div className="history-empty"><Stamp /><p>아직 직인 적용 문서가 없습니다.</p><small>화주가 등록한 직인을 문서에 적용하면 감사 이력이 생성됩니다.</small></div>}</div><div className="history-note"><ShieldCheck /><p><strong>직인 원본은 이력 화면에 노출하지 않습니다.</strong><span>문서번호·이벤트·일시만 감사 목적으로 기록합니다.</span></p></div></section></div></div>;
}

function ReportsView() {
  const [period, setPeriod] = useState("이번 주");
  const history = trpc.operations.agencyShipperHistory.useQuery(undefined, { retry: false });
  if (history.isLoading) return <div className="management-page page-enter"><div className="empty-state"><div className="empty-icon"><ClipboardList /></div><h2>업무 보고서를 준비하고 있습니다.</h2><p>실제 초대·정산·문서 이력을 집계 중입니다.</p></div></div>;
  if (history.isError) return <div className="management-page page-enter"><div className="empty-state"><div className="empty-icon"><AlertTriangle /></div><h2>업무 보고서를 불러오지 못했습니다.</h2><p>{history.error.message}</p><Button onClick={() => history.refetch()} className="mt-4 bg-[#0e9f95] hover:bg-[#0b887f]">다시 시도</Button></div></div>;
  const rows = history.data ?? [];
  const claimed = rows.filter(item => item.inviteStatus === "claimed").length;
  const pendingSettlement = rows.filter(item => !item.settlement).length;
  const documentCount = rows.reduce((sum, item) => sum + item.sealEvents.length, 0);
  const downloads = rows.reduce((sum, item) => sum + item.downloadEvents.length, 0);
  if (rows.length === 0) return <div className="management-page page-enter"><div className="management-title"><div><p className="eyebrow">OPERATIONS REPORT · LIVE RESET</p><h1>업무 보고서</h1><p>실제 초대·정산·문서 이력이 아직 없어 보고서도 빈 상태로 유지합니다.</p></div><div className="report-actions"><select value={period} onChange={event => setPeriod(event.target.value)}><option>오늘</option><option>이번 주</option><option>이번 달</option></select></div></div><div className="report-kpis"><MetricCard label="가입 완료 화주" value={`${claimed}`} detail="실제 DB claimed 초대 기준" icon={CheckCircle2} tone="teal" /><MetricCard label="초대 대기 화주" value={`${rows.length - claimed}`} detail="active/expired 포함" icon={Clock3} tone="navy" /><MetricCard label="정산 등록 필요" value={`${pendingSettlement}`} detail="정산 계좌 미등록 화주" icon={FilePenLine} tone="amber" /><MetricCard label="문서/다운로드 이력" value={`${documentCount}/${downloads}`} detail="직인 이벤트 / PDF 다운로드" icon={AlertTriangle} tone="red" /></div><section className="data-card mt-5 flex min-h-[360px] items-center justify-center"><div className="empty-state max-w-[560px]"><div className="empty-icon"><ClipboardList /></div><h2>표시할 운영 보고서가 없습니다.</h2><p>현재 보이는 KPI만 실제 DB 기준입니다. 아래 일별 추이 차트와 할 일 보드는 샘플 데이터라 숨겨 두었습니다.</p></div></section></div>;
  return <div className="management-page page-enter"><div className="management-title"><div><p className="eyebrow">OPERATIONS REPORT · WEEK 35</p><h1>업무 보고서</h1><p>CS 응답, 보상 처리, 배송 리스크의 운영 신호를 빠르게 확인합니다.</p></div><div className="report-actions"><select value={period} onChange={event => setPeriod(event.target.value)}><option>오늘</option><option>이번 주</option><option>이번 달</option></select></div></div><div className="report-kpis"><MetricCard label="가입 완료 화주" value={`${claimed}`} detail="실제 DB claimed 초대 기준" icon={CheckCircle2} tone="teal" /><MetricCard label="초대 대기 화주" value={`${rows.length - claimed}`} detail="active/expired 포함" icon={Clock3} tone="navy" /><MetricCard label="정산 등록 필요" value={`${pendingSettlement}`} detail="정산 계좌 미등록 화주" icon={FilePenLine} tone="amber" /><MetricCard label="문서/다운로드 이력" value={`${documentCount}/${downloads}`} detail="직인 이벤트 / PDF 다운로드" icon={AlertTriangle} tone="red" /></div><section className="data-card mt-5 flex min-h-[360px] items-center justify-center"><div className="empty-state max-w-[560px]"><div className="empty-icon"><ClipboardList /></div><h2>리포트 상세는 아직 실데이터 연동 전입니다.</h2><p>상단 KPI만 실제 DB 기준으로 표시하고, 차트·액션보드는 더미 데이터가 섞이지 않도록 숨겨 두었습니다.</p></div></section></div>;
}


const permissionRows: { name: string; role: string; organization: string; permissions: Permission[]; initial: string }[] = [
  { name: "김대리", role: "운영 리더", organization: "서울중앙물류", permissions: ["전체 관리"], initial: "김" },
  { name: "박매니저", role: "사고 보상 담당", organization: "서울중앙물류", permissions: ["티켓 관리", "보상 검토", "보고서 열람"], initial: "박" },
  { name: "박지수", role: "화주 CS 담당", organization: "(주)에이블컴퍼니", permissions: ["티켓 관리"], initial: "박" },
  { name: "이현우", role: "화주 운영 매니저", organization: "글로벌커머스", permissions: ["티켓 관리", "보고서 열람"], initial: "이" },
];

function SettingsView() {
  const [tab, setTab] = useState<"agency" | "members" | "shipper" | "documents">("agency");
  const settingsProfile = trpc.auth.profile.useQuery();
  const [courierDraft, setCourierDraft] = useState("");
  useEffect(() => { if (settingsProfile.data?.courier) setCourierDraft(settingsProfile.data.courier); }, [settingsProfile.data?.courier]);
  const updateCourier = trpc.auth.updateCourier.useMutation({ onSuccess: () => toast.success("본사 택배사를 저장했습니다. 이후 가입 화주와 송장 조회에 적용됩니다."), onError: error => toast.error(error.message) });
  const [members, setMembers] = useState(permissionRows);
  const togglePermission = (person: string, permission: Permission) => setMembers(current => current.map(member => member.name !== person ? member : { ...member, permissions: member.permissions.includes(permission) ? member.permissions.filter(item => item !== permission) : [...member.permissions, permission] }));
  return <div className="management-page settings-page page-enter"><div className="management-title"><div><p className="eyebrow">AGENCY ADMINISTRATION · ACCESS CONTROL</p><h1>대리점 설정</h1><p>조직 정보, 화주 연결, 담당자 권한, 문서 자동화 정책을 설정합니다.</p></div><Button variant="outline" onClick={() => { if (!courierDraft) return toast.error("본사 택배사를 선택해 주세요."); updateCourier.mutate({ courier: courierDraft }); }}><Check />변경 사항 저장</Button></div><div className="settings-layout"><nav className="settings-nav">{([{ id: "agency", icon: Settings, label: "대리점 기본 설정" }, { id: "members", icon: UserCog, label: "조직 및 담당자 권한" }, { id: "shipper", icon: Building2, label: "화주 조직 관리" }, { id: "documents", icon: FilePenLine, label: "문서·직인 정책" }] as const).map(item => <button key={item.id} onClick={() => setTab(item.id)} className={tab === item.id ? "settings-active" : ""}><item.icon />{item.label}<ChevronDown /></button>)}</nav><section className="settings-content">{tab === "agency" && <><div className="settings-heading"><Settings /><div><h2>대리점 기본 정보</h2><p>화주에게 표시되는 운영 주체와 기본 공지 정보를 관리합니다.</p></div></div><div className="settings-form-grid"><label>대리점명 <Input defaultValue={settingsProfile.data?.organizationName || ""} /></label><label>본사 택배사(계약 택배사) <select value={courierDraft} onChange={event => setCourierDraft(event.target.value)}><option value="">택배사 선택</option>{COURIERS.map(item => <option key={item} value={item}>{item}</option>)}</select></label><label>대표 운영 이메일 <Input defaultValue="operation@seoulcentral.co.kr" /></label><label>대표 연락처 <Input defaultValue="02-3278-2100" /></label><label>CS 응답 기준 <select defaultValue="30"><option value="30">30분 이내</option><option value="60">1시간 이내</option><option value="120">2시간 이내</option></select></label></div><div className="settings-notice"><Bell /><div><strong>화주 공지 발송 권한</strong><span>운영 리더와 초대 권한 보유자만 발송 최종 확인 화면을 진행할 수 있습니다.</span></div><BadgeCheck /></div></>}{tab === "members" && <><div className="settings-heading"><UserCog /><div><h2>대리점·화주 담당자 권한</h2><p>조직별로 여러 담당자를 등록하고, 업무 범위에 맞는 최소 권한을 부여합니다.</p></div><div className="ml-auto flex gap-2"><Button variant="outline" onClick={() => window.location.assign("/staff-invite?role=shipper")}>화주 담당자 초대</Button><Button onClick={() => window.location.assign(`/staff-invite?role=agency&organization=${encodeURIComponent(settingsProfile.data?.organizationName || "")}`)} className="bg-[#0e9f95] hover:bg-[#0b887f]"><Plus />대리점 담당자 추가</Button></div></div><div className="permission-table">{members.map(member => <article key={`${member.organization}-${member.name}`}><div className="permission-person"><span>{member.initial}</span><div><strong>{member.name}</strong><small>{member.role} · {member.organization}</small></div></div><div className="permission-chips">{(["전체 관리", "티켓 관리", "보상 검토", "화주 관리", "보고서 열람", "설정 관리"] as Permission[]).map(permission => <button key={permission} className={member.permissions.includes(permission) ? "permission-on" : ""} onClick={() => { togglePermission(member.name, permission); toast(`${member.name}의 ${permission} 권한을 변경했습니다.`); }}><Check />{permission}</button>)}</div><button className="more-member" onClick={() => toast(`${member.name}의 상세 권한 설정을 엽니다.`)}><MoreHorizontal /></button></article>)}</div></>}{tab === "shipper" && <><div className="settings-heading"><Building2 /><div><h2>화주 조직 연결 관리</h2><p>초대 링크로 가입한 화주의 소속과 담당자 수신 정책을 관리합니다.</p></div></div><div className="org-directory empty-state"><Building2 /><h2>연결된 화주 조직이 없습니다.</h2><p>화주가 초대 링크로 가입하면 이곳에 소속과 담당자 수신 정책이 표시됩니다.</p></div></>}{tab === "documents" && <><div className="settings-heading"><FilePenLine /><div><h2>문서 및 직인 사용 정책</h2><p>보상 합의서 등 지정 문서에 적용할 화주 등록 직인과 기록 방식을 관리합니다.</p></div></div><div className="document-policy"><section><div className="policy-icon"><Stamp /></div><div><strong>화주 등록 직인 사용</strong><small>보상 합의서 미리보기에서 자동 적용을 허용합니다.</small></div><button className="policy-switch policy-switch-on" onClick={() => toast("직인 자동 적용 정책은 현재 활성 상태입니다.")}><i /></button></section><section><div className="policy-icon"><History /></div><div><strong>직인 사용 이력 기록</strong><small>문서 생성, 직인 적용, 다운로드 기록을 보관합니다.</small></div><button className="policy-switch policy-switch-on" onClick={() => toast("문서 이력 기록은 현재 활성 상태입니다.")}><i /></button></section><section><div className="policy-icon"><KeyRound /></div><div><strong>직인 적용 권한</strong><small>사고 보상 담당 및 대리점 운영 리더만 실행할 수 있습니다.</small></div><button onClick={() => toast("직인 적용 권한 설정을 엽니다.")} className="policy-link">권한 보기 <ArrowDownRight /></button></section></div><div className="policy-alert"><LockKeyhole /><p><strong>직인은 민감 문서 자산으로 관리됩니다.</strong><span>이 화면의 자동 날인은 내부 운영 미리보기이며, 실제 문서 발행·보관 환경에서는 조직별 접근 제어와 저장 정책을 적용해야 합니다.</span></p></div></>}</section></div></div>;
}
