import { useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  FileKey2,
  FileText,
  KeyRound,
  Link2,
  LockKeyhole,
  MailCheck,
  MessageSquare,
  Phone,
  Send,
  ShieldCheck,
  Sparkles,
  Stamp,
  UploadCloud,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

function Brand() {
  return <Link href="/" className="onboard-brand"><span><Sparkles /></span><strong>logiflow</strong><em>CS CONSOLE</em></Link>;
}

function LandingNav() {
  return <header className="landing-nav"><Brand /><nav><a href="#workflow">운영 방식</a><a href="#security">안전한 관리</a><Link href="/login">로그인</Link><Link href="/agency-signup" className="landing-nav-cta">대리점 시작하기 <ArrowRight /></Link></nav></header>;
}

const benefits = [
  { icon: MessageSquare, no: "01", title: "문의가 하나의 티켓으로", text: "전화·메신저에서 흩어지던 화주 CS를 담당자, 증빙, 처리 상태가 남는 하나의 업무 흐름으로 정리합니다." },
  { icon: UsersRound, no: "02", title: "화주를 링크로 바로 연결", text: "대리점 전용 초대 링크로 화주를 연결합니다. 가입 완료 즉시 해당 대리점의 협업 공간에 자동 소속됩니다." },
  { icon: ClipboardCheck, no: "03", title: "보상 판단까지 추적", text: "파손 증빙, 판매가 자료, 담당자 코멘트, 승인·반려 이력을 티켓 안에서 맥락과 함께 확인합니다." },
];

export function LandingPage() {
  return <main className="landing-page"><LandingNav /><section className="landing-hero"><div className="hero-grid" /><div className="hero-copy"><p className="landing-eyebrow"><span /> B2B LOGISTICS CS OPERATING SYSTEM</p><h1>물류 CS의 모든<br /><i>대화와 결정</i>을 한 곳에서.</h1><p>대리점과 화주가 같은 티켓, 같은 증빙, 같은 처리 현황을 보며 고객 이슈를 더 빠르고 명확하게 해결합니다.</p><div className="hero-actions"><Link href="/agency-signup" className="hero-primary">대리점 무료로 시작하기 <ArrowRight /></Link><a href="#workflow" className="hero-secondary">운영 방식 살펴보기</a></div><div className="hero-trust"><ShieldCheck />계정별 역할 권한 · 증빙 파일 접근 제어 · 활동 이력 관리</div></div><div className="hero-console"><div className="console-top"><span /><span /><span /><p>LIVE OPERATIONS · 09:42</p></div><div className="console-content"><div className="console-rail"><span /><span /><span /><span /></div><div className="console-work"><div className="console-work-head"><div><b>오늘의 CS 흐름</b><small>대리점 · 화주 공동 업무 공간</small></div><em>운영 중</em></div><div className="console-stats"><div><span>신규 티켓</span><strong>24</strong><i /></div><div><span>증빙 검토 대기</span><strong>07</strong><i /></div><div><span>응답 완료</span><strong>61</strong><i /></div></div><div className="console-ticket"><span className="ticket-signal" /><div><strong>파손/분실 · 6012938192</strong><p>증빙 4개 · 화주 담당자 3명 참여</p></div><b>보상 검토</b></div><div className="console-ticket muted"><span className="ticket-signal amber" /><div><strong>배송 지연 · 6012938122</strong><p>대리점 담당자 배정 완료</p></div><b>처리 중</b></div></div></div></div></section><section className="landing-strip"><p>초대 링크 하나로 화주 등록부터 CS 협업 개설까지</p><span /><p>대리점 중심의 분명한 책임과 투명한 이력</p></section><section id="workflow" className="landing-benefits"><div className="section-intro"><p className="landing-eyebrow">ONE LINK · ONE WORKSPACE</p><h2>가입은 간결하게,<br />운영은 단단하게.</h2></div><div className="benefit-list">{benefits.map(({ icon: Icon, no, title, text }) => <article key={no}><span>{no}</span><Icon /><h3>{title}</h3><p>{text}</p></article>)}</div></section><section id="security" className="landing-security"><div><p className="landing-eyebrow">CONTROLLED BY DESIGN</p><h2>정산 정보와 직인은<br />필요한 순간에만, 정해진 권한으로.</h2><p>화주가 등록한 정산 계좌와 직인 자료는 보관 목적과 사용 주체를 명시합니다. 대리점이 문서를 준비할 때도 승인된 권한 범위에서만 활용됩니다.</p><Link href="/agency-signup">대리점 워크스페이스 개설 <ArrowRight /></Link></div><aside><div className="security-token"><LockKeyhole /><span>SECURE BUSINESS PROFILE</span></div><div className="security-row"><WalletCards /><div><strong>정산 계좌</strong><small>등록 화주만 열람 및 수정</small></div><BadgeCheck /></div><div className="security-row"><Stamp /><div><strong>전자 직인</strong><small>문서 사용 전 권한 확인</small></div><BadgeCheck /></div><div className="security-row"><FileKey2 /><div><strong>활동 이력</strong><small>등록·사용 상태를 시간순 기록</small></div><BadgeCheck /></div></aside></section><footer className="landing-footer"><Brand /><p>대리점과 화주가 더 명확하게 협업하는 B2B 물류 CS 공간.</p><Link href="/console">기존 콘솔로 이동 <ArrowRight /></Link></footer></main>;
}

function OnboardingShell({ children, title, subtitle, step }: { children: React.ReactNode; title: string; subtitle: string; step: string }) {
  return <main className="onboard-page"><header><Brand /><Link href="/" className="back-home">홈으로</Link></header><div className="onboard-layout"><aside className="onboard-side"><p>AGENCY NETWORK SETUP</p><h1>물류 파트너와의<br />CS 협업을 <i>새로 엽니다.</i></h1><div className="side-step"><span>{step}</span><em>SETUP IN PROGRESS</em></div><div className="side-quote"><span>“</span><p>초대 링크가 화주 정보를 대리점 워크스페이스에 정확하게 연결합니다.</p></div></aside><section className="onboard-panel"><div className="onboard-progress"><i style={{ width: step === "01" ? "33%" : step === "02" ? "66%" : "100%" }} /></div><p className="landing-eyebrow">STEP {step} / 03</p><h2>{title}</h2><p className="onboard-subtitle">{subtitle}</p>{children}</section></div></main>;
}

export function AgencySignupPage() {
  const [, setLocation] = useLocation();
  const [agencyName, setAgencyName] = useState("");
  const [manager, setManager] = useState("");
  const [phone, setPhone] = useState("");
  const submit = (event: React.FormEvent) => { event.preventDefault(); if (!agencyName.trim() || !manager.trim() || !phone.trim()) return toast.error("대리점명, 담당자명, 연락처를 입력해 주세요."); toast.success("다음 단계에서 대표 운영자 아이디와 비밀번호를 설정해 주세요."); setLocation(`/account-setup?role=agency&organization=${encodeURIComponent(agencyName)}`); };
  return <OnboardingShell step="01" title="대리점 워크스페이스 개설" subtitle="대표 대리점 정보와 초대 담당자를 등록하세요. 이후 초대 링크와 화주 협업 공간이 생성됩니다."><form onSubmit={submit} className="onboard-form"><label>대리점명 <Input value={agencyName} onChange={event => setAgencyName(event.target.value)} placeholder="예: 서울중앙물류" /></label><label>사업자 등록번호 <Input placeholder="예: 123-45-67890" inputMode="numeric" /></label><div className="form-grid"><label>대표 담당자명 <Input value={manager} onChange={event => setManager(event.target.value)} placeholder="예: 김대리" /></label><label>담당자 연락처 <Input value={phone} onChange={event => setPhone(event.target.value)} placeholder="예: 010-1234-5678" inputMode="tel" /></label></div><label>업무용 이메일 <Input placeholder="예: operation@agency.co.kr" type="email" /></label><div className="consent-box"><CheckCircle2 /><p><strong>대리점 운영자 권한</strong><span>화주 초대, 담당자 배정, 증빙 검토, 공지 메시지 발송 준비 권한이 부여됩니다.</span></p></div><Button type="submit" className="onboard-submit">워크스페이스 개설하고 화주 초대하기 <ArrowRight /></Button></form></OnboardingShell>;
}

export function AgencyInvitePage() {
  const profile = trpc.auth.profile.useQuery();
  const agency = profile.data?.organizationName || "대리점";
  const { isAuthenticated, loading: authLoading } = useAuth();
  const canEditSensitiveInfo = isAuthenticated && !authLoading;
  const [shipperName, setShipperName] = useState("에이블컴퍼니");
  const [shipperBusinessNumber, setShipperBusinessNumber] = useState("");
  const [token, setToken] = useState("");
  const [preview, setPreview] = useState(false);
  const [selected, setSelected] = useState([true, true, true]);
  const inviteUrl = token ? (typeof window === "undefined" ? `/join/${token}` : `${window.location.origin}/join/${token}`) : "";
  const createInvite = trpc.invites.create.useMutation({
    onSuccess: result => { setToken(result.token); toast.success(`${shipperName} 전용 초대 링크를 생성했습니다.`); },
    onError: error => toast.error(error.message),
  });
  const generate = () => {
    if (!/^\d{10}$/.test(shipperBusinessNumber)) return toast.error("초대할 화주의 사업자등록번호 10자리를 숫자로 입력해 주세요.");
    if (!isAuthenticated) return toast.error("대리점 운영자 계정으로 로그인한 뒤 초대 링크를 생성해 주세요.");
    createInvite.mutate({ agencyName: agency, shipperName: shipperName.trim(), businessNumber: shipperBusinessNumber });
  };
  const recipients = [{ name: "에이블컴퍼니", number: "010-25**-1842" }, { name: "글로벌커머스", number: "010-90**-7721" }, { name: "올데이마켓", number: "010-42**-3190" }];
  const count = selected.filter(Boolean).length;
  return <OnboardingShell step="02" title="화주 초대 링크와 공지 준비" subtitle={`${agency}의 화주 전용 등록 링크를 만들고, 기존 화주에게 CS 협업 전환을 안내하세요.`}><div className="invite-target-form"><div><label>초대할 화주사명<Input value={shipperName} onChange={event => setShipperName(event.target.value)} placeholder="예: (주)에이블컴퍼니" /></label><label>화주 사업자등록번호<Input value={shipperBusinessNumber} onChange={event => setShipperBusinessNumber(event.target.value.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" placeholder="숫자 10자리" /></label></div><p><ShieldCheck />이 번호는 초대 링크로 계정을 설정할 때 한 번 더 대조됩니다.</p><Button type="button" onClick={generate} disabled={createInvite.isPending || authLoading} className="invite-create-button">{createInvite.isPending ? "전용 링크 생성 중..." : "이 화주 전용 링크 생성"}<ArrowRight /></Button></div>{token ? <><div className="invite-link-card"><div><span><Link2 /></span><p><small>{shipperName} 화주 자동 연결 링크</small><strong>{inviteUrl}</strong></p></div><button onClick={() => { navigator.clipboard?.writeText(inviteUrl); toast.success("초대 링크를 복사했습니다."); }}><Copy />복사</button></div><button className="renew-link" onClick={generate}>새 링크 재생성 <ArrowRight /></button></> : <div className="invite-link-empty"><Link2 /><span><strong>아직 발급된 초대 링크가 없습니다.</strong><small>화주명과 사업자등록번호를 입력한 뒤 전용 링크를 생성해 주세요.</small></span></div>}<div className="notice-heading"><div><p className="landing-eyebrow">NOTICE PREVIEW</p><h3>기존 화주 공지 대상</h3></div><button disabled={!token} onClick={() => setPreview(true)}><Phone />문자 내용 검토</button></div><div className="recipient-list">{recipients.map((recipient, index) => <label key={recipient.name}><input type="checkbox" checked={selected[index]} onChange={() => setSelected(current => current.map((value, i) => i === index ? !value : value))} /><span><Building2 /><i><strong>{recipient.name}</strong><small>{recipient.number}</small></i></span><em>화주 담당자</em></label>)}</div><div className="invite-next"><div><MailCheck /><p><strong>{count}개 화주에 안내 준비</strong><span>링크를 통해 가입한 화주는 {agency}에 자동 연결됩니다.</span></p></div>{token ? <Link href={`/join/${token}`} className="onboard-submit">초대 링크 흐름 미리보기 <ArrowRight /></Link> : <Button type="button" disabled className="onboard-submit">초대 링크를 먼저 생성해 주세요 <ArrowRight /></Button>}</div>{preview && token && <NoticePreview agency={agency} inviteUrl={inviteUrl} count={count} onClose={() => setPreview(false)} />}</OnboardingShell>;
}

function NoticePreview({ agency, inviteUrl, count, onClose }: { agency: string; inviteUrl: string; count: number; onClose: () => void }) {
  const [ready, setReady] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  return <div className="onboard-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="notice-title"><div className="notice-modal"><button className="modal-close" onClick={onClose} aria-label="문자 미리보기 닫기"><X /></button><p className="landing-eyebrow">OUTBOUND NOTICE · REVIEW BEFORE DISPATCH</p><h2 id="notice-title">화주 공지 메시지</h2><p>수신 화주가 가입 링크와 전환 내용을 확인할 수 있도록 준비한 안내입니다.</p><div className="sms-preview"><div><Phone /><span>LogiFlow 알림</span></div><p>[{agency}] 안내<br /><br />앞으로 배송 지연, 파손, CS 관련 문의와 처리 현황 확인은 LogiFlow CS 페이지에서 진행됩니다.<br /><br />아래 링크에서 화주 정보를 등록하면 {agency}의 협업 공간에 자동으로 연결됩니다.<br />{inviteUrl}</p></div><div className="sms-notice"><ShieldCheck />수신자·내용을 확인한 뒤 최종 발송 단계에서 한 번 더 확인합니다.</div><Button onClick={() => { setReady(true); toast.success(`${count}개 화주의 공지 발송 요청을 준비했습니다.`); }} className="onboard-submit">{ready ? "발송 준비 완료" : `${count}개 화주에게 발송 준비` } <Send /></Button>{ready && <button className="final-dispatch-link" onClick={() => setConfirmOpen(true)}><Send />수신자·내용 최종 확인 후 발송하기</button>}{confirmOpen && <FinalDispatchDialog agency={agency} count={count} onClose={() => setConfirmOpen(false)} />}</div></div>;
}

function FinalDispatchDialog({ agency, count, onClose }: { agency: string; count: number; onClose: () => void }) {
  const [confirmation, setConfirmation] = useState("");
  const [sent, setSent] = useState(false);
  const canDispatch = confirmation === "발송" && !sent;
  const dispatch = () => {
    if (!canDispatch) return;
    setSent(true);
    toast.success(`${count}개 화주의 공지 발송 요청을 최종 확인했습니다.`);
  };
  return <div className="dispatch-overlay" role="dialog" aria-modal="true" aria-labelledby="dispatch-title"><div className="dispatch-dialog"><button className="modal-close" onClick={onClose} aria-label="최종 발송 확인 닫기"><X /></button><p className="landing-eyebrow">FINAL DISPATCH CONFIRMATION</p><h2 id="dispatch-title">문자 발송 최종 확인</h2><p>아래 내용은 선택한 화주 담당자 <b>{count}명</b>에게 전달됩니다. 발송 이후에는 취소할 수 없습니다.</p><div className="dispatch-checklist"><div><CheckCircle2 /><span><strong>수신자</strong>{agency} 연결 화주 담당자 {count}명</span></div><div><CheckCircle2 /><span><strong>안내 내용</strong>CS 문의 채널 전환 및 전용 가입 링크</span></div><div><CheckCircle2 /><span><strong>발송 권한</strong>대리점 운영자 · 김대리</span></div></div><label className="dispatch-confirm-input">최종 확인을 위해 <b>발송</b>을 입력하세요.<Input value={confirmation} onChange={event => setConfirmation(event.target.value)} placeholder="발송" disabled={sent} /></label>{sent ? <div className="dispatch-sent"><CheckCircle2 /><span><strong>발송 요청이 기록되었습니다.</strong>SMS 서비스가 연결되면 전송 결과가 이력에 반영됩니다.</span></div> : <div className="dispatch-mode"><LockKeyhole />현재는 연동 전 검토 모드입니다. 실제 전송은 SMS 발송 서비스를 연결한 뒤 활성화됩니다.</div>}<Button disabled={!canDispatch} onClick={dispatch} className="dispatch-button"><Send />{sent ? "발송 요청 완료" : `${count}건 문자 발송 확정`}</Button></div></div>;
}

export function ShipperJoinPage() {
  const [location, setLocation] = useLocation();
  const token = location.split("/").pop() || "invite";
  const shipperLoginUrl = `/login?returnTo=${encodeURIComponent("/console")}`;
  const [contacts, setContacts] = useState([{ name: "", department: "", phone: "" }]);
  const [representative, setRepresentative] = useState("");
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [complete, setComplete] = useState(false);
  const [createdLoginId, setCreatedLoginId] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const inviteInfo = trpc.invites.shipperSetup.useQuery({ token }, { retry: false });
  const utils = trpc.useUtils();
  const register = trpc.auth.registerCredential.useMutation({
    onSuccess: async result => {
      await utils.auth.me.invalidate();
      setCreatedLoginId(result.loginId);
      setComplete(true);
      toast.success("가입이 완료되었습니다. 설정한 아이디로 로그인됩니다.");
    },
    onError: error => toast.error(error.message),
  });
  const addContact = () => setContacts(current => [...current, { name: "", department: "", phone: "" }]);
  const updateContact = (index: number, field: "name" | "department" | "phone", value: string) => setContacts(current => current.map((contact, i) => i === index ? { ...contact, [field]: value } : contact));
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.checkValidity()) return form.reportValidity();
    if (!inviteInfo.data) return toast.error("유효하지 않거나 만료된 초대 링크입니다. 대리점에 새 링크 발급을 요청해 주세요.");
    const trimmedLoginId = loginId.trim().toLowerCase();
    if (representative.trim().length < 2) return toast.error("대표자명을 2자 이상 입력해 주세요.");
    if (!/^[a-z0-9._-]{6,48}$/.test(trimmedLoginId)) return toast.error("아이디는 영문 소문자, 숫자, ., _, - 조합 6~48자로 입력해 주세요.");
    if (password.length < 10) return toast.error("비밀번호는 10자 이상으로 설정해 주세요.");
    if (password !== passwordConfirm) return toast.error("비밀번호 확인이 일치하지 않습니다.");
    register.mutate({ organizationType: "shipper", organizationName: inviteInfo.data.shipperName, businessNumber: inviteInfo.data.businessNumber, contactName: representative.trim(), loginId: trimmedLoginId, password, inviteToken: token });
  };
  if (complete) return <main className="join-complete"><Brand /><section><span><CheckCircle2 /></span><p className="landing-eyebrow">JOIN COMPLETED</p><h1>화주 가입이<br />완료되었습니다.</h1><p><strong>{createdLoginId}</strong> 아이디로 로그인된 상태입니다. 정산 계좌와 직인은 화주 포털에 로그인한 뒤 등록할 수 있습니다.</p><div className="join-account-callout"><LockKeyhole /><p><strong>다음 단계: 정산 정보 등록 (로그인 후)</strong><span>화주 포털의 정산 정보 탭에서 은행·예금주·계좌번호를 안전하게 등록하면 대리점 검토가 시작됩니다.</span></p><Link href="/console">화주 포털 열기 <ArrowRight /></Link></div><div><Link href="/console">정산 정보 등록하러 가기 <ArrowRight /></Link><button onClick={() => setLocation("/")}>서비스 홈으로</button></div></section></main>;
  return <main className="shipper-join"><header><Brand /><div className="join-access-links"><Link href={shipperLoginUrl}>이미 계정이 있으면 로그인</Link><span><LockKeyhole />초대 코드 확인됨 · {token.slice(-6).toUpperCase()}</span></div></header><div className="join-shell"><aside><p className="landing-eyebrow">PARTNER INVITATION</p><h1>{inviteInfo.data?.agencyName || "대리점"}의<br /><i>화주 협업 공간</i>에<br />초대되었습니다.</h1><ol><li><span>01</span>화주 기본 정보 등록</li><li><span>02</span>담당자와 CS 수신 정보 등록</li><li><span>03</span>로그인 아이디·비밀번호 설정</li></ol><div className="auto-connect"><Link2 /><p><strong>정산 계좌·직인은 가입 후 등록</strong><span>가입을 마치고 화주 포털에 로그인하면 정산 정보와 직인을 안전하게 등록할 수 있습니다.</span></p></div><div className="auto-connect"><Link2 /><p><strong>자동 소속 연결</strong><span>가입 완료 즉시 {inviteInfo.data?.agencyName || "대리점"}의 화주로 연결됩니다.</span></p></div></aside><form ref={formRef} onSubmit={submit}><div className="join-section"><div className="join-section-title"><Building2 /><div><span>01</span><h2>화주 기본 정보</h2></div></div>{inviteInfo.isLoading ? <div className="invite-company-summary"><span>초대 화주 정보</span><strong>초대 정보를 확인하고 있습니다...</strong></div> : inviteInfo.data ? <div className="invite-company-summary"><span>초대 화주 정보 · 자동 적용</span><strong>{inviteInfo.data.shipperName}</strong><small>사업자등록번호 {inviteInfo.data.businessNumber}</small></div> : <div className="credential-invite-error">유효하지 않거나 만료된 초대 링크입니다. 대리점에 새 링크 발급을 요청해 주세요.</div>}<div className="form-grid"><label>대표자명 <Input required value={representative} onChange={event => setRepresentative(event.target.value)} placeholder="예: 홍길동" /></label><label>대표 연락처 <Input required type="tel" placeholder="010-1234-5678" /></label></div><label>사업장 주소 <Input required placeholder="주소를 입력해 주세요" /></label></div><div className="join-section"><div className="join-section-title"><UsersRound /><div><span>02</span><h2>담당자 및 CS 수신 정보</h2></div><button type="button" onClick={addContact}>+ 담당자 추가</button></div>{contacts.map((contact, index) => <div className="contact-row" key={index}><b>담당자 {index + 1}</b><Input required value={contact.name} onChange={event => updateContact(index, "name", event.target.value)} placeholder="성명" /><Input required value={contact.department} onChange={event => updateContact(index, "department", event.target.value)} placeholder="부서 / 역할" /><Input required value={contact.phone} onChange={event => updateContact(index, "phone", event.target.value)} placeholder="휴대폰 번호" /></div>)}<p className="field-hint"><MessageSquare />등록된 담당자는 CS 답변 및 보상 결과 안내를 받을 수 있습니다.</p></div><div className="join-section"><div className="join-section-title"><KeyRound /><div><span>03</span><h2>로그인 아이디 만들기</h2></div></div><p className="field-hint"><ShieldCheck />화면 이동 없이 이 폼에서 가입까지 완료합니다. 아이디와 비밀번호를 설정하면 즉시 로그인됩니다.</p><div className="form-grid"><label>로그인 아이디 <Input required value={loginId} onChange={event => setLoginId(event.target.value)} placeholder="영문 소문자·숫자 6~48자" autoComplete="username" /></label><label>비밀번호 <Input required type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="10자 이상" autoComplete="new-password" /></label></div><label>비밀번호 확인 <Input required type="password" value={passwordConfirm} onChange={event => setPasswordConfirm(event.target.value)} placeholder="비밀번호를 한 번 더 입력" autoComplete="new-password" /></label><div className="join-account-callout"><LockKeyhole /><p><strong>정산 계좌와 직인은 지금 받지 않습니다.</strong><span>가입 완료 후 화주 포털에 로그인한 뒤, 정산 정보 탭에서 안전하게 등록해 주세요.</span></p></div></div><Button type="submit" className="join-submit" disabled={register.isPending || inviteInfo.isLoading || inviteInfo.isError}>{register.isPending || inviteInfo.isLoading ? "가입 처리 중..." : "가입 완료하고 로그인"} <ArrowRight /></Button></form></div></main>;
}
