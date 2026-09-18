import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Copy, KeyRound, Link2, ShieldCheck, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

type OrganizationType = "agency" | "shipper";
const digits = (value: string) => value.replace(/\D/g, "").slice(0, 10);

export default function StaffInvitePage() {
  const [location] = useLocation();
  const params = new URLSearchParams(typeof window === "undefined" ? location.split("?")[1] : window.location.search);
  const [organizationType, setOrganizationType] = useState<OrganizationType>(params.get("role") === "shipper" ? "shipper" : "agency");
  const [organizationName, setOrganizationName] = useState(params.get("organization") || "");
  const [businessNumber, setBusinessNumber] = useState("");
  const [contactName, setContactName] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const { isAuthenticated } = useAuth();
  const createInvite = trpc.invites.createStaff.useMutation({
    onSuccess: result => {
      const url = `${window.location.origin}/account-setup?role=${organizationType}&staffInviteToken=${encodeURIComponent(result.token)}`;
      setInviteUrl(url);
      toast.success(`${contactName} 담당자용 계정 활성화 링크를 만들었습니다.`);
    },
    onError: error => toast.error(error.message),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!isAuthenticated) return toast.error("조직 운영자 계정으로 로그인한 뒤 담당자를 초대해 주세요.");
    createInvite.mutate({ organizationType, organizationName: organizationName.trim(), businessNumber, contactName: contactName.trim() });
  };

  return <main className="account-access-page"><header><Link href="/" className="account-brand"><span>✦</span><strong>logiflow</strong><em>CS CONSOLE</em></Link><Link href="/console" className="account-home-link">콘솔로 돌아가기</Link></header><section className="account-access-shell"><aside><p className="landing-eyebrow">TEAM CREDENTIAL INVITATION</p><h1>팀원은 초대하고,<br /><i>각자 계정으로</i><br />접속합니다.</h1><p>운영자 계정은 추가 담당자에게 일회성 링크를 전달합니다. 담당자는 소속과 사업자번호를 다시 확인한 뒤 본인만 아는 아이디와 비밀번호를 설정합니다.</p><div className="account-principles"><span><UserPlus />담당자별 개별 접근 기록</span><span><KeyRound />1회성·7일 유효 계정 활성화 링크</span><span><ShieldCheck />소속·사업자번호 대조 후 활성화</span></div></aside><div className="account-access-card"><div className="account-card-heading"><span><UserPlus /></span><div><p>INVITE A TEAM MEMBER</p><h2>담당자 계정 초대</h2></div></div><div className="role-switch" role="group" aria-label="초대 조직 유형"><button type="button" className={organizationType === "agency" ? "active" : ""} onClick={() => setOrganizationType("agency")}>대리점 담당자</button><button type="button" className={organizationType === "shipper" ? "active" : ""} onClick={() => setOrganizationType("shipper")}>화주 담당자</button></div><form onSubmit={submit} className="account-form"><label>{organizationType === "agency" ? "대리점명" : "화주사명"}<Input required value={organizationName} onChange={event => setOrganizationName(event.target.value)} placeholder={organizationType === "agency" ? "예: 서울중앙물류" : "예: (주)에이블컴퍼니"} /></label><div className="account-find-grid"><label>사업자등록번호<Input required value={businessNumber} onChange={event => setBusinessNumber(digits(event.target.value))} inputMode="numeric" placeholder="숫자 10자리" /></label><label>초대할 담당자명<Input required value={contactName} onChange={event => setContactName(event.target.value)} placeholder="성명 입력" /></label></div><div className="credential-security-note"><ShieldCheck />초대 링크는 7일 동안 한 번만 사용할 수 있습니다.</div><Button type="submit" className="account-submit" disabled={createInvite.isPending}>{createInvite.isPending ? "초대 링크 생성 중..." : "담당자 계정 활성화 링크 만들기"}<Link2 /></Button></form>{inviteUrl && <div className="staff-invite-result"><div><Link2 /><span><strong>{contactName} 담당자용 활성화 링크</strong><small>{inviteUrl}</small></span></div><button type="button" onClick={() => { navigator.clipboard?.writeText(inviteUrl); toast.success("담당자 계정 활성화 링크를 복사했습니다."); }}><Copy />링크 복사</button></div>}<footer>초대받은 담당자는 회사 공용 계정이 아닌, 본인의 아이디·비밀번호로만 콘솔에 로그인합니다.</footer></div></section></main>;
}
