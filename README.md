# 스터디 인증 시스템

GitHub 커밋을 통한 스터디 참여 인증 시스템입니다.

## 🚀 주요 기능

### 1. GitHub OAuth 인증
- GitHub 계정으로 로그인
- 사용자 레포지토리 목록 조회
- 액세스 토큰 관리

### 2. 스터디 관리
- 스터디 생성/수정/삭제
- 공개/비공개 스터디 설정
- 참여자 관리
- 인증 시간 설정

### 3. 레포지토리 연동
- 여러 레포지토리 등록 가능
- GitHub 웹훅 자동 설정
- 실시간 커밋 감지

### 4. 커밋 인증
- 설정된 시간 내 커밋 인증
- 인증 성공률 통계
- 커밋 히스토리 관리

## 📁 프로젝트 구조

```
src/
├── app/                          # Next.js App Router
│   ├── page.tsx                 # 메인 페이지
│   ├── auth/
│   │   ├── login/page.tsx       # 로그인 페이지
│   │   └── callback/page.tsx    # OAuth 콜백 페이지
│   ├── dashboard/page.tsx       # 대시보드
│   └── study/
│       ├── create/page.tsx      # 스터디 생성
│       └── [id]/
│           ├── page.tsx         # 스터디 상세
│           └── manage/page.tsx  # 스터디 관리
├── components/                   # 재사용 컴포넌트
│   ├── GitHubOAuth.tsx          # GitHub OAuth 컴포넌트
│   └── RepositorySelector.tsx   # 레포지토리 선택 컴포넌트
├── lib/
│   └── api.ts                   # API 클라이언트
└── types/
    └── index.ts                 # TypeScript 타입 정의
```

## 🔧 설정 방법

### 1. 환경 변수 설정
```bash
# .env.local
NEXT_PUBLIC_GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api
```

### 2. GitHub OAuth App 설정
1. GitHub → Settings → Developer settings → OAuth Apps
2. New OAuth App 생성
3. Authorization callback URL: `http://localhost:3000/auth/callback`

### 3. 백엔드 API 엔드포인트 (구현 필요)

#### 인증 관련
- `POST /api/auth/github/callback` - OAuth 콜백 처리
- `GET /api/auth/me` - 현재 사용자 정보
- `POST /api/auth/logout` - 로그아웃

#### 스터디 관련
- `GET /api/studies/my` - 내 스터디 목록
- `GET /api/studies/public` - 공개 스터디 목록
- `POST /api/studies` - 스터디 생성
- `GET /api/studies/:id` - 스터디 상세
- `PATCH /api/studies/:id` - 스터디 수정
- `POST /api/studies/:id/join` - 스터디 참여
- `GET /api/studies/:id/participants` - 참여자 목록
- `DELETE /api/studies/:id/participants/:userId` - 참여자 제거

#### GitHub 관련
- `GET /api/github/repositories` - 사용자 레포지토리 목록
- `POST /api/github/repositories/:id/webhook` - 웹훅 설정
- `DELETE /api/github/repositories/:id/webhook/:webhookId` - 웹훅 제거

#### 커밋 인증 관련
- `POST /api/webhooks/github` - GitHub 웹훅 수신
- `GET /api/commits/:participantId` - 커밋 인증 기록
- `GET /api/studies/:id/commits/stats` - 스터디 커밋 통계

## 🔄 인증 플로우

1. **로그인**: GitHub OAuth로 사용자 인증
2. **스터디 참여**: 원하는 스터디 선택 후 참여 신청
3. **레포지토리 등록**: 인증할 레포지토리 선택
4. **웹훅 설정**: 선택한 레포지토리에 웹훅 자동 설정
5. **커밋 인증**: 설정된 시간 내에 커밋하면 자동 인증
6. **통계 확인**: 인증 성공률 및 통계 확인

## 🎯 백엔드 구현 가이드

### 웹훅 처리
```javascript
// GitHub 웹훅 페이로드 처리
app.post('/api/webhooks/github', (req, res) => {
  const { repository, commits, head_commit } = req.body;

  // 1. 웹훅 서명 검증
  // 2. 해당 레포지토리가 등록된 스터디 찾기
  // 3. 커밋 시간이 인증 시간 내인지 확인
  // 4. 커밋 인증 기록 저장
  // 5. 사용자에게 알림 (선택사항)
});
```

### 인증 시간 검증
```javascript
function isValidCommitTime(commitTime, authConfig) {
  const commitDate = new Date(commitTime);
  const commitHour = commitDate.getHours();
  const commitMinute = commitDate.getMinutes();

  const startTime = parseTime(authConfig.auth_time_start);
  const endTime = parseTime(authConfig.auth_time_end);

  return isTimeBetween(commitHour, commitMinute, startTime, endTime);
}
```

## 🛠 개발 가이드

### 컴포넌트 사용 예시

```tsx
// 레포지토리 선택 컴포넌트 사용
import RepositorySelector from '@/components/RepositorySelector';

function JoinStudyModal() {
  const [selectedRepos, setSelectedRepos] = useState([]);

  return (
    <RepositorySelector
      onRepositoriesSelected={setSelectedRepos}
      selectedRepositories={selectedRepos}
    />
  );
}
```

```tsx
// GitHub OAuth 컴포넌트 사용
import GitHubOAuth from '@/components/GitHubOAuth';

function LoginPage() {
  return (
    <GitHubOAuth
      onLoginSuccess={(user) => {
        // 로그인 성공 처리
      }}
      onLoginError={(error) => {
        // 에러 처리
      }}
    />
  );
}
```

### API 호출 예시

```tsx
import { studyAPI, githubAPI } from '@/lib/api';

// 스터디 목록 조회
const studies = await studyAPI.getMyStudies();

// 레포지토리 목록 조회
const repositories = await githubAPI.getUserRepositories();

// 스터디 참여
await studyAPI.joinStudy(studyId, {
  repository_ids: [123, 456]
});
```

## 🚀 시작하기

개발 서버 실행:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

[http://localhost:3000](http://localhost:3000)에서 결과를 확인하세요.

## 📋 TODO

- [ ] 백엔드 API 구현
- [ ] GitHub 웹훅 처리 로직
- [ ] 실시간 알림 시스템
- [ ] 모바일 반응형 개선
- [ ] 다크 모드 지원
- [ ] 국제화 (i18n)
- [ ] 커밋 메시지 분석
- [ ] 스터디 통계 대시보드 개선
