/**
 * GitHub API 관련 유틸리티 함수들
 */

export interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  htmlUrl: string;
  description: string | null;
  private: boolean;
  updatedAt: string;
  language?: string | null;
  stargazers_count?: number;
  fork?: boolean;
}

export interface StudyRepository {
  id: number;
  repoUrl: string;
  registeredAt: string;
  isActive: boolean;
}

export interface StudyParticipantRepos {
  participantEmail: string;
  participantWallet: string;
  repositories: StudyRepository[];
}

export interface StudyRepositoriesResponse {
  success: boolean;
  participants: StudyParticipantRepos[];
  message: string;
}

/**
 * 사용자의 GitHub 레포지토리 목록을 가져옵니다.
 * GitHub OAuth 토큰이 필요합니다.
 */
export async function fetchUserRepositories(): Promise<GitHubRepo[]> {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

    // 백엔드를 통해 GitHub API 호출 (JWT 쿠키 자동 사용)
    const response = await fetch(`${backendUrl}/github/repositories`, {
      method: 'GET',
      credentials: 'include', // JWT 쿠키 포함
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `GitHub 레포지토리 조회 실패: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'GitHub 레포지토리 조회에 실패했습니다.');
    }

    console.log('📂 GitHub 레포지토리 목록:', data);

    // 백엔드 응답에서 repositories 배열 추출
    const repositories = data.repositories || [];

    // fork가 아닌 레포지토리만 필터링 (옵션)
    return repositories.filter((repo: GitHubRepo) => !repo.fork);

  } catch (error) {
    console.error('GitHub 레포지토리 조회 실패:', error);
    throw error;
  }
}

/**
 * 선택한 레포지토리를 스터디에 등록합니다.
 */
export async function registerRepositoryToStudy(
  proxyAddress: string,
  repoUrl: string
): Promise<{ success: boolean; message: string }> {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

    const response = await fetch(`${backendUrl}/study/repository/register`, {
      method: 'POST',
      credentials: 'include', // JWT 쿠키 포함
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        proxyAddress,
        repoUrl
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '레포지토리 등록에 실패했습니다.');
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || '레포지토리 등록에 실패했습니다.');
    }

    return {
      success: true,
      message: result.message || '레포지토리가 성공적으로 등록되었습니다.',
    };

  } catch (error) {
    console.error('레포지토리 등록 실패:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
    };
  }
}

/**
 * 스터디에 연결된 모든 참여자의 레포지토리 목록을 가져옵니다.
 */
export async function fetchStudyRepositories(proxyAddress: string): Promise<StudyRepositoriesResponse> {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

    const response = await fetch(`${backendUrl}/study/${proxyAddress}/repositories`, {
      method: 'GET',
      credentials: 'include', // JWT 쿠키 포함
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`스터디 레포지토리 조회 실패: ${response.status}`);
    }

    const data: StudyRepositoriesResponse = await response.json();

    if (!data.success) {
      throw new Error(data.message || '스터디 레포지토리 조회에 실패했습니다.');
    }

    console.log('📂 스터디 레포지토리 목록:', data);
    return data;

  } catch (error) {
    console.error('스터디 레포지토리 조회 실패:', error);
    throw error;
  }
}

/**
 * GitHub URL에서 레포지토리 이름을 추출합니다.
 */
export function extractRepoName(repoUrl: string): string {
  try {
    const url = new URL(repoUrl);
    const pathParts = url.pathname.split('/').filter(part => part.length > 0);
    if (pathParts.length >= 2) {
      return `${pathParts[0]}/${pathParts[1]}`;
    }
    return repoUrl;
  } catch {
    return repoUrl;
  }
}