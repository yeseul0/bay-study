'use client';

import GitHubOAuth from '@/components/GitHubOAuth';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function HomeContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100">
      {/* 헤더 섹션 */}
      <div className="relative overflow-hidden">
        {/* 배경 장식 */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-24 h-24 bg-gray-200 rounded-full opacity-30 animate-pulse"></div>
          <div className="absolute top-40 right-20 w-20 h-20 bg-slate-200 rounded-full opacity-40 animate-pulse delay-1000"></div>
          <div className="absolute bottom-20 left-1/4 w-16 h-16 bg-gray-300 rounded-full opacity-35 animate-pulse delay-2000"></div>
        </div>

        <div className="relative container mx-auto px-6 py-20 text-center">
          {/* 로고/아이콘 */}
          <div className="w-32 h-32 rounded-3xl mx-auto mb-10 flex items-center justify-center shadow-2xl" style={{ backgroundColor: '#12144c' }}>
            <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>

          <h1 className="text-6xl font-bold text-gray-800 mb-6">
            <span style={{ color: '#12144c' }}>
              Blockchain At Yonsei
            </span>
          </h1>
          <h2 className="text-3xl font-semibold text-gray-700 mb-8">BAY 스터디 인증 시스템</h2>
          <p className="text-xl text-gray-600 mb-16 max-w-3xl mx-auto leading-relaxed">
            연세대학교 블록체인 스터디 그룹에서 GitHub과 연동하여<br />
            체계적이고 신뢰할 수 있는 스터디 환경을 경험하세요
          </p>

          {/* 메인 카드 */}
          <div className="max-w-md mx-auto">
            {/* 에러 메시지 표시 */}
            {error && (
              <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl p-4 mb-6 shadow-sm">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-sm text-red-700 font-medium">
                    {error === 'token_expired' && '로그인이 만료되었습니다. 다시 로그인해주세요.'}
                    {error === 'invalid_token' && '유효하지 않은 토큰입니다. 다시 로그인해주세요.'}
                    {error === 'no_token' && '로그인이 필요합니다.'}
                    {error === 'unauthorized' && '인증이 필요합니다. 로그인해주세요.'}
                    {!['token_expired', 'invalid_token', 'no_token', 'unauthorized'].includes(error) &&
                      '로그인 중 오류가 발생했습니다. 다시 시도해주세요.'}
                  </p>
                </div>
              </div>
            )}

            {/* 로그인 카드 */}
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 p-10">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gray-100 rounded-2xl mx-auto mb-6 flex items-center justify-center">
                  <svg className="w-10 h-10" style={{ color: '#12144c' }} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-3">GitHub으로 시작하기</h3>
                <p className="text-gray-600 text-lg">
                  GitHub 계정으로 간편하게 로그인하고<br />
                  블록체인 스터디에 참여하세요
                </p>
              </div>

              <GitHubOAuth />

              {/* 추가 정보 */}
              <div className="mt-8 pt-8 border-t border-gray-100">
                <div className="grid grid-cols-1 gap-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <svg className="w-4 h-4 text-emerald-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    안전한 GitHub OAuth 인증
                  </div>
                  <div className="flex items-center">
                    <svg className="w-4 h-4 text-emerald-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    스마트 컨트랙트 기반 보증금 시스템
                  </div>
                  <div className="flex items-center">
                    <svg className="w-4 h-4 text-emerald-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    GitHub 활동 기반의 투명한 출석 관리
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
