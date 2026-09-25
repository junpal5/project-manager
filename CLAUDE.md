# Project Manager — CLAUDE.md

## ⚠️ 코드 수정 시 필수 규칙
**모든 코드 변경(기능 추가·수정·버그픽스) 후 반드시 아래 3곳을 동시 업데이트할 것:**
1. `version.json` — version/label/date/changes 갱신
2. `index.html` 내 `SYSTEM_VERSION` 상수 — 버전 문자열 변경
3. `index.html` 내 `SYSTEM_CHANGELOG` 배열 — 최신 항목을 맨 앞에 추가

**버전 네이밍 기준:** 패치(버그픽스) → x.x.+1 / 마이너(신규 기능) → x.+1.0 / 메이저(구조 변경) → +1.0.0

## 프로젝트 개요
회사 내부용 조사 프로젝트 관리 시스템. 순수 정적 파일(HTML/JS/CSS)로 구성되며 GitHub를 데이터베이스로 사용.

## 배포 환경
- **호스팅**: GitHub Pages (`junpal5/project-manager`, `main` 브랜치)
- **데이터 저장**: GitHub Contents API → `research-pm/projects/{folder}/{slug}.json`
- **PAT**: 관리자 브라우저 localStorage에만 보관 (코드에 절대 하드코딩 금지)
- **git push**: PAT은 로컬 git remote URL에 포함 (`git remote get-url origin`으로 확인). 코드/문서에 토큰 직접 기재 금지

## 파일 구조
```
/
├── index.html          # 관리자 페이지 (전체 기능)
├── participant.html    # 참여자 전용 뷰 (읽기 전용)
├── dashboard.html      # 팀 대시보드 (읽기 전용, _dashboard.json 표시)
├── dashboard-view.js   # 대시보드 공용 렌더러 (PMDash.summarize / PMDash.render) — index.html·dashboard.html 공유
├── dashboard-view.css  # 대시보드 공용 스타일
├── version.json        # 시스템 버전 이력 (Claude 수정 시마다 업데이트)
└── research-pm/projects/
    ├── _dashboard.json     # 팀 대시보드 요약 (프로젝트 저장 시 자동 갱신, 민감정보 제외)
    └── {folder}/{name}.json
```

## 데이터 스키마 (project JSON)
```json
{
  "project": {
    "id": "project_...", "name": "...", "folder": "...",
    "passwordHash": "sha256_hex",
    "client": "발주처", "pm": "PM 이름", "startDate": "YYYY-MM-DD", "dueDate": "YYYY-MM-DD(납품일)",
    "status": "준비|진행|보류|완료",
    "currentStep": "instanceId (실제 진행 중인 단계 — activeStep과 별개)",
    "syncedPath": "마지막으로 GitHub에 저장한 경로 (이름 변경 시 이전 파일 삭제용)",
    "participants": [{"id","name","role","email","addedAt"}],
    "requests": [{"id","taskInstanceId","taskTitle","todoIndex","todoText",
                  "message","toParticipantId","toParticipantName","sentAt"}],
    "selectedTasks": [{"id","category","title","todos":[],
                       "instanceId","stepAssignee":"memberId","dueDate":"YYYY-MM-DD",
                       "assignments":{"todoIdx":"memberId"}}],
    "activeStep": "instanceId (화면에서 보고 있는 단계)",
    "taskStatus": {"instanceId-todoIdx": true},
    "notes": {"instanceId": "text"},
    "versionName": "v1.0",
    "versionHistory": [{"id","name","summary","savedAt","folder","metrics","snapshot"}],
    "lastModified": "ISO8601"
  },
  "github": {"owner","repo","branch","basePath"}
}
```

## 주요 기능 현황
- [x] 팀 대시보드 (첫 화면 탭 + 팀원용 dashboard.html, 요약 카드 필터·PM 필터·정렬·검색)
- [x] 프로젝트 정보 (발주처/PM/시작일/납품일/상태) + 프로젝트 삭제
- [x] 현재 단계 명시 지정 + 단계 예정일 + 지연 자동 판정
- [x] 템플릿 (appState.templates, localStorage) 추가/편집/삭제/적용, 워크플로우→템플릿 저장, 빈 단계 만들기
- [x] 다중 프로젝트 관리 (로컬스토리지 + GitHub 자동 동기화)
- [x] 과업 라이브러리 드로어 (우측 슬라이드, `+ 과업 추가` 버튼으로 진입)
- [x] 워크플로우 타임라인 뷰 (원형 스텝 번호 + 수직 연결선, 활성/완료 강조)
- [x] 체크리스트 완료 처리 / 편집 토글 (`수정` 버튼 클릭 시 편집 UI 표시)
- [x] 담당자 지정: 과업 단계별 `stepAssignee` + 체크리스트 항목별 `assignments`
- [x] 업무 요청 발송 (모달 → JSON 저장 → GitHub 동기화)
- [x] 프로젝트 버전 히스토리 (자동 변경 요약 + 이름 추천, 헤더 `버전 저장` 버튼)
- [x] 시스템 버전 배너 (좌측 하단, 클릭 시 SYSTEM_CHANGELOG 모달)
- [x] 참여자 관리 + 공유 링크 (SHA-256 비밀번호 보호)
- [x] participant.html: 내 업무 / 전체 현황 / 알림함, 60초 자동 새로고침
- [ ] 이메일 알림 (EmailJS 연동 예정)
- [ ] 참여자 쓰기 권한 (현재 읽기 전용)
- [ ] Naver Works 연동

## 디자인 시스템 (Meta-inspired)
CSS 변수: `--canvas` `--surface-soft` `--ink-deep` `--ink` `--primary(#0064e0)` `--ink-button(#0a1317)`
버튼: pill (`border-radius:100px`). 검정=마케팅 CTA, 코발트=커머스 CTA
카드: 16px(기본) / 24px(패널) / 32px(hero). 그림자 없음, 헤어라인 보더

## 개발 시 주의사항
- **시스템 버전 변경 시** `version.json` + `SYSTEM_VERSION` + `SYSTEM_CHANGELOG` 3곳 동시 업데이트
- **워크플로우 패널**: `.tl-item` flex 레이아웃 (spine + body + icon-btn). 타임라인 CSS: `.tl-dot` `.tl-line` `.tl-body` `.tl-chip`
- **체크리스트 편집 상태**: `const todoEditOpen={}` (instanceId → bool), `toggleTodoEditor(id)`로 토글
- **라이브러리 드로어**: `openLibraryDrawer()` / `closeLibraryDrawer()`. `#categoryFilter` `#taskLibrary`는 드로어 내부에 위치
- `removeTodoItem()`: `taskStatus` 키 재정렬 + `assignments` 인덱스 재정렬 동시 처리
- `participant.html`: raw GitHub URL로 JSON fetch (인증 불필요). 쓰기 시 별도 PAT 필요
- 프로젝트 버전 저장 흐름: `openVersionSuggestModal()` → `confirmVersionSave()`
- `renderDetail()`에서 participants 있을 때만 담당자 드롭다운 + 요청 버튼 렌더링
- **activeStep vs currentStep**: activeStep=화면에서 선택(보기)한 단계, currentStep=실제 진행 단계(대시보드 표시). `setCurrentStep()`은 상태가 '준비'면 '진행'으로 바꿈
- **지연 판정** (`PMDash.summarize`): 상태가 준비/진행이면서 납품일 경과 또는 현재 단계 예정일 경과(미완료)
- **텍스트 입력 저장 규칙**: 프로젝트명·폴더·발주처·PM은 input 시 로컬만 저장, change(입력 완료) 시 GitHub 동기화 — 입력 중간 이름으로 파일 생성 방지
- **GitHub 헬퍼**: `ghPut` / `ghDelete` / `ghGetSha`. 동기화 성공 후 `syncedPath`가 바뀌었으면 이전 파일 삭제, 이어서 `syncDashboardSummary()` (내용 변경 시에만 커밋)
- `render(full=true)`는 워크플로우 탭으로 전환함. 초기 로드는 `render();applyTab('dashboard')`
