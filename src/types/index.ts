// 사용자 관련 타입
export interface User {
  id: string;
  username: string;
  email?: string;
  avatar_url: string;
  github_id: number;
  created_at: string;
  updated_at: string;
}

// GitHub 레포지토리 타입
export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description: string | null;
  updated_at: string;
  owner: {
    login: string;
    avatar_url: string;
  };
}

// 스터디 관련 타입
export interface Study {
  id: string;
  name: string;
  description: string;
  max_participants: number;
  is_public: boolean;
  owner_id: string;
  created_at: string;
  updated_at: string;
  participant_count: number;
  auth_config: StudyAuthConfig;
}

export interface StudyAuthConfig {
  daily_commit_required: boolean;
  auth_time_start: string; // "09:00"
  auth_time_end: string;   // "23:59"
  required_days: string[]; // ["monday", "tuesday", ...]
  timezone: string;        // "Asia/Seoul"
}

// 스터디 참여자 타입
export interface StudyParticipant {
  id: string;
  study_id: string;
  user_id: string;
  joined_at: string;
  status: 'active' | 'inactive' | 'banned';
  user: User;
  repositories: ParticipantRepository[];
  commit_stats: CommitStats;
}

export interface ParticipantRepository {
  id: string;
  participant_id: string;
  repository_id: number;
  repository_name: string;
  repository_full_name: string;
  repository_url: string;
  webhook_id?: string;
  webhook_status: 'active' | 'inactive' | 'error';
  created_at: string;
}

// 커밋 통계 타입
export interface CommitStats {
  total_commits: number;
  this_week_commits: number;
  this_month_commits: number;
  auth_success_rate: number;
  streak_days: number;
  last_commit_at?: string;
}

// 커밋 인증 기록 타입
export interface CommitAuth {
  id: string;
  participant_id: string;
  repository_id: string;
  commit_sha: string;
  commit_message: string;
  commit_author: string;
  commit_date: string;
  auth_date: string;
  is_valid: boolean;
  created_at: string;
}

// API 응답 타입
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// GitHub OAuth 관련 타입
export interface GitHubOAuthConfig {
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  scope: string;
}

export interface GitHubAccessToken {
  access_token: string;
  token_type: string;
  scope: string;
}

// 웹훅 관련 타입
export interface GitHubWebhookPayload {
  action: string;
  repository: GitHubRepository;
  commits?: GitHubCommit[];
  head_commit?: GitHubCommit;
  pusher: {
    name: string;
    email: string;
  };
}

export interface GitHubCommit {
  id: string;
  message: string;
  timestamp: string;
  author: {
    name: string;
    email: string;
    username?: string;
  };
  committer: {
    name: string;
    email: string;
    username?: string;
  };
  added: string[];
  removed: string[];
  modified: string[];
}

// 컴포넌트 Props 타입
export interface RepositorySelectorProps {
  onRepositoriesSelected: (repositories: GitHubRepository[]) => void;
  selectedRepositories?: GitHubRepository[];
  maxSelection?: number;
}

export interface StudyCardProps {
  study: Study & {
    owner: User;
    is_participant: boolean;
    is_owner: boolean;
  };
  onClick?: () => void;
}

// 폼 데이터 타입
export interface CreateStudyFormData {
  name: string;
  description: string;
  max_participants: number;
  is_public: boolean;
  auth_config: Partial<StudyAuthConfig>;
}

export interface JoinStudyFormData {
  study_id: string;
  repository_ids: number[];
}

// 에러 타입
export interface AppError {
  code: string;
  message: string;
  details?: unknown;
}

// 상태 관리 타입
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
}

export interface StudyState {
  studies: Study[];
  currentStudy: Study | null;
  participants: StudyParticipant[];
  loading: boolean;
  error: string | null;
}