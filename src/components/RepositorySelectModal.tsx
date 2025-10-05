'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchUserRepositories, registerRepositoryToStudy, GitHubRepo, fetchStudyRepositories, StudyRepositoriesResponse } from '@/lib/github';

interface RepositorySelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  proxyAddress: string;
  studyName: string;
  existingRepositories?: StudyRepositoriesResponse; // 🚀 기존 데이터 재사용
}

export default function RepositorySelectModal({
  isOpen,
  onClose,
  onSuccess,
  proxyAddress,
  studyName,
  existingRepositories
}: RepositorySelectModalProps) {
  const [repositories, setRepositories] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadRepositories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. 사용자 GitHub 레포지토리 가져오기
      const repos = await fetchUserRepositories();

      // 2. 🚀 최적화: 기존 데이터가 있으면 재사용, 없으면 API 호출
      let studyRepos: StudyRepositoriesResponse;
      if (existingRepositories) {
        studyRepos = existingRepositories;
      } else {
        studyRepos = await fetchStudyRepositories(proxyAddress);
      }

      // 3. 이미 등록된 레포지토리 URL들 추출
      const registeredUrls: string[] = [];
      if (studyRepos.success) {
        studyRepos.participants.forEach(participant => {
          participant.repositories.forEach(repo => {
            registeredUrls.push(repo.repoUrl);
          });
        });
      }

      // 4. 이미 등록된 레포지토리는 제외하고 필터링
      const availableRepos = repos.filter(repo =>
        !registeredUrls.includes(repo.htmlUrl)
      );

      setRepositories(availableRepos);

    } catch (error) {
      console.error('레포지토리 로딩 실패:', error);
      setError('GitHub 레포지토리를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [proxyAddress, existingRepositories]);

  // 모달이 열릴 때 레포지토리 목록 가져오기
  useEffect(() => {
    if (isOpen) {
      loadRepositories();
    }
  }, [isOpen, loadRepositories]);

  const handleRegister = async () => {
    if (!selectedRepo) return;

    setRegistering(true);
    setError(null);

    try {
      const result = await registerRepositoryToStudy(
        proxyAddress,
        selectedRepo.htmlUrl
      );

      if (result.success) {
        alert(result.message);
        onSuccess();
        onClose();
      } else {
        setError(result.message);
      }
    } catch (error) {
      console.error('레포지토리 등록 실패:', error);
      setError('레포지토리 등록 중 오류가 발생했습니다.');
    } finally {
      setRegistering(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-800">레포지토리 등록</h2>
            <p className="text-sm text-gray-500 mt-1">&quot;{studyName}&quot; 스터디에 연결할 GitHub 레포지토리를 선택하세요</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* 컨텐츠 */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#12144c] mx-auto mb-4"></div>
                <p className="text-gray-500">GitHub 레포지토리를 불러오는 중...</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-3">
                {repositories.map((repo) => (
                  <div
                    key={repo.id}
                    onClick={() => setSelectedRepo(repo)}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      selectedRepo?.id === repo.id
                        ? 'border-[#12144c] bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-semibold text-gray-900">{repo.name}</h3>
                          {repo.private && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                              Private
                            </span>
                          )}
                          {repo.language && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                              {repo.language}
                            </span>
                          )}
                        </div>
                        {repo.description && (
                          <p className="text-sm text-gray-600 mb-2">{repo.description}</p>
                        )}
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          {repo.stargazers_count !== undefined && <span>⭐ {repo.stargazers_count}</span>}
                          <span>업데이트: {new Date(repo.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      {selectedRepo?.id === repo.id && (
                        <div className="ml-4">
                          <div className="w-5 h-5 rounded-full bg-[#12144c] flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {repositories.length === 0 && !loading && (
                  <div className="text-center py-12">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <div className="space-y-2">
                      <p className="text-gray-600 font-medium">등록 가능한 레포지토리가 없습니다</p>
                      <p className="text-sm text-gray-500">모든 레포지토리가 이미 등록되었거나 GitHub 레포지토리가 없습니다.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 버튼들 */}
        <div className="flex space-x-3 p-6 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleRegister}
            disabled={!selectedRepo || registering}
            className="flex-1 px-4 py-3 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: !selectedRepo || registering ? '#6b7280' : '#12144c'
            }}
          >
            {registering ? '등록 중...' : '레포지토리 등록'}
          </button>
        </div>
      </div>
    </div>
  );
}