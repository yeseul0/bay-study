'use client';

import { useState } from 'react';
import { authenticatedFetch } from '@/lib/auth';

interface CreateStudyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface CreateStudyDto {
  studyName: string;
  depositAmount: string;
  penaltyAmount: string;
  studyStartTime: number;
  studyEndTime: number;
}

export default function CreateStudyModal({ isOpen, onClose, onSuccess }: CreateStudyModalProps) {
  const [formData, setFormData] = useState({
    studyName: '',
    depositAmount: '',
    penaltyAmount: '',
    startHour: 21, // 기본값: 오후 9시
    endHour: 1,    // 기본값: 오전 1시 (다음날)
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 벌금 > 예치금 검증 (USDC 단위로)
  const isPenaltyTooHigh = () => {
    if (!formData.depositAmount || !formData.penaltyAmount) return false;
    try {
      const depositAmount = Number(formData.depositAmount);
      const penaltyAmount = Number(formData.penaltyAmount);
      return penaltyAmount > depositAmount;
    } catch {
      return false;
    }
  };

  // 시간을 Unix timestamp로 변환 (자정부터 초 단위)
  const convertToUnixTime = (hour: number): number => {
    return hour * 3600; // 시간 * 3600초
  };

  // 시간 옵션 생성 (00시~26시)
  const generateTimeOptions = () => {
    const options = [];
    for (let i = 0; i <= 26; i++) {
      const period = i < 12 ? '오전' : i < 24 ? '오후' : '다음날 오전';
      const hour12 = i === 0 ? 12 : i <= 12 ? i : i <= 24 ? i - 12 : i - 24;
      options.push({
        value: i,
        label: `${period} ${hour12}시 (${String(i).padStart(2, '0')}:00)`
      });
    }
    return options;
  };

  // 종료시간 옵션 생성 (시작시간보다 나중 시간만)
  const generateEndTimeOptions = () => {
    const allOptions = generateTimeOptions();
    return allOptions.filter(option => option.value > formData.startHour);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 입력값 검증
      if (!formData.studyName.trim()) {
        throw new Error('스터디 이름을 입력해주세요.');
      }
      if (!formData.depositAmount || Number(formData.depositAmount) <= 0) {
        throw new Error('보증금을 올바르게 입력해주세요.');
      }
      if (!formData.penaltyAmount || Number(formData.penaltyAmount) <= 0) {
        throw new Error('벌금을 올바르게 입력해주세요.');
      }

      // USDC 단위를 wei 단위로 변환 (USDC는 6자리 소수점)
      const depositAmountWei = (Number(formData.depositAmount) * 1000000).toString();
      const penaltyAmountWei = (Number(formData.penaltyAmount) * 1000000).toString();

      // 벌금이 예치금보다 크면 안됨
      const depositAmountBigInt = BigInt(depositAmountWei);
      const penaltyAmountBigInt = BigInt(penaltyAmountWei);
      if (penaltyAmountBigInt > depositAmountBigInt) {
        throw new Error('벌금은 예치금보다 클 수 없습니다.');
      }

      const createStudyDto: CreateStudyDto = {
        studyName: formData.studyName.trim(),
        depositAmount: depositAmountWei,
        penaltyAmount: penaltyAmountWei,
        studyStartTime: convertToUnixTime(formData.startHour),
        studyEndTime: convertToUnixTime(formData.endHour),
      };

      console.log('📤 스터디 생성 요청:', createStudyDto);

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
      const response = await authenticatedFetch(`${backendUrl}/study/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createStudyDto),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ 스터디 생성 성공:', result);

        // 성공 알림
        alert(`스터디 "${formData.studyName}"가 성공적으로 생성되었습니다!\n컨트랙트 주소: ${result.proxyAddress}`);

        // 폼 초기화
        setFormData({
          studyName: '',
          depositAmount: '',
          penaltyAmount: '',
          startHour: 21,
          endHour: 1,
        });

        onSuccess();
        onClose();
      } else {
        // 상세한 에러 정보 출력
        console.log('❌ Response status:', response.status);
        console.log('❌ Response headers:', response.headers);

        const errorData = await response.json();
        console.log('❌ Error data:', errorData);

        throw new Error(`${response.status}: ${errorData.message || '스터디 생성에 실패했습니다.'}`);
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'Authentication failed') {
        // authenticatedFetch에서 이미 리다이렉트 처리됨
        console.log('🔄 인증 실패로 로그인 페이지로 리다이렉트됩니다.');
        return;
      }
      console.error('❌ 스터디 생성 실패:', error);
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string | number) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };

      // 시작시간이 바뀌면 종료시간도 조정
      if (field === 'startHour') {
        const startHour = Number(value);
        // 종료시간이 시작시간보다 작거나 같으면 시작시간+1로 설정
        if (prev.endHour <= startHour) {
          newData.endHour = startHour + 1;
        }
      }

      return newData;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 border border-gray-200">
        {/* 헤더 */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">새 스터디 만들기</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 에러 메시지 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* 스터디 이름 */}
          <div>
            <label htmlFor="studyName" className="block text-sm font-medium text-gray-700 mb-2">
              스터디 이름 *
            </label>
            <input
              id="studyName"
              type="text"
              value={formData.studyName}
              onChange={(e) => handleInputChange('studyName', e.target.value)}
              placeholder="예: Blockchain Study 101"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#12144c] focus:border-[#12144c]"
              required
            />
          </div>

          {/* 보증금과 벌금 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="depositAmount" className="block text-sm font-medium text-gray-700 mb-2">
                보증금 (USDC) *
              </label>
              <input
                id="depositAmount"
                type="number"
                step="0.01"
                min="0"
                value={formData.depositAmount}
                onChange={(e) => handleInputChange('depositAmount', e.target.value)}
                placeholder="10.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#12144c] focus:border-[#12144c]"
                required
              />
            </div>
            <div>
              <label htmlFor="penaltyAmount" className="block text-sm font-medium text-gray-700 mb-2">
                벌금 (USDC) *
              </label>
              <input
                id="penaltyAmount"
                type="number"
                step="0.01"
                min="0"
                value={formData.penaltyAmount}
                onChange={(e) => handleInputChange('penaltyAmount', e.target.value)}
                placeholder="5.00"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 ${
                  isPenaltyTooHigh()
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50'
                    : 'border-gray-300 focus:ring-[#12144c] focus:border-[#12144c]'
                }`}
                required
              />
              {isPenaltyTooHigh() && (
                <p className="mt-1 text-xs text-red-600">
                  ⚠️ 벌금은 예치금보다 클 수 없습니다
                </p>
              )}
            </div>
          </div>

          {/* 스터디 시간 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="startHour" className="block text-sm font-medium text-gray-700 mb-2">
                시작 시간 *
              </label>
              <select
                id="startHour"
                value={formData.startHour}
                onChange={(e) => handleInputChange('startHour', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#12144c] focus:border-[#12144c]"
              >
                {generateTimeOptions().map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="endHour" className="block text-sm font-medium text-gray-700 mb-2">
                종료 시간 *
              </label>
              <select
                id="endHour"
                value={formData.endHour}
                onChange={(e) => handleInputChange('endHour', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#12144c] focus:border-[#12144c]"
              >
                {generateEndTimeOptions().map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 주의사항 */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex">
              <svg className="w-5 h-5 text-amber-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">출석 인정 기준</p>
                <p>스터디 시간 사이에 등록한 레포지토리에 활동 기록(커밋, PR 등)이 찍혀야 출석이 인정됩니다.</p>
              </div>
            </div>
          </div>

          {/* 버튼들 */}
          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading || isPenaltyTooHigh()}
              className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
              style={{
                backgroundColor: loading || isPenaltyTooHigh() ? '#6b7280' : '#12144c'
              }}
              onMouseEnter={(e) => {
                if (!loading && !isPenaltyTooHigh()) {
                  e.currentTarget.style.backgroundColor = '#0f1240';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading && !isPenaltyTooHigh()) {
                  e.currentTarget.style.backgroundColor = '#12144c';
                }
              }}
            >
              {loading ? '생성 중...' : isPenaltyTooHigh() ? '벌금이 너무 높습니다' : '스터디 만들기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}