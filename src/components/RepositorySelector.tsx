'use client';

import { useState, useEffect } from 'react';

interface Repository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description: string | null;
  updated_at: string;
}

interface RepositorySelectorProps {
  onRepositoriesSelected: (repositories: Repository[]) => void;
  selectedRepositories?: Repository[];
}

export default function RepositorySelector({
  onRepositoriesSelected,
  selectedRepositories = []
}: RepositorySelectorProps) {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState<Repository[]>(selectedRepositories);

  useEffect(() => {
    fetchUserRepositories();
  }, []);

  const fetchUserRepositories = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/github/repositories', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('레포지토리 목록을 가져올 수 없습니다');
      }

      const data = await response.json();
      setRepositories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleRepositoryToggle = (repository: Repository) => {
    const isSelected = selected.some(repo => repo.id === repository.id);

    let newSelected: Repository[];
    if (isSelected) {
      newSelected = selected.filter(repo => repo.id !== repository.id);
    } else {
      newSelected = [...selected, repository];
    }

    setSelected(newSelected);
    onRepositoriesSelected(newSelected);
  };

  const filteredRepositories = repositories.filter(repo =>
    repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    repo.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <span className="ml-2">레포지토리 목록 불러오는 중...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={fetchUserRepositories}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">레포지토리 선택</h3>
        <p className="text-sm text-gray-500">
          {selected.length}개 선택됨
        </p>
      </div>

      {/* 검색 */}
      <div className="relative">
        <input
          type="text"
          placeholder="레포지토리 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* 레포지토리 목록 */}
      <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
        {filteredRepositories.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchTerm ? '검색 결과가 없습니다' : '레포지토리가 없습니다'}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredRepositories.map((repo) => {
              const isSelected = selected.some(selectedRepo => selectedRepo.id === repo.id);

              return (
                <div
                  key={repo.id}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                  onClick={() => handleRepositoryToggle(repo)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {repo.name}
                        </h4>
                        {repo.private && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            Private
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{repo.full_name}</p>
                      {repo.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {repo.description}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        업데이트: {new Date(repo.updated_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="ml-4 flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleRepositoryToggle(repo)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 선택된 레포지토리 요약 */}
      {selected.length > 0 && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">선택된 레포지토리:</h4>
          <div className="space-y-1">
            {selected.map((repo) => (
              <div key={repo.id} className="text-sm text-gray-600">
                • {repo.full_name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}