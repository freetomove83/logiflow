import type { ReactNode } from "react";
import { AlertTriangle, ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

type OrganizationType = "agency" | "shipper";

export function OrganizationRouteGate({ expected, children }: { expected: OrganizationType; children: ReactNode }) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const profile = trpc.auth.profile.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  if (authLoading || (isAuthenticated && profile.isLoading)) return <main className="console-access-gate"><div><ShieldCheck /><p className="eyebrow">SECURE WORKSPACE</p><h1>조직 권한을 확인하고 있습니다.</h1><span>담당자별 접근 범위를 준비하는 중입니다.</span></div></main>;
  if (!isAuthenticated) return <main className="console-access-gate"><div><LockKeyhole /><p className="eyebrow">SIGN IN REQUIRED</p><h1>로그인 후 이 화면을 열 수 있습니다.</h1><span>{expected === "agency" ? "대리점 운영자" : "화주 담당자"} 개인 계정으로 로그인해 주세요.</span><Button onClick={() => window.location.assign(`/login?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`)} className="mt-5 bg-[#0e9f95] hover:bg-[#0b887f]">로그인하기 <ArrowRight /></Button></div></main>;
  if (profile.isError || profile.data?.organizationType !== expected) return <main className="console-access-gate"><div><AlertTriangle /><p className="eyebrow">ACCESS RESTRICTED</p><h1>현재 조직에는 권한이 없는 화면입니다.</h1><span>{expected === "agency" ? "화주 초대와 대리점 운영 기능은 대리점 계정에서만" : "화주 담당자 초대 기능은 해당 화주 소속 계정에서만"} 사용할 수 있습니다.</span><Button onClick={() => window.location.assign("/console")} variant="outline" className="mt-5">내 업무 공간으로</Button></div></main>;
  return <>{children}</>;
}
