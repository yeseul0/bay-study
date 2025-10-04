'use client';

export default function LoginPage() {
  const handleGitHubLogin = () => {
    // GitHub OAuth 리다이렉트 로직
    window.location.href = `/api/auth/github`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold">로그인</h2>
          <p className="mt-2 text-gray-600">GitHub 계정으로 시작하세요</p>
        </div>

        <button
          onClick={handleGitHubLogin}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          GitHub으로 로그인
        </button>
      </div>
    </div>
  );
}