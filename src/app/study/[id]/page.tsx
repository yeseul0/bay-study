'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface StudyDetail {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  owner: {
    id: string;
    username: string;
    avatar_url: string;
  };
  participants: Array<{
    id: string;
    username: string;
    avatar_url: string;
    joinedAt: string;
    repositories: Array<{
      id: string;
      name: string;
      fullName: string;
      url: string;
    }>;
  }>;
  isOwner: boolean;
  isParticipant: boolean;
}

export default function StudyDetailPage() {
  const { id } = useParams();
  const [study, setStudy] = useState<StudyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);

  useEffect(() => {
    if (id) {
      fetchStudyDetail(id as string);
    }
  }, [id]);

  const fetchStudyDetail = async (studyId: string) => {
    try {
      const response = await fetch(`/api/studies/${studyId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStudy(data);
      }
    } catch (error) {
      console.error('스터디 상세 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinStudy = () => {
    if (!study?.isParticipant) {
      setShowJoinModal(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!study) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center text-gray-500">스터디를 찾을 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* 스터디 헤더 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">{study.name}</h1>
              <p className="text-gray-600">{study.description}</p>
            </div>

            {!study.isParticipant && !study.isOwner && (
              <button
                onClick={handleJoinStudy}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                스터디 참여하기
              </button>
            )}
          </div>

          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span>운영자: {study.owner.username}</span>
            <span>참여자: {study.participants.length}명</span>
            <span>생성일: {new Date(study.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* 참여자 목록 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">참여자</h2>

          <div className="space-y-4">
            {study.participants.map((participant) => (
              <div key={participant.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
                <div className="flex items-center space-x-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={participant.avatar_url}
                    alt={participant.username}
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    <p className="font-medium">{participant.username}</p>
                    <p className="text-sm text-gray-500">
                      참여일: {new Date(participant.joinedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm font-medium">등록된 레포지토리</p>
                  <p className="text-sm text-gray-500">{participant.repositories.length}개</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 참여 모달 */}
      {showJoinModal && (
        <JoinStudyModal
          studyId={study.id}
          onClose={() => setShowJoinModal(false)}
          onSuccess={() => {
            setShowJoinModal(false);
            fetchStudyDetail(study.id);
          }}
        />
      )}
    </div>
  );
}

// 스터디 참여 모달 컴포넌트 (별도 파일로 분리 예정)
function JoinStudyModal({
  studyId: _studyId, // eslint-disable-line @typescript-eslint/no-unused-vars
  onClose,
  onSuccess
}: {
  studyId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-xl font-semibold mb-4">스터디 참여하기</h3>
          <p className="text-gray-600 mb-6">
            스터디에 참여하려면 인증할 GitHub 레포지토리를 선택해주세요.
          </p>

          {/* 레포지토리 선택 컴포넌트가 여기에 들어갈 예정 */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <p className="text-gray-500">레포지토리 선택 컴포넌트</p>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              취소
            </button>
            <button
              onClick={onSuccess}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              참여하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}