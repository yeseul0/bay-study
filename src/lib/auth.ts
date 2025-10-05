/**
 * 인증 관련 유틸리티 함수들
 */

export interface AuthError {
  statusCode: number;
  message: string;
  error: string;
}

/**
 * API 응답이 401 에러인지 확인
 */
export function isAuthError(response: Response): boolean {
  return response.status === 401;
}

/**
 * 401 에러 응답에서 에러 타입 추출
 */
export async function parseAuthError(response: Response): Promise<string> {
  try {
    const errorData: AuthError = await response.json();

    // 에러 메시지에 따라 에러 타입 분류
    if (errorData.message.includes('Invalid access token')) {
      return 'invalid_token';
    }
    if (errorData.message.includes('No access token found')) {
      return 'no_token';
    }
    if (errorData.message.includes('expired')) {
      return 'token_expired';
    }

    return 'unauthorized';
  } catch {
    return 'unauthorized';
  }
}

/**
 * 로컬 스토리지에서 토큰 제거
 */
export function clearAuthToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('authToken');
  }
}

/**
 * 로그인 페이지로 리다이렉트 (에러 정보 포함)
 */
export function redirectToLogin(error?: string): void {
  if (typeof window !== 'undefined') {
    const params = error ? `?error=${error}` : '';
    window.location.href = `/${params}`;
  }
}

/**
 * API 요청에서 401 에러 처리
 */
export async function handleAuthError(response: Response): Promise<void> {
  if (isAuthError(response)) {
    const errorType = await parseAuthError(response);
    clearAuthToken();
    redirectToLogin(errorType);
  }
}

/**
 * 쿠키에서 토큰을 가져오는 함수
 */
function getCookieToken(): string | null {
  if (typeof window === 'undefined') return null;

  const name = 'access_token=';
  const decodedCookie = decodeURIComponent(document.cookie);
  const ca = decodedCookie.split(';');

  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) === 0) {
      return c.substring(name.length, c.length);
    }
  }
  return null;
}

/**
 * JWT 토큰에서 사용자 정보를 추출합니다 (클라이언트용)
 * 주의: UI 표시 목적으로만 사용하고, 서버 검증이 필요합니다
 */
export function getCurrentUserFromToken(): { email?: string } | null {
  try {
    const token = getCookieToken();
    if (!token) return null;

    // JWT 페이로드 디코딩 (서명 검증 없음 - UI 용도만)
    const base64Payload = token.split('.')[1];
    const payload = JSON.parse(atob(base64Payload));

    return {
      email: payload.email || payload.sub || payload.user_email
    };
  } catch (error) {
    console.error('JWT 토큰 파싱 실패:', error);
    return null;
  }
}

/**
 * fetch 래퍼 - 자동으로 401 에러 처리
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // localStorage와 쿠키 둘 다 확인
  const localToken = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  const cookieToken = getCookieToken();
  const token = localToken || cookieToken;


  const response = await fetch(url, {
    ...options,
    credentials: 'include', // 쿠키를 포함해서 요청
    headers: {
      ...options.headers,
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
  });

  // 401 에러 시 자동 처리
  if (isAuthError(response)) {
    await handleAuthError(response);
    throw new Error('Authentication failed');
  }

  return response;
}