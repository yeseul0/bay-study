'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function CallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      // 에러 처리
      console.error('GitHub OAuth 에러:', error);
      router.push('/auth/login?error=oauth_failed');
      return;
    }

    if (code) {
      // 백엔드로 code 전송하여 토큰 교환
      handleOAuthCallback(code);
    }
  }, [searchParams, router]);

  const handleOAuthCallback = async (code: string) => {
    try {
      const response = await fetch('/api/auth/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      if (response.ok) {
        const { user, token } = await response.json();
        // 로컬 스토리지나 쿠키에 토큰 저장
        localStorage.setItem('authToken', token);
        router.push('/dashboard');
      } else {
        throw new Error('토큰 교환 실패');
      }
    } catch (error) {
      console.error('콜백 처리 에러:', error);
      router.push('/auth/login?error=callback_failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p>로그인 처리 중...</p>
      </div>
    </div>
  );
}