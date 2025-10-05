'use client';

import { useState, useEffect } from 'react';
import AuthError from '@/components/AuthError';
import CreateStudyModal from '@/components/CreateStudyModal';
import RepositorySelectModal from '@/components/RepositorySelectModal';
import { authenticatedFetch, isAuthError, parseAuthError } from '@/lib/auth';
import { joinStudy, leaveStudy } from '@/lib/web3';
import { fetchStudyRepositories, extractRepoName, StudyRepositoriesResponse } from '@/lib/github';

interface Study {
  id: string;
  name?: string;
  studyName?: string; // 백엔드에서 studyName으로 올 수도 있음
  description?: string;
  createdAt?: string;
  participantCount?: number;
  isOwner?: boolean;
  isParticipant?: boolean;
  isParticipating?: boolean;
  studyStartTime?: number; // Unix timestamp
  studyEndTime?: number; // Unix timestamp
  proxyAddress?: string;
  depositAmount?: string;
  penaltyAmount?: string;
  // 새로운 필드들
  participants?: Array<{
    id: string;
    email?: string;
    githubUsername?: string;
    walletAddress?: string;
    joinedAt?: string;
  }>;
  repositoryUrl?: string;
  status?: 'upcoming' | 'active' | 'completed';
  totalDays?: number;
  completedDays?: number;
  attendanceRate?: number;
  // 백엔드에서 올 수 있는 추가 필드들
  [key: string]: unknown;
}

export default function DashboardPage() {
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [joiningStudy, setJoiningStudy] = useState<string | null>(null);
  const [isRepositoryModalOpen, setIsRepositoryModalOpen] = useState(false);
  const [selectedStudy, setSelectedStudy] = useState<Study | null>(null);
  const [allRepositories, setAllRepositories] = useState<{[proxyAddress: string]: StudyRepositoriesResponse}>({});

  useEffect(() => {
    fetchStudies();
  }, []);

  const fetchStudies = async () => {
    try {
      // authenticatedFetch를 사용하여 자동 인증 처리
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
      const response = await authenticatedFetch(`${backendUrl}/study/list`);

      if (response.ok) {
        const data = await response.json();
        console.log('📋 받은 스터디 데이터:', data);

        // 백엔드 응답 구조에 따라 데이터 추출
        const studiesArray = data.success && data.studies ? data.studies : (Array.isArray(data) ? data : []);

        // 스터디 데이터 로드 완료

        setStudies(studiesArray);

        // 🚀 최적화: 모든 스터디의 레포지토리를 한번에 가져오기
        await fetchAllRepositories(studiesArray);

      } else if (isAuthError(response)) {
        // 401 에러 처리
        const errorType = await parseAuthError(response);
        setAuthError(errorType);
      } else {
        console.error('스터디 목록 조회 실패:', response.status);
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'Authentication failed') {
        // authenticatedFetch에서 이미 리다이렉트 처리됨
        return;
      }
      console.error('스터디 목록 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 🚀 새로운 함수: 모든 스터디의 레포지토리를 한번에 가져오기
  const fetchAllRepositories = async (studiesArray: Study[]) => {
    const repositoriesData: {[proxyAddress: string]: StudyRepositoriesResponse} = {};

    // 모든 스터디 레포지토리 로드 시작

    // 병렬로 모든 스터디의 레포지토리 가져오기
    const promises = studiesArray
      .filter(study => study.proxyAddress) // proxyAddress가 있는 것만
      .map(async (study) => {
        try {
          const repos = await fetchStudyRepositories(study.proxyAddress!);
          repositoriesData[study.proxyAddress!] = repos;
        } catch (error) {
          // 실패해도 빈 데이터로 설정
          repositoriesData[study.proxyAddress!] = { success: false, participants: [], message: '' };
        }
      });

    await Promise.all(promises);
    setAllRepositories(repositoriesData);
  };

  const handleCreateSuccess = () => {
    // 스터디 생성 성공 시 목록 새로고침
    fetchStudies();
  };

  // 스터디 참여 처리
  const handleJoinStudy = async (study: Study) => {
    if (!study.proxyAddress || !study.depositAmount) {
      alert('스터디 정보가 부족합니다.');
      return;
    }

    setJoiningStudy(study.id);

    try {
      const result = await joinStudy(
        study.proxyAddress,
        study.depositAmount
      );

      if (result.success) {
        alert(result.message);
        // 스터디 목록 새로고침
        fetchStudies();
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('스터디 참여 오류:', error);
      alert('스터디 참여 중 오류가 발생했습니다.');
    } finally {
      setJoiningStudy(null);
    }
  };

  // 레포지토리 등록 모달 열기
  const handleRegisterRepository = (study: Study) => {
    setSelectedStudy(study);
    setIsRepositoryModalOpen(true);
  };

  // 레포지토리 등록 성공 후 처리
  const handleRepositoryRegistered = () => {
    fetchStudies(); // 스터디 목록 새로고침
  };

  // 스터디 탈퇴 처리
  const handleLeaveStudy = async (study: Study) => {
    if (!study.proxyAddress) {
      alert('스터디 정보가 부족합니다.');
      return;
    }

    // 확인 대화상자
    const confirmed = confirm(
      `"${study.studyName}" 스터디에서 탈퇴하시겠습니까?\n\n예치금이 환불되며, 다시 참여하려면 새로 참여 신청을 해야 합니다.`
    );

    if (!confirmed) return;

    setJoiningStudy(study.id); // 로딩 상태 재사용

    try {
      const result = await leaveStudy(study.proxyAddress);

      if (result.success) {
        alert(result.message);
        fetchStudies(); // 스터디 목록 새로고침
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('스터디 탈퇴 실패:', error);
      alert('스터디 탈퇴 중 오류가 발생했습니다.');
    } finally {
      setJoiningStudy(null);
    }
  };

  // USDC 단위 변환 함수 (wei -> USDC)
  const formatUSDC = (weiAmount: string): string => {
    try {
      const amount = Number(weiAmount) / 1000000; // USDC는 6자리 소수점
      return Math.floor(amount).toString();
    } catch {
      return '0';
    }
  };

  // 연결된 레포지토리 섹션 컴포넌트 (최적화됨 - API 호출 제거)
  const StudyRepositoriesSection = ({
    repositories
  }: {
    repositories?: StudyRepositoriesResponse;
  }) => {
    // 🚀 개별 API 호출 제거! props로 받은 데이터 사용
    const [isExpanded, setIsExpanded] = useState(false); // Hook을 최상단으로 이동

    if (!repositories) {
      return (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="animate-pulse flex items-center space-x-2">
            <div className="w-4 h-4 bg-gray-300 rounded"></div>
            <div className="w-24 h-4 bg-gray-300 rounded"></div>
          </div>
        </div>
      );
    }


    if (!repositories || repositories.participants.length === 0) {
      return null; // 레포지토리가 없으면 아무것도 표시하지 않음
    }

    const totalRepos = repositories.participants.reduce((total, p) => total + p.repositories.length, 0);

    return (
      <div className="mb-4 relative">
        {/* 토글 헤더 */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.30.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            <span className="text-sm font-medium text-gray-700">연결된 레포지토리</span>
            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
              {totalRepos}개
            </span>
          </div>

          {/* 토글 아이콘 */}
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* 접히는 콘텐츠 - 절대위치로 겹쳐서 표시 */}
        {isExpanded && (
          <div className="absolute top-full left-0 right-0 mt-2 space-y-2 bg-white border border-gray-200 rounded-lg p-3 shadow-lg z-50 max-h-64 overflow-y-auto">
            {repositories.participants.map((participant) => (
              <div key={participant.participantWallet} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 flex items-center justify-center">
                    <span className="text-xs text-white font-bold">
                      {participant.participantEmail.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {participant.participantEmail.split('@')[0]}
                  </span>
                </div>

                <div className="space-y-1 ml-7">
                  {participant.repositories.map((repo) => (
                    <a
                      key={repo.id}
                      href={repo.repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                    >
                      📂 {extractRepoName(repo.repoUrl)}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // 현재 시간이 스터디 시간대인지 확인하는 함수
  const isStudyTime = (startTime?: number, endTime?: number) => {
    if (!startTime || !endTime) {
      console.log('❌ 시간 정보 없음:', { startTime, endTime });
      return false;
    }

    // 초 단위를 시간 단위로 변환
    const start = Math.floor(Number(startTime) / 3600);
    const end = Math.floor(Number(endTime) / 3600);
    const now = new Date();
    const currentHour = now.getHours();

    // console.log(`🕒 시간 체크: 현재 ${currentHour}시, 스터디 ${start}시-${end}시`, { start, end, currentHour });

    // 시간대가 다음날로 넘어가는 경우 처리
    if (end > 24) {
      // 25시 = 다음날 1시로 변환 (22시~25시 = 22시~다음날1시)
      const endNextDay = end - 24;
      const isInRange = currentHour >= start || currentHour < endNextDay;
      // console.log(`🌙 다음날 넘어가는 스터디: ${start}시-${endNextDay}시(다음날), 현재 ${currentHour}시 → ${isInRange ? 'LIVE 🔥' : '대기중'}`);
      return isInRange;
    } else if (end === 24) {
      // 24시 = 자정 0시 (21시~24시 = 21시~자정까지만)
      // 자정(0시) 이후는 스터디 종료
      const isInRange = currentHour >= start && currentHour < 24;
      // console.log(`🌃 자정까지 스터디: ${start}시-24시(자정), 현재 ${currentHour}시 → ${isInRange ? 'LIVE 🔥' : '대기중'}`);
      return isInRange;
    }

    // 일반적인 경우 (같은 날 내)
    const isInRange = currentHour >= start && currentHour < end;
    // console.log(`📅 일반 스터디: ${start}시-${end}시, 현재 ${currentHour}시 → ${isInRange ? 'LIVE 🔥' : '대기중'}`);
    return isInRange;
  };

  // 시간을 시:분 형태로 변환하는 함수
  const formatTime = (timeInSeconds?: number) => {
    if (!timeInSeconds) return '';
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };


  // 인증 에러가 있으면 AuthError 컴포넌트 표시
  if (authError) {
    return <AuthError error={authError} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100">
      {/* 헤더 */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="container mx-auto px-6 py-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">Study Dashboard</h1>
              <p className="text-gray-600 text-lg">참여중인 블록체인 스터디를 관리하세요</p>
            </div>
            <div className="flex items-center space-x-4">
              {/* BAY 디스코드 바로가기 */}
              <a
                href={process.env.NEXT_PUBLIC_BAY_DISCORD_URL || "https://discord.gg/bay-community"}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#5865F2] hover:bg-[#4752C4] text-white px-6 py-4 rounded-2xl font-semibold shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center space-x-3"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0190 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9460 2.4189-2.1568 2.4189Z"/>
                </svg>
                <span>BAY 디스코드</span>
              </a>

              {/* 새 스터디 만들기 */}
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-[#12144c] hover:bg-[#0f1240] text-white px-6 py-4 rounded-2xl font-semibold shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center space-x-3"
                style={{ backgroundColor: '#12144c' }}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>새 스터디 만들기</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="container mx-auto px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {studies && studies.length > 0 && studies.map((study) => {
            const isActive = isStudyTime(study.studyStartTime, study.studyEndTime);
            const isParticipating = study.isParticipating || study.isOwner || study.isParticipant;

            // 스터디 활성화 상태 확인 완료

            return (
              <div
                key={study.id}
                className={`group relative rounded-3xl shadow-lg border transition-all duration-500 overflow-hidden hover:-translate-y-2 ${
                  isActive && isParticipating
                    ? 'bg-white border-orange-400 hover:shadow-2xl hover:border-red-500 shadow-orange-300/50'
                    : isParticipating
                    ? 'bg-white border-gray-200 hover:shadow-2xl hover:border-gray-300'
                    : 'bg-gray-50 border-gray-300 hover:shadow-lg hover:border-gray-400 opacity-75'
                }`}
              >
                {/* 불타는 효과 - 스터디 시간대일 때만 표시 */}
                {isActive && (
                  <>
                    {/* 모서리 불타는 효과들 */}
                    <div className="absolute -top-3 -right-3 w-10 h-10 bg-gradient-to-r from-orange-400 to-red-500 rounded-full opacity-80 animate-ping"></div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-red-400 to-orange-500 rounded-full opacity-90 animate-pulse"></div>
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-yellow-400 to-red-400 rounded-full animate-bounce"></div>

                    <div className="absolute -bottom-3 -left-3 w-8 h-8 bg-gradient-to-r from-orange-400 to-red-500 rounded-full opacity-70 animate-ping delay-300"></div>
                    <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-gradient-to-r from-red-400 to-orange-500 rounded-full opacity-80 animate-pulse delay-150"></div>

                    {/* 추가 불꽃 효과 */}
                    <div className="absolute -top-2 left-4 w-5 h-5 bg-gradient-to-r from-red-500 to-yellow-400 rounded-full opacity-60 animate-bounce delay-500"></div>
                    <div className="absolute -bottom-1 right-8 w-4 h-4 bg-gradient-to-r from-orange-500 to-red-400 rounded-full opacity-70 animate-pulse delay-700"></div>

                    <div className="absolute top-1/2 -right-1 w-3 h-3 bg-gradient-to-r from-yellow-400 to-red-400 rounded-full animate-bounce delay-700"></div>
                    <div className="absolute bottom-1/4 -left-1 w-3 h-3 bg-gradient-to-r from-orange-400 to-red-500 rounded-full animate-pulse delay-500"></div>
                  </>
                )}

                <div className="p-8">
                {/* 스터디 상태 뱃지 */}
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center space-x-3">
                    {/* 참여 상태 뱃지 */}
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                      study.isOwner
                        ? 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 border border-amber-200'
                        : isParticipating
                        ? 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border border-blue-200'
                        : 'bg-gray-100 text-gray-500 border border-gray-300'
                    }`}>
                      {study.isOwner ? '운영자' : isParticipating ? '참여중' : '미참여'}
                    </div>

                    {/* 사람 아이콘 */}
                    <div className="text-[#12144c]">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>

                    {/* LIVE 상태 표시 - 사람 아이콘 오른쪽 */}
                    {isActive && (
                      <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-red-500 to-orange-500 text-white">
                        🔥 LIVE
                      </div>
                    )}
                  </div>

                  {/* 프록시 컨트랙트 주소 */}
                  {study.proxyAddress && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => window.open(`https://sepolia.etherscan.io/address/${study.proxyAddress}`, '_blank')}
                        className="bg-gray-100 border border-gray-200 rounded-lg px-2 py-1 hover:bg-gray-200 hover:border-gray-300 transition-colors cursor-pointer"
                        title="Etherscan에서 보기"
                      >
                        <div className="flex items-center space-x-1">
                          <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          <span className="text-xs text-gray-600 font-mono">
                            {study.proxyAddress.slice(0, 6)}...{study.proxyAddress.slice(-4)}
                          </span>
                        </div>
                      </button>

                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mb-6">
                  <h3 className={`text-2xl font-bold leading-tight ${
                    isParticipating ? 'text-[#0d0f3a]' : 'text-gray-700'
                  }`}>
                    {study.name || study.studyName || '스터디 이름'}
                  </h3>

                  {/* 예치금, 벌금 간단 표시 */}
                  {(study.depositAmount || study.penaltyAmount) && (
                    <div className="text-right text-sm text-gray-600">
                      {study.depositAmount && (
                        <div>예치금: {formatUSDC(study.depositAmount)} USDC</div>
                      )}
                      {study.penaltyAmount && (
                        <div>벌금: {formatUSDC(study.penaltyAmount)} USDC</div>
                      )}
                    </div>
                  )}
                </div>

                {/* 스터디 시간 */}
                {(study.studyStartTime || study.studyEndTime) && (
                  <div className={`mb-6 p-3 rounded-lg border ${
                    isActive
                      ? 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-center space-x-2">
                      <svg className={`w-4 h-4 ${isActive ? 'text-red-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className={`text-sm font-medium ${isActive ? 'text-red-700' : 'text-gray-600'}`}>
                        {formatTime(study.studyStartTime)} - {formatTime(study.studyEndTime)}
                      </span>
                    </div>
                  </div>
                )}

                {/* 현재 내 예치금 (참여중인 경우에만) */}
                {isParticipating && study.depositAmount && (
                  <div className="mb-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
                          <div>
                            <p className="text-xs text-green-600 font-medium">현재 내 예치금</p>
                            <p className="text-sm font-bold text-green-700">{formatUSDC(study.depositAmount)} USDC</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleLeaveStudy(study)}
                          disabled={joiningStudy === study.id}
                          className="px-2.5 py-1 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 border border-green-300 hover:border-green-400 rounded-md transition-colors disabled:opacity-50"
                        >
                          인출하기
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 추가 정보 섹션 */}
                {(study.repositoryUrl || study.attendanceRate !== undefined || study.totalDays) && (
                  <div className="mb-4 space-y-2">
                    {/* GitHub 레포지토리 */}
                    {study.repositoryUrl && (
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                        <a
                          href={study.repositoryUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          GitHub 레포지토리
                        </a>
                      </div>
                    )}

                    {/* 진행률 정보 */}
                    {(study.totalDays && study.completedDays !== undefined) && (
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <span className="text-sm text-gray-600">
                          진행률: {study.completedDays}/{study.totalDays}일
                          {study.attendanceRate !== undefined && (
                            <span className="text-blue-600 font-medium ml-1">
                              ({Math.round(study.attendanceRate * 100)}%)
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* 연결된 레포지토리 */}
                <StudyRepositoriesSection
                  repositories={study.proxyAddress ? allRepositories[study.proxyAddress] : undefined}
                />

                {/* 참여자 정보 */}
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${isParticipating ? 'bg-emerald-400' : 'bg-gray-400'}`}></div>
                    <span className={`text-sm font-medium ${isParticipating ? 'text-gray-600' : 'text-gray-500'}`}>
                      참여자 {study.participantCount || study.participants?.length || 0}명
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 font-medium">
                    {study.createdAt ? new Date(study.createdAt).toLocaleDateString() : '날짜 없음'}
                  </div>
                </div>

                {/* 레포지토리 등록 경고 - 참여중이면서 레포지토리를 등록하지 않은 경우 */}
                {isParticipating && study.hasRegisteredRepository === false && (
                  <div className="mb-4">
                    <p className="text-xs text-red-600 font-medium leading-relaxed">
                      ⚠️ 레포지토리를 등록해주세요!<br />
                      등록하지 않으면 출석 인증이 불가하여 벌금이 부과됩니다.
                    </p>
                  </div>
                )}

                {/* 액션 버튼 */}
                <button
                  onClick={() => isParticipating ? handleRegisterRepository(study) : handleJoinStudy(study)}
                  disabled={joiningStudy === study.id}
                  className={`w-full py-4 rounded-2xl font-semibold transition-all duration-300 border ${
                    isParticipating
                      ? 'bg-gray-800 hover:bg-gray-900 text-white border-gray-800 hover:border-gray-900 shadow-lg hover:shadow-xl hover:scale-105'
                      : joiningStudy === study.id
                      ? 'bg-gray-400 text-white border-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white border-emerald-500 hover:border-emerald-600 shadow-lg hover:shadow-xl hover:scale-105'
                  }`}
                >
                  {isParticipating
                    ? '📂 레포지토리 등록하기'
                    : joiningStudy === study.id
                    ? '참여 중...'
                    : '참여하기'
                  }
                </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* 빈 상태 */}
        {studies.length === 0 && (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gray-100 rounded-3xl mx-auto mb-8 flex items-center justify-center shadow-lg">
              <svg className="w-12 h-12 text-[#12144c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-3">아직 참여 중인 스터디가 없습니다</h3>
            <p className="text-gray-600 mb-10 text-lg max-w-md mx-auto leading-relaxed">새로운 블록체인 스터디를 시작하거나 기존 스터디에 참여해보세요</p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-[#12144c] hover:bg-[#0f1240] text-white px-10 py-4 rounded-2xl font-semibold shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
              style={{ backgroundColor: '#12144c' }}
            >
              첫 스터디 만들기
            </button>
          </div>
        )}
      </div>

      {/* 스터디 생성 모달 */}
      <CreateStudyModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* 레포지토리 등록 모달 */}
      <RepositorySelectModal
        isOpen={isRepositoryModalOpen}
        onClose={() => {
          setIsRepositoryModalOpen(false);
          setSelectedStudy(null);
        }}
        onSuccess={handleRepositoryRegistered}
        proxyAddress={selectedStudy?.proxyAddress || ''}
        studyName={selectedStudy?.name || selectedStudy?.studyName || ''}
        existingRepositories={selectedStudy?.proxyAddress ? allRepositories[selectedStudy.proxyAddress] : undefined}
      />
    </div>
  );
}