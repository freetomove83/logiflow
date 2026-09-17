# LogiFlow CS Console — 마지막 작업 버전 자료 패키지

기준 체크포인트: `7e8155ce`

이 패키지는 마지막 작업 버전의 재현·검토에 필요한 비민감 소스와 프로젝트 자료를 포함합니다. 포함 대상은 `client/`, `server/`, `shared/`, `drizzle/`, `package.json`, `pnpm-lock.yaml`, TypeScript/Vite 설정, 테스트 파일, `todo.md`, `validation-notes.md`, `README.md`, `components.json`, `vitest.config.ts` 및 이 매니페스트입니다.

보안을 위해 `.env` 계열 파일, API 키·토큰·JWT 비밀값, 세션·쿠키, `node_modules/`, `dist/`, 개발 서버 로그, 브라우저 세션·스크린샷, 고객 개인정보가 들어갈 수 있는 로컬 업로드 파일, 직인 원본 바이너리, 정산 계좌 원문, 데이터베이스 덤프·접속 문자열은 포함하지 않습니다. 직인과 증빙 파일은 애플리케이션에서 S3 및 데이터베이스 메타데이터 경로로 관리되며, 이 패키지에는 원본 파일을 복제하지 않습니다.

검증 기준은 `pnpm check`, `pnpm test` 21건, `pnpm build` 통과 기록입니다. 데이터베이스 자체의 실제 운영 데이터는 패키지에 포함하지 않으며, 스키마와 migration SQL만 포함합니다.
