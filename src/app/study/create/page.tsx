'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateStudyPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    maxParticipants: 10,
    isPublic: true,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/studies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const study = await response.json();
        router.push(`/study/${study.id}`);
      } else {
        throw new Error('스터디 생성에 실패했습니다');
      }
    } catch (error) {
      console.error('스터디 생성 에러:', error);
      alert('스터디 생성에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">새 스터디 만들기</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              스터디 이름 *
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="예: React 공부 모임"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              스터디 설명
            </label>
            <textarea
              id="description"
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="스터디에 대해 간단히 설명해주세요"
            />
          </div>

          <div>
            <label htmlFor="maxParticipants" className="block text-sm font-medium text-gray-700 mb-2">
              최대 참여자 수
            </label>
            <input
              type="number"
              id="maxParticipants"
              min="2"
              max="50"
              value={formData.maxParticipants}
              onChange={(e) => setFormData({ ...formData, maxParticipants: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isPublic}
                onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">
                공개 스터디 (다른 사용자가 검색하고 참여할 수 있습니다)
              </span>
            </label>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-blue-900 mb-2">스터디 인증 방식</h3>
            <p className="text-sm text-blue-700">
              참여자들은 GitHub 레포지토리를 등록하고, 해당 레포지토리의 커밋을 통해 스터디 참여를 인증합니다.
              웹훅을 통해 실시간으로 커밋이 감지되며, 인증 시간은 스터디 생성 후 설정할 수 있습니다.
            </p>
          </div>

          <div className="flex space-x-4 pt-6">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading || !formData.name.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '생성 중...' : '스터디 만들기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}