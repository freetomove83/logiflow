import { useState } from "react";
import { Link } from "wouter";
import { AlertCircle, ArrowLeft, Building2, KeyRound, Search, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";

const digitsOnly = (value: string) => value.replace(/\D/g, "").slice(0, 10);

export default function AccountRecoveryPage() {
  const [businessNumber, setBusinessNumber] = useState("");
  const [contactName, setContactName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ organizationName: string; maskedLoginId: string; organizationType: "agency" | "shipper" } | null>(null);
  const lookup = trpc.auth.lookupCredential.useMutation({
    onSuccess: data => { setError(null); setResult(data); },
    onError: lookupError => { setResult(null); setError(lookupError.message); },
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (businessNumber.length !== 10) return setError("사업자등록번호 10자리를 숫자로 입력해 주세요.");
    if (contactName.trim().length < 2) return setError("가입 시 등록한 담당자명을 두 글자 이상 입력해 주세요.");
    setError(null);
    lookup.mutate({ businessNumber, contactName: contactName.trim() });
  };
  return <main className="account-access-page account-login-page"><header><Link href="/" className="account-brand"><span>✦</span><strong>logiflow</strong><em>CS CONSOLE</em></Link><Link href="/login" className="account-home-link">로그인으로 돌아가기</Link></header><section className="account-access-shell"><aside><p className="landing-eyebrow">ACCOUNT RECOVERY</p><h1>아이디는 안전하게<br /><i>일부만 확인</i>합니다.</h1><p>소속 회사의 사업자등록번호와 가입 시 등록한 담당자명이 모두 일치할 때에만 아이디 일부를 표시합니다.</p><div className="account-principles"><span><Building2 />회사 소속 확인</span><span><KeyRound />마스킹된 아이디 표시</span><span><ShieldCheck />비밀번호는 표시하지 않음</span></div></aside><div className="account-access-card login-access-card"><div className="account-card-heading"><span><Search /></span><div><p>FIND ACCOUNT</p><h2>로그인 아이디 찾기</h2></div></div><div className="account-guide-strip"><ShieldCheck /><p><strong>본인 소속 정보로만 조회합니다.</strong><span>사업자등록번호는 숫자 10자리, 담당자명은 가입 당시와 동일하게 입력하세요.</span></p></div><form onSubmit={submit} className="account-form" noValidate><label>사업자등록번호<Input aria-invalid={Boolean(error)} value={businessNumber} onChange={event => { setBusinessNumber(digitsOnly(event.target.value)); setError(null); setResult(null); }} inputMode="numeric" placeholder="숫자 10자리" /><small>{businessNumber.length ? `${businessNumber.length}/10자리 입력됨` : "하이픈 없이 숫자만 입력"}</small></label><label>등록 담당자명<Input aria-invalid={Boolean(error)} value={contactName} onChange={event => { setContactName(event.target.value); setError(null); setResult(null); }} placeholder="예: 박지수" /><small>가입 또는 담당자 초대 시 등록한 성명</small></label>{error && <div className="account-inline-error" role="alert" aria-live="assertive"><AlertCircle /><p><strong>아이디를 찾을 수 없습니다.</strong><span>{error}</span></p></div>}<Button type="submit" className="account-submit" disabled={lookup.isPending}>{lookup.isPending ? "등록 정보를 확인 중..." : "등록 아이디 확인"}<Search /></Button></form>{result && <section className="account-recovery-result" aria-live="polite"><ShieldCheck /><div><p>등록 계정 확인</p><strong>{result.organizationName}</strong><span>로그인 아이디: <b>{result.maskedLoginId}</b></span></div><Link href="/login">로그인하기 <ArrowLeft className="rotate-180" /></Link></section>}<footer><Link href="/login">← 로그인 화면으로 돌아가기</Link></footer></div></section></main>;
}
