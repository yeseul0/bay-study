'use client';

import { useState } from 'react';

interface User {
  id: string;
  username: string;
  avatar_url: string;
}

interface GitHubOAuthProps {
  onLoginSuccess?: (user: User) => void;
  onLoginError?: (error: string) => void;
  redirectTo?: string; // 로그인 후 이동할 페이지
}

export default function GitHubOAuth({
  onLoginSuccess: _onLoginSuccess, // eslint-disable-line @typescript-eslint/no-unused-vars
  onLoginError: _onLoginError, // eslint-disable-line @typescript-eslint/no-unused-vars
  redirectTo
}: GitHubOAuthProps) {
  const [loading, setLoading] = useState(false);

  const handleGitHubLogin = () => {
    setLoading(true);

    console.log('🚀 로그인 버튼 클릭됨!');

    // GitHub OAuth URL로 직접 이동
    const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
    const redirectUri = 'http://localhost:3000/auth/github/callback'; // NestJS 백엔드 콜백
    const scope = 'read:user,user:email,repo';

    // 로그인 후 돌아올 페이지 지정
    const returnUrl = redirectTo || `${window.location.origin}/dashboard`;
    const state = encodeURIComponent(returnUrl);

    const githubOAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`;

    console.log('🔗 GitHub OAuth URL:', githubOAuthUrl);
    console.log('📍 돌아올 페이지:', returnUrl);

    window.location.href = githubOAuthUrl;
  };

  return (
    <button
      onClick={handleGitHubLogin}
      disabled={loading}
      className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          처리 중...
        </>
      ) : (
        <>
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z"
              clipRule="evenodd"
            />
          </svg>
          GitHub으로 로그인
        </>
      )}
    </button>
  );
}