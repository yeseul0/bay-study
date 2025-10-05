'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface StudySettings {
  id: string;
  name: string;
  description: string;
  maxParticipants: number;
  isPublic: boolean;
  authConfig: {
    dailyCommitRequired: boolean;
    authTimeStart: string; // "09:00"
    authTimeEnd: string;   // "23:59"
    requiredDays: string[]; // ["monday", "tuesday", ...]
  };
}

interface Participant {
  id: string;
  username: string;
  avatar_url: string;
  joinedAt: string;
  repositories: Array<{
    id: string;
    name: string;
    fullName: string;
    webhookStatus: 'active' | 'inactive' | 'error';
  }>;
  commitStats: {
    totalCommits: number;
    thisWeekCommits: number;
    authSuccessRate: number;
  };
}

export default function StudyManagePage() {
  const { id } = useParams();
  const [study, setStudy] = useState<StudySettings | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'settings' | 'participants' | 'analytics'>('settings');

  useEffect(() => {
    if (id) {
      fetchStudyData(id as string);
    }
  }, [id]);

  const fetchStudyData = async (studyId: string) => {
    try {
      const [studyResponse, participantsResponse] = await Promise.all([
        fetch(`/api/studies/${studyId}/manage`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` },
        }),
        fetch(`/api/studies/${studyId}/participants`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` },
        }),
      ]);

      if (studyResponse.ok && participantsResponse.ok) {
        const studyData = await studyResponse.json();
        const participantsData = await participantsResponse.json();

        setStudy(studyData);
        setParticipants(participantsData);
      }
    } catch (error) {
      console.error('스터디 데이터 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (updatedSettings: Partial<StudySettings>) => {
    try {
      const response = await fetch(`/api/studies/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify(updatedSettings),
      });

      if (response.ok) {
        const updatedStudy = await response.json();
        setStudy(updatedStudy);
        alert('설정이 저장되었습니다');
      }
    } catch (error) {
      console.error('설정 저장 실패:', error);
      alert('설정 저장에 실패했습니다');
    }
  };

  const handleRemoveParticipant = async (participantId: string) => {
    if (!confirm('정말로 이 참여자를 제거하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/studies/${id}/participants/${participantId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` },
      });

      if (response.ok) {
        setParticipants(prev => prev.filter(p => p.id !== participantId));
        alert('참여자가 제거되었습니다');
      }
    } catch (error) {
      console.error('참여자 제거 실패:', error);
      alert('참여자 제거에 실패했습니다');
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
        <p className="text-center text-gray-500">스터디를 찾을 수 없거나 관리 권한이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">{study.name} 관리</h1>

        {/* 탭 네비게이션 */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'settings', label: '스터디 설정' },
              { key: 'participants', label: '참여자 관리' },
              { key: 'analytics', label: '통계' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as 'settings' | 'participants' | 'analytics')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* 스터디 설정 탭 */}
        {activeTab === 'settings' && (
          <StudySettingsTab
            study={study}
            onSave={handleSaveSettings}
          />
        )}

        {/* 참여자 관리 탭 */}
        {activeTab === 'participants' && (
          <ParticipantsTab
            participants={participants}
            onRemoveParticipant={handleRemoveParticipant}
          />
        )}

        {/* 통계 탭 */}
        {activeTab === 'analytics' && (
          <AnalyticsTab
            participants={participants}
          />
        )}
      </div>
    </div>
  );
}

// 스터디 설정 탭 컴포넌트
function StudySettingsTab({
  study,
  onSave
}: {
  study: StudySettings;
  onSave: (settings: Partial<StudySettings>) => void;
}) {
  const [settings, setSettings] = useState(study);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium mb-4">기본 정보</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">스터디 이름</label>
            <input
              type="text"
              value={settings.name}
              onChange={(e) => setSettings({ ...settings, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">설명</label>
            <textarea
              rows={3}
              value={settings.description}
              onChange={(e) => setSettings({ ...settings, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div className="flex space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">최대 참여자 수</label>
              <input
                type="number"
                min="2"
                max="50"
                value={settings.maxParticipants}
                onChange={(e) => setSettings({ ...settings, maxParticipants: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="flex items-end">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.isPublic}
                  onChange={(e) => setSettings({ ...settings, isPublic: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">공개 스터디</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium mb-4">인증 설정</h3>

        <div className="space-y-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.authConfig.dailyCommitRequired}
              onChange={(e) => setSettings({
                ...settings,
                authConfig: { ...settings.authConfig, dailyCommitRequired: e.target.checked }
              })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">매일 커밋 필수</span>
          </label>

          <div className="flex space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">인증 시작 시간</label>
              <input
                type="time"
                value={settings.authConfig.authTimeStart}
                onChange={(e) => setSettings({
                  ...settings,
                  authConfig: { ...settings.authConfig, authTimeStart: e.target.value }
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">인증 종료 시간</label>
              <input
                type="time"
                value={settings.authConfig.authTimeEnd}
                onChange={(e) => setSettings({
                  ...settings,
                  authConfig: { ...settings.authConfig, authTimeEnd: e.target.value }
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => onSave(settings)}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          설정 저장
        </button>
      </div>
    </div>
  );
}

// 참여자 관리 탭 컴포넌트
function ParticipantsTab({
  participants,
  onRemoveParticipant
}: {
  participants: Participant[];
  onRemoveParticipant: (id: string) => void;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-medium">참여자 목록 ({participants.length}명)</h3>
      </div>

      <div className="divide-y divide-gray-200">
        {participants.map((participant) => (
          <div key={participant.id} className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={participant.avatar_url}
                  alt={participant.username}
                  className="w-12 h-12 rounded-full"
                />
                <div>
                  <h4 className="text-lg font-medium">{participant.username}</h4>
                  <p className="text-sm text-gray-500">
                    참여일: {new Date(participant.joinedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <button
                onClick={() => onRemoveParticipant(participant.id)}
                className="text-red-600 hover:text-red-800 text-sm font-medium"
              >
                제거
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{participant.commitStats.totalCommits}</p>
                <p className="text-sm text-gray-600">총 커밋</p>
              </div>

              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{participant.commitStats.thisWeekCommits}</p>
                <p className="text-sm text-gray-600">이번 주 커밋</p>
              </div>

              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">{participant.commitStats.authSuccessRate}%</p>
                <p className="text-sm text-gray-600">인증 성공률</p>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">등록된 레포지토리:</p>
              <div className="space-y-1">
                {participant.repositories.map((repo) => (
                  <div key={repo.id} className="flex items-center justify-between text-sm">
                    <span>{repo.fullName}</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      repo.webhookStatus === 'active'
                        ? 'bg-green-100 text-green-800'
                        : repo.webhookStatus === 'error'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {repo.webhookStatus === 'active' ? '활성' :
                       repo.webhookStatus === 'error' ? '오류' : '비활성'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 통계 탭 컴포넌트
function AnalyticsTab({ participants }: { participants: Participant[] }) {
  const totalCommits = participants.reduce((sum, p) => sum + p.commitStats.totalCommits, 0);
  const avgSuccessRate = participants.reduce((sum, p) => sum + p.commitStats.authSuccessRate, 0) / participants.length || 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200 text-center">
          <h3 className="text-3xl font-bold text-blue-600">{participants.length}</h3>
          <p className="text-gray-600">총 참여자</p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 text-center">
          <h3 className="text-3xl font-bold text-green-600">{totalCommits}</h3>
          <p className="text-gray-600">총 커밋 수</p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 text-center">
          <h3 className="text-3xl font-bold text-purple-600">{avgSuccessRate.toFixed(1)}%</h3>
          <p className="text-gray-600">평균 인증 성공률</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium mb-4">참여자별 상세 통계</h3>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  참여자
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  총 커밋
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  이번 주 커밋
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  인증 성공률
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  레포지토리 수
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {participants.map((participant) => (
                <tr key={participant.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={participant.avatar_url}
                        alt={participant.username}
                        className="w-8 h-8 rounded-full mr-3"
                      />
                      {participant.username}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {participant.commitStats.totalCommits}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {participant.commitStats.thisWeekCommits}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {participant.commitStats.authSuccessRate}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {participant.repositories.length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}