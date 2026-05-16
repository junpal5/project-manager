# Project Manager — CLAUDE.md

## 프로젝트 개요
회사 내부용 조사 프로젝트 관리 시스템. 순수 정적 파일(HTML/JS/CSS)로 구성되며 GitHub를 데이터베이스로 사용.

## 배포 환경
- **호스팅**: GitHub Pages (`junpal5/project-manager` 저장소, `main` 브랜치)
- **데이터 저장**: GitHub Contents API를 통해 JSON 파일을 `research-pm/projects/{folder}/{slug}.json`에 저장
- **PAT**: GitHub Personal Access Token — 관리자 브라우저 localStorage에 보관

## 파일 구조
```
/
├── index.html          # 관리자 페이지 (전체 기능)
├── participant.html    # 참여자 전용 뷰 (읽기 전용)
└── research-pm/projects/{folder}/{name}.json  # 프로젝트 데이터
```

## 데이터 스키마 (project JSON)
```json
{
  "project": {
    "id": "project_...",
    "name": "프로젝트명",
    "folder": "폴더명",
    "passwordHash": "sha256_hex",
    "participants": [{"id","name","role","email","addedAt"}],
    "requests": [{"id","taskInstanceId","taskTitle","todoIndex","todoText","message","toParticipantId","toParticipantName","sentAt"}],
    "selectedTasks": [{"id","category","title","todos":[],"instanceId","assignments":{"todoIdx":"memberId"}}],
    "activeStep": "instanceId",
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
- [x] 다중 프로젝트 관리 (로컬스토리지 + GitHub 자동 동기화)
- [x] 과업 라이브러리 + 워크플로우 단계 관리
- [x] 체크리스트 완료 처리
- [x] 버전 히스토리 (자동 변경 요약 + 이름 추천)
- [x] 버전 배너 (좌측 하단, 클릭 시 히스토리 모달)
- [x] 참여자 관리 (추가/삭제, 역할, 이메일)
- [x] 담당자 지정 (체크리스트 항목별)
- [x] 업무 요청 발송 (모달 → JSON 저장 → GitHub 동기화)
- [x] 참여자 공유 링크 생성 (SHA-256 비밀번호 보호)
- [x] participant.html: 내 업무 / 전체 현황 / 알림함 탭, 60초 자동 새로고침
- [ ] 이메일 알림 (EmailJS 연동 예정)
- [ ] 참여자 쓰기 권한 (현재 읽기 전용)
- [ ] Naver Works 연동

## 디자인 시스템 (Meta-inspired)
CSS 변수: `--canvas`, `--surface-soft`, `--ink-deep`, `--ink`, `--primary(#0064e0)`, `--ink-button(#0a1317)`
버튼: 모두 pill 형태 (`border-radius:100px`). 마케팅=검정(`--ink-button`), 커머스=코발트(`--primary`)
카드: `border-radius` 16px(기본) / 24px(패널) / 32px(hero). 그림자 없음, 헤어라인 보더

## 개발 시 주의사항
- `participant.html`은 읽기 전용 — GitHub 공개 raw URL로 JSON 직접 fetch
- 참여자가 쓰기 작업(완료 처리 등)을 하려면 별도 PAT 전달 방식 필요
- `renderDetail()`에서 participants 배열이 있을 때만 담당자 드롭다운 렌더링
- `removeTodoItem()`은 assignments 인덱스도 함께 재정렬함
- 버전 저장은 `openVersionSuggestModal()` → `confirmVersionSave()` 흐름으로 처리
