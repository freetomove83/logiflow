import { useState } from "react";
import { ArrowLeft, Check, KeyRound, Loader2, Plus, ShieldCheck, UserRoundPlus, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const permissionOptions = [
  ["tickets.manage", "CS 티켓 관리"],
  ["compensation.review", "보상 검토"],
  ["shippers.manage", "화주 관리"],
  ["reports.view", "업무 보고서 열람"],
  ["documents.manage", "문서·직인 관리"],
  ["settings.manage", "설정 관리"],
  ["team.manage", "직원 초대·권한 관리"],
] as const;
type PermissionKey = (typeof permissionOptions)[number][0];

export default function AgencyPermissionsPage() {
  const { isAuthenticated } = useAuth();
  const profile = trpc.auth.profile.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const members = trpc.permissions.agencyMembers.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const createInvite = trpc.invites.createStaff.useMutation();
  const updateMember = trpc.permissions.updateAgencyMember.useMutation();
  const utils = trpc.useUtils();
  const [contactName, setContactName] = useState("");
  const [permissions, setPermissions] = useState<PermissionKey[]>(["tickets.manage"]);
  const [latestInvite, setLatestInvite] = useState("");
  const canInvite = profile.data?.accountRole === "owner";
  const toggle = (permission: PermissionKey) => setPermissions(current => current.includes(permission) ? current.filter(item => item !== permission) : [...current, permission]);
  const issueInvite = async () => {
    if (!contactName.trim()) return toast.error("초대할 직원의 이름을 입력해 주세요.");
    if (!profile.data?.organizationName || !profile.data.businessNumber) return toast.error("대리점 조직 정보를 확인할 수 없습니다.");
    try {
      const result = await createInvite.mutateAsync({ organizationType: "agency", organizationName: profile.data.organizationName, businessNumber: profile.data.businessNumber, contactName: contactName.trim(), permissions });
      const url = `${window.location.origin}/account-setup?role=agency&staffInviteToken=${result.token}`;
      setLatestInvite(url);
      setContactName("");
      toast.success("직원 초대 링크와 권한 사전 설정을 저장했습니다.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "직원 초대를 만들지 못했습니다."); }
  };
  const savePermissions = async (userId: number, next: PermissionKey[]) => {
    try {
      await updateMember.mutateAsync({ userId, permissions: next });
      await utils.permissions.agencyMembers.invalidate();
      toast.success("직원의 세부 권한을 저장했습니다.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "권한을 저장하지 못했습니다."); }
  };
  return <main className="min-h-screen bg-[#f5f7f4] text-[#15263f]"><header className="border-b border-[#e1e8e5] bg-[#fffefb] px-5 py-4 sm:px-10"><button onClick={() => window.location.assign("/console")} className="inline-flex items-center gap-2 text-sm font-semibold text-[#52647b]"><ArrowLeft className="h-4 w-4" />콘솔로 돌아가기</button></header><div className="mx-auto max-w-6xl px-5 py-8 sm:px-10"><div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[11px] font-bold tracking-[.16em] text-[#0e9f95]">AGENCY ADMIN · ACCESS CONTROL</p><h1 className="mt-2 text-3xl font-black tracking-tight">직원 초대 및 세부 권한 관리</h1><p className="mt-2 text-sm text-[#637287]">담당자별 업무 범위를 최소 권한으로 부여하고, 초대 링크에 권한 사전 설정을 포함합니다.</p></div><Badge className="w-fit bg-[#eaf6f4] text-[#087970]"><ShieldCheck className="mr-1 h-3.5 w-3.5" />대표 운영자 전용</Badge></div><div className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]"><section className="rounded-2xl border border-[#d9e6e1] bg-[#fffefb] p-6 shadow-sm"><div className="flex items-center gap-3"><span className="rounded-xl bg-[#eaf6f4] p-2 text-[#0e9f95]"><UserRoundPlus className="h-5 w-5" /></span><div><p className="text-[11px] font-bold tracking-[.13em] text-[#0e9f95]">NEW TEAM MEMBER</p><h2 className="text-lg font-bold">대리점 직원 초대</h2></div></div>{canInvite ? <><label className="mt-6 block text-sm font-semibold">직원 이름<Input className="mt-2" value={contactName} onChange={event => setContactName(event.target.value)} placeholder="예: 이운영" /></label><p className="mt-5 text-sm font-semibold">초대 시 부여할 권한</p><div className="mt-3 flex flex-wrap gap-2">{permissionOptions.map(([key, label]) => <button key={key} onClick={() => toggle(key)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${permissions.includes(key) ? "border-[#0e9f95] bg-[#eaf6f4] text-[#087970]" : "border-[#d8e0dd] bg-white text-[#617084]"}`}><Check className={`mr-1 inline h-3 w-3 ${permissions.includes(key) ? "opacity-100" : "opacity-0"}`} />{label}</button>)}</div><Button onClick={issueInvite} disabled={createInvite.isPending} className="mt-6 w-full bg-[#0e9f95] hover:bg-[#0b887f]">{createInvite.isPending ? <Loader2 className="animate-spin" /> : <Plus />}{createInvite.isPending ? "초대 링크 생성 중" : "직원 초대 링크 생성"}</Button>{latestInvite && <div className="mt-4 rounded-xl border border-[#c5e7e1] bg-[#effaf8] p-3"><p className="text-xs font-semibold text-[#087970]">직원용 계정 활성화 링크</p><div className="mt-2 flex gap-2"><Input readOnly value={latestInvite} className="bg-white text-xs" /><Button size="sm" variant="outline" onClick={() => { navigator.clipboard?.writeText(latestInvite); toast.success("초대 링크를 복사했습니다."); }}>복사</Button></div></div>}</> : <p className="mt-6 rounded-xl bg-[#fff3e8] p-4 text-sm text-[#9d5d25]">대표 운영자만 새 직원 초대와 세부 권한 설정을 할 수 있습니다.</p>}</section><section className="rounded-2xl border border-[#d9e6e1] bg-[#fffefb] p-6 shadow-sm"><div className="flex items-center gap-3"><span className="rounded-xl bg-[#eef2f8] p-2 text-[#263e60]"><UsersRound className="h-5 w-5" /></span><div><p className="text-[11px] font-bold tracking-[.13em] text-[#637287]">ACTIVE AGENCY MEMBERS</p><h2 className="text-lg font-bold">소속 직원 권한</h2></div></div>{members.isLoading ? <div className="py-16 text-center text-sm text-[#68788c]"><Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />직원 권한을 불러오는 중입니다.</div> : members.isError ? <p className="mt-6 rounded-xl bg-[#fff1f1] p-4 text-sm text-[#b34848]">{members.error.message}</p> : <div className="mt-6 space-y-4">{members.data?.map(member => <article key={member.userId} className="rounded-xl border border-[#e1e8e5] p-4"><div className="flex items-start justify-between gap-3"><div><strong>{member.contactName}</strong><p className="mt-1 text-xs text-[#708093]">{member.loginId} · {member.accountRole === "owner" ? "대표 운영자" : "대리점 담당자"}</p></div>{member.accountRole === "owner" ? <Badge className="bg-[#eef2f8] text-[#263e60]">전체 권한</Badge> : <Badge className="bg-[#eaf6f4] text-[#087970]">세부 설정</Badge>}</div><div className="mt-3 flex flex-wrap gap-2">{permissionOptions.map(([key, label]) => { const enabled = member.permissions.includes(key); return <button key={key} disabled={!canInvite || member.accountRole === "owner" || updateMember.isPending} onClick={() => savePermissions(member.userId, enabled ? member.permissions.filter(item => item !== key) : [...member.permissions, key])} className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${enabled ? "border-[#0e9f95] bg-[#eaf6f4] text-[#087970]" : "border-[#d8e0dd] text-[#8290a0]"} disabled:cursor-not-allowed disabled:opacity-60`}><KeyRound className="mr-1 inline h-3 w-3" />{label}</button>; })}</div></article>)}{members.data?.length === 0 && <p className="rounded-xl bg-[#f5f7f4] p-5 text-sm text-[#637287]">아직 활성화된 대리점 담당자가 없습니다. 왼쪽에서 첫 직원을 초대해 주세요.</p>}</div>}</section></div></div></main>;
}
