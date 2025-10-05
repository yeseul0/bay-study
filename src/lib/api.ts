// API 호출을 위한 유틸리티 함수들

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';

// API 클라이언트 클래스
class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private getAuthHeaders(): Record<string, string> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // GET 요청
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  // POST 요청
  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PUT 요청
  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PATCH 요청
  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // DELETE 요청
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// 전역 API 클라이언트 인스턴스
export const apiClient = new ApiClient();

// 인증 관련 API 함수들
export const authAPI = {
  // GitHub OAuth 콜백 처리
  handleOAuthCallback: (code: string) =>
    apiClient.post('/auth/github/callback', { code }),

  // 현재 사용자 정보 조회
  getCurrentUser: () =>
    apiClient.get('/auth/me'),

  // 로그아웃
  logout: () =>
    apiClient.post('/auth/logout'),
};

// 스터디 관련 API 함수들
export const studyAPI = {
  // 내가 참여한 스터디 목록
  getMyStudies: () =>
    apiClient.get('/studies/my'),

  // 공개 스터디 목록
  getPublicStudies: (page = 1, limit = 10) =>
    apiClient.get(`/studies/public?page=${page}&limit=${limit}`),

  // 스터디 상세 정보
  getStudyDetail: (studyId: string) =>
    apiClient.get(`/studies/${studyId}`),

  // 스터디 생성
  createStudy: (data: unknown) =>
    apiClient.post('/studies', data),

  // 스터디 수정
  updateStudy: (studyId: string, data: unknown) =>
    apiClient.patch(`/studies/${studyId}`, data),

  // 스터디 삭제
  deleteStudy: (studyId: string) =>
    apiClient.delete(`/studies/${studyId}`),

  // 스터디 참여
  joinStudy: (studyId: string, data: { repository_ids: number[] }) =>
    apiClient.post(`/studies/${studyId}/join`, data),

  // 스터디 탈퇴
  leaveStudy: (studyId: string) =>
    apiClient.delete(`/studies/${studyId}/leave`),

  // 스터디 참여자 목록
  getStudyParticipants: (studyId: string) =>
    apiClient.get(`/studies/${studyId}/participants`),

  // 참여자 제거 (운영자만)
  removeParticipant: (studyId: string, participantId: string) =>
    apiClient.delete(`/studies/${studyId}/participants/${participantId}`),

  // 스터디 관리 정보 (운영자만)
  getStudyManageInfo: (studyId: string) =>
    apiClient.get(`/studies/${studyId}/manage`),
};

// GitHub 관련 API 함수들
export const githubAPI = {
  // 사용자 레포지토리 목록
  getUserRepositories: () =>
    apiClient.get('/github/repositories'),

  // 특정 레포지토리 정보
  getRepository: (owner: string, repo: string) =>
    apiClient.get(`/github/repositories/${owner}/${repo}`),

  // 레포지토리에 웹훅 설정
  setupWebhook: (repositoryId: number, studyId: string) =>
    apiClient.post(`/github/repositories/${repositoryId}/webhook`, { studyId }),

  // 웹훅 제거
  removeWebhook: (repositoryId: number, webhookId: string) =>
    apiClient.delete(`/github/repositories/${repositoryId}/webhook/${webhookId}`),
};

// 커밋 인증 관련 API 함수들
export const commitAPI = {
  // 사용자의 커밋 인증 기록
  getCommitHistory: (participantId: string, page = 1, limit = 20) =>
    apiClient.get(`/commits/${participantId}?page=${page}&limit=${limit}`),

  // 스터디의 커밋 인증 통계
  getStudyCommitStats: (studyId: string) =>
    apiClient.get(`/studies/${studyId}/commits/stats`),

  // 특정 기간의 커밋 인증 기록
  getCommitsByDateRange: (studyId: string, startDate: string, endDate: string) =>
    apiClient.get(`/studies/${studyId}/commits?start=${startDate}&end=${endDate}`),
};

// 에러 핸들링 유틸리티
export class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// API 응답 타입 가드
export function isAPIError(error: unknown): error is APIError {
  return error instanceof APIError;
}

// 재시도 가능한 API 호출
export async function retryAPI<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
  throw new Error('Max retries exceeded');
}