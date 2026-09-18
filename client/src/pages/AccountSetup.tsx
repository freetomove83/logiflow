import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, Building2, KeyRound, LockKeyhole, ShieldCheck, UserRoundCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type OrganizationType = "agency" | "shipper";
const onlyDigits = (value: string) => value.replace(/\D/g, "").slice(0, 10);

export default function AccountSetupPage() {
  const [location, setLocation] = useLocation();
  const parameters = new URLSearchParams(typeof window === "undefined" ? location.split("?")[1] : window.location.search);
  const inviteToken = parameters.get("inviteToken") || "";
  const staffInviteToken = parameters.get("staffInviteToken") || "";
  const requestedRole: OrganizationType = inviteToken || parameters.get("role") === "shipper" ? "shipper" : "agency";
  const presetOrganizationName = parameters.get("organization") || "";
  const returnTo = parameters.get("returnTo")?.startsWith("/") ? parameters.get("returnTo")! : "";
  const [organizationType, setOrganizationType] = useState<OrganizationType>(requestedRole);
  const [organizationName, setOrganizationName] = useState(presetOrganizationName);
  const [businessNumber, setBusinessNumber] = useState("");
  const [contactName, setContactName] = useState("");
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const utils = trpc.useUtils();
  const shipperSetup = trpc.invites.shipperSetup.useQuery({ token: inviteToken || "no-invite" }, { enabled: Boolean(inviteToken), retry: false });
  const staffSetup = trpc.invites.staffSetup.useQuery({ token: staffInviteToken || "no-staff-invite" }, { enabled: Boolean(staffInviteToken), retry: false });
  const effectiveOrganizationType = staffSetup.data?.organizationType ?? organizationType;
  const effectiveOrganizationName = shipperSetup.data?.shipperName ?? staffSetup.data?.organizationName ?? organizationName;
  const effectiveBusinessNumber = shipperSetup.data?.businessNumber ?? staffSetup.data?.businessNumber ?? businessNumber;
  const effectiveContactName = staffSetup.data?.contactName ?? contactName;
  const hasLockedInvite = Boolean(inviteToken || staffInviteToken);
  const register = trpc.auth.registerCredential.useMutation({
    onSuccess: async result => {
      await utils.auth.me.invalidate();
      toast.success(`${result.loginId} 계정을 설정했습니다. 이제 담당자 계정으로 로그인됩니다.`);
      const target = returnTo || (result.organizationType === "agency" ? `/agency/invites?agency=${encodeURIComponent(organizationName)}` : "/console");
      setLocation(target);
    },
    onError: error => toast.error(error.message),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (effectiveBusinessNumber.length !== 10) return toast.error("사업자등록번호 10자리를 입력해 주세요.");
    if (password !== passwordConfirm) return toast.error("비밀번호 확인이 일치하지 않습니다.");
    register.mutate({ organizationType: effectiveOrganizationType, organizationName: effectiveOrganizationName.trim(), businessNumber: effectiveBusinessNumber, contactName: effectiveContactName.trim(), loginId: loginId.trim().toLowerCase(), password, inviteToken: inviteToken || undefined, staffInviteToken: staffInviteToken || undefined });
  };

  const roleName = effectiveOrganizationType === "agency" ? "대리점 운영자" : "화주 담당자";
  const lockedInfoLoading = inviteToken ? shipperSetup.isLoading : staffInviteToken ? staffSetup.isLoading : false;
  const lockedInfoError = inviteToken ? shipperSetup.isError : staffInviteToken ? staffSetup.isError : false;
  return <main className="account-access-page"><header><Link href="/" className="account-brand"><span>✦</span><strong>logiflow</strong><em>CS CONSOLE</em></Link><Link href="/login" className="account-home-link">이미 계정이 있습니다</Link></header><section className="account-access-shell"><aside><p className="landing-eyebrow">PARTNER ACCOUNT SETUP</p><h1>조직은 확인하고,<br /><i>계정은 담당자별로</i><br />만듭니다.</h1><p>사업자번호는 대리점 또는 화주 소속을 확인하는 기준입니다. 실제 콘솔 접근은 담당자별 아이디와 비밀번호, 그리고 역할 권한으로 관리합니다.</p><div className="account-principles"><span><Building2 />사업자번호는 소속 확인에만 사용</span><span><UserRoundCheck />대표 운영자·CS 담당자별 개별 계정</span><span><ShieldCheck />비밀번호는 단방향 암호화로 저장</span></div></aside><div className="account-access-card"><div className="account-card-heading"><span><KeyRound /></span><div><p>CREATE CREDENTIAL</p><h2>{staffInviteToken ? `${roleName.replace("운영자", "")} 계정 활성화` : `${roleName} 계정 설정`}</h2></div></div><div className="role-switch" role="group" aria-label="계정 소속 선택"><button type="button" className={effectiveOrganizationType === "agency" ? "active" : ""} onClick={() => setOrganizationType("agency")} disabled={hasLockedInvite}>대리점 운영자</button><button type="button" className={effectiveOrganizationType === "shipper" ? "active" : ""} onClick={() => setOrganizationType("shipper")} disabled={hasLockedInvite}>화주 담당자</button></div>{inviteToken && <div className="credential-invite-note"><ShieldCheck />대리점이 등록한 화주 정보가 자동 적용되었습니다. 회사명과 사업자등록번호를 다시 입력할 필요가 없습니다.</div>}{staffInviteToken && <div className="credential-invite-note"><UserRoundCheck />조직 운영자가 보낸 담당자 초대 링크입니다. 초대받은 담당자와 조직 정보가 자동 적용되며 링크는 한 번만 활성화됩니다.</div>}{lockedInfoError && <div className="credential-invite-error">유효하지 않거나 만료된 초대 링크입니다. 초대를 보낸 운영자에게 새 링크 발급을 요청해 주세요.</div>}<form onSubmit={submit} className="account-form">{hasLockedInvite ? <div className="invite-company-summary"><span>{staffInviteToken ? "초대받은 담당자 및 소속 정보" : "초대 화주 정보"}</span><strong>{lockedInfoLoading ? "초대 정보를 확인하고 있습니다..." : effectiveOrganizationName}</strong><small>{staffInviteToken && !lockedInfoLoading ? `${effectiveContactName} 담당자 · ` : ""}사업자등록번호 {lockedInfoLoading ? "" : effectiveBusinessNumber}</small></div> : <><label>{organizationType === "agency" ? "대리점명" : "화주사명"}<Input required value={organizationName} onChange={event => setOrganizationName(event.target.value)} placeholder={organizationType === "agency" ? "예: 서울중앙물류" : "예: (주)에이블컴퍼니"} /></label><div className="account-find-grid"><label>사업자등록번호<Input required value={businessNumber} onChange={event => setBusinessNumber(onlyDigits(event.target.value))} inputMode="numeric" placeholder="숫자 10자리" /></label><label>대표 {organizationType === "agency" ? "운영자" : "담당자"}명<Input required value={contactName} onChange={event => setContactName(event.target.value)} placeholder="성명 입력" /></label></div></>}{inviteToken && <label>대표 화주 담당자명<Input required value={contactName} onChange={event => setContactName(event.target.value)} placeholder="성명 입력" /></label>}<label>로그인 아이디<Input required autoComplete="username" value={loginId} onChange={event => setLoginId(event.target.value)} placeholder="영문 소문자·숫자 6~48자" /><small>회사 공용 아이디가 아닌, 이 담당자에게만 부여되는 아이디입니다.</small></label><div className="account-find-grid"><label>비밀번호<Input required type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="10자 이상 설정" /></label><label>비밀번호 확인<Input required type="password" autoComplete="new-password" value={passwordConfirm} onChange={event => setPasswordConfirm(event.target.value)} placeholder="한 번 더 입력" /></label></div><div className="credential-security-note"><LockKeyhole />비밀번호 원문은 저장하지 않으며, 해시값만 보관합니다.</div><Button type="submit" className="account-submit" disabled={register.isPending || lockedInfoLoading || lockedInfoError}>{register.isPending ? "계정 설정 중..." : "아이디·비밀번호 설정 완료"}<ArrowRight /></Button></form><footer>계정 생성 후에도 담당자 추가는 대리점 설정의 조직·권한 화면에서 초대 방식으로 진행할 수 있습니다.</footer></div></section></main>;
}
