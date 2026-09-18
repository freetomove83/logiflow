import { useState } from "react";
import { Link, useLocation } from "wouter";
import { AlertCircle, ArrowRight, Building2, Eye, EyeOff, KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function AccountLoginPage() {
  const [location, setLocation] = useLocation();
  const params = new URLSearchParams(typeof window === "undefined" ? location.split("?")[1] : window.location.search);
  const returnTo = params.get("returnTo")?.startsWith("/") ? params.get("returnTo")! : "/console";
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const utils = trpc.useUtils();
  const login = trpc.auth.loginCredential.useMutation({
    onSuccess: async result => {
      await Promise.all([
        utils.auth.me.invalidate(),
        utils.auth.profile.invalidate(),
        utils.operations.shipperDocumentDashboard.invalidate(),
        utils.operations.agencyShipperHistory.invalidate(),
        utils.permissions.agencyMembers.invalidate(),
      ]);
      toast.success(`${result.organizationName} ${result.contactName}님, 로그인했습니다.`);
      setLocation(returnTo);
    },
    onError: error => setLoginError(error.message),
  });
  const submitLogin = (event: React.FormEvent) => {
    event.preventDefault();
    if (!loginId.trim() && !password) return setLoginError("아이디와 비밀번호를 모두 입력해 주세요.");
    if (!loginId.trim()) return setLoginError("등록한 로그인 아이디를 입력해 주세요.");
    if (!password) return setLoginError("비밀번호를 입력해 주세요.");
    setLoginError(null);
    login.mutate({ loginId: loginId.trim().toLowerCase(), password });
  };
  return <main className="account-access-page account-login-page"><header><Link href="/" className="account-brand"><span>✦</span><strong>logiflow</strong><em>CS CONSOLE</em></Link><Link href="/" className="account-home-link">서비스 소개</Link></header><section className="account-access-shell"><aside><p className="landing-eyebrow">PARTNER ACCOUNT ACCESS</p><h1>계정은 <i>담당자별로</i>,<br />업무 화면은 <i>조직별로.</i></h1><p>대리점 운영자와 화주 담당자는 각자 만든 아이디와 비밀번호로 로그인합니다. 로그인 후에는 소속 조직에 필요한 메뉴만 표시됩니다.</p><div className="account-principles"><span><Building2 />회사 식별 · 사업자등록번호</span><span><KeyRound />개인 로그인 · 담당자별 아이디</span><span><ShieldCheck />업무 분리 · 조직별 메뉴</span></div></aside><div className="account-access-card login-access-card"><div className="account-card-heading"><span><LockKeyhole /></span><div><p>SECURE SIGN IN</p><h2>LogiFlow 로그인</h2></div></div><div className="account-guide-strip"><ShieldCheck /><p><strong>담당자 개인 계정으로 접속하세요.</strong><span>회사 공용 아이디나 사업자등록번호로는 로그인할 수 없습니다.</span></p></div>{import.meta.env.DEV && <div className="credential-invite-note"><ShieldCheck /><p><strong>개발 미리보기 테스트 계정</strong><span>대리점 대표: test.agency.owner · 비밀번호: Logiflow!2026</span></p></div>}<form onSubmit={submitLogin} className="account-form" noValidate><label>로그인 아이디<Input aria-invalid={Boolean(loginError)} autoComplete="username" value={loginId} onChange={event => { setLoginId(event.target.value); setLoginError(null); }} placeholder="예: operation.park" /><small>가입 또는 초대 활성화 시 설정한 아이디</small></label><label>비밀번호<div className="password-field"><Input aria-invalid={Boolean(loginError)} type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={event => { setPassword(event.target.value); setLoginError(null); }} placeholder="비밀번호 입력" /><button type="button" onClick={() => setShowPassword(current => !current)} aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}>{showPassword ? <EyeOff /> : <Eye />}</button></div></label>{loginError && <div className="account-inline-error" role="alert" aria-live="assertive"><AlertCircle /><p><strong>로그인할 수 없습니다.</strong><span>{loginError}</span></p></div>}<Button type="submit" className="account-submit" disabled={login.isPending}>{login.isPending ? "로그인 정보 확인 중..." : "로그인하고 콘솔 열기"}<ArrowRight /></Button></form><div className="account-recovery-link"><div><KeyRound /><p><strong>아이디를 잊으셨나요?</strong><span>사업자등록번호와 등록 담당자명으로 마스킹된 아이디를 확인합니다.</span></p></div><Link href="/account-recovery">아이디 찾기 <ArrowRight /></Link></div><footer>아직 계정이 없으신가요? <Link href="/agency-signup">대리점 가입</Link> 또는 초대받은 <Link href="/join/invite-seoul-central-8f4d">화주 가입</Link>을 진행해 주세요.</footer></div></section></main>;
}
