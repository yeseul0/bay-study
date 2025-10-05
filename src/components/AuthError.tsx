'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface AuthErrorProps {
  error?: string;
  message?: string;
  autoRedirect?: boolean;
  redirectDelay?: number;
}

export default function AuthError({
  error,
  message,
  autoRedirect = true,
  redirectDelay = 3000
}: AuthErrorProps) {
  const router = useRouter();

  useEffect(() => {
    if (autoRedirect) {
      const timer = setTimeout(() => {
        router.push('/');
      }, redirectDelay);

      return () => clearTimeout(timer);
    }
  }, [autoRedirect, redirectDelay, router]);

  const handleLoginRedirect = () => {
    router.push('/');
  };

  const getErrorMessage = () => {
    if (message) return message;

    switch (error) {
      case 'token_expired':
        return '로그인이 만료되었습니다. 다시 로그인해주세요.';
      case 'invalid_token':
        return '유효하지 않은 토큰입니다. 다시 로그인해주세요.';
      case 'no_token':
        return '로그인이 필요합니다.';
      case 'unauthorized':
        return '인증이 필요합니다. 로그인해주세요.';
      default:
        return '인증 오류가 발생했습니다. 다시 로그인해주세요.';
    }
  };

  const getErrorTitle = () => {
    switch (error) {
      case 'token_expired':
        return '세션 만료';
      case 'invalid_token':
        return '인증 오류';
      case 'no_token':
        return '로그인 필요';
      case 'unauthorized':
        return '접근 권한 없음';
      default:
        return '인증 오류';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          {/* 에러 아이콘 */}
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-red-100 mb-4">
            <svg
              className="h-8 w-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>

          {/* 제목 */}
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {getErrorTitle()}
          </h2>

          {/* 메시지 */}
          <p className="text-gray-600 mb-6">
            {getErrorMessage()}
          </p>

          {/* 자동 리다이렉트 안내 */}
          {autoRedirect && (
            <p className="text-sm text-gray-500 mb-6">
              {redirectDelay / 1000}초 후 자동으로 로그인 페이지로 이동합니다.
            </p>
          )}

          {/* 버튼들 */}
          <div className="space-y-3">
            <button
              onClick={handleLoginRedirect}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              로그인 페이지로 이동
            </button>

            <button
              onClick={() => window.location.reload()}
              className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              페이지 새로고침
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}