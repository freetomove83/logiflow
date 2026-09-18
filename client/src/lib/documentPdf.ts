import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

type AgreementPdfInput = {
  documentRef: string;
  shipperName: string;
  amount?: string;
  finalizedAt: Date | string;
};

/** Builds a visual PDF in the browser so no private document or seal bytes are persisted by the server. */
export async function downloadAgreementPdf({ documentRef, shipperName, amount = "185,000", finalizedAt }: AgreementPdfInput) {
  const date = new Date(finalizedAt).toLocaleDateString("ko-KR");
  const sheet = document.createElement("section");
  sheet.setAttribute("aria-hidden", "true");
  sheet.style.cssText = "position:fixed;left:-10000px;top:0;width:794px;padding:64px;background:#fffefb;color:#15263f;font-family:'Noto Sans KR',Arial,sans-serif;line-height:1.65;z-index:-1;";
  sheet.innerHTML = `<div style="border-bottom:2px solid #0e9f95;padding-bottom:18px;display:flex;justify-content:space-between;font-size:13px;color:#53647a"><span>LOGIFLOW CS CONSOLE</span><span>DOCUMENT NO. ${documentRef}</span></div><h1 style="font-size:28px;margin:54px 0 12px;text-align:center">물류 사고 보상 합의서</h1><p style="text-align:center;color:#5f6f82;margin:0 0 48px">확정일 ${date}</p><p>본 문서는 물류 사고에 대한 보상 조건을 확인하기 위해 생성된 보상 합의서입니다.</p><div style="margin:36px 0;border:1px solid #dce4e0;padding:20px;display:grid;grid-template-columns:1fr 1fr;gap:16px"><div><b style="display:block;color:#708093;font-size:12px">화주</b>${shipperName}</div><div><b style="display:block;color:#708093;font-size:12px">합의 금액</b>₩ ${amount}</div><div><b style="display:block;color:#708093;font-size:12px">문서번호</b>${documentRef}</div><div><b style="display:block;color:#708093;font-size:12px">문서 상태</b>직인 날인 및 확정</div></div><p>화주와 대리점은 상기 보상 처리 조건을 확인하고 본 문서를 확정했습니다.</p><div style="margin-top:88px;display:flex;justify-content:space-between;border-top:1px solid #dce4e0;padding-top:22px"><div><b>대리점</b><br/>서울중앙물류</div><div style="text-align:right"><b>화주</b><br/>${shipperName}<br/><span style="color:#0e9f95">직인 날인 확인</span></div></div><p style="margin-top:64px;font-size:11px;color:#8793a0;text-align:center">LogiFlow CS Console · 문서 무결성 및 다운로드 이력은 콘솔에서 관리됩니다.</p>`;
  document.body.appendChild(sheet);
  try {
    const canvas = await html2canvas(sheet, { backgroundColor: "#fffefb", scale: 2, useCORS: true });
    const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
    const pageWidth = 210;
    const pageHeight = (canvas.height * pageWidth) / canvas.width;
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, pageWidth, pageHeight);
    pdf.save(`${documentRef}-보상합의서.pdf`);
  } finally {
    sheet.remove();
  }
}
