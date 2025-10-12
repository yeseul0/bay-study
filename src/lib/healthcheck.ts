// 서버 슬립 방지를 위한 헬스체크 시스템

class HealthCheckService {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly INTERVAL_MS = 30 * 60 * 1000; // 30분
  private readonly backendUrl: string;

  constructor() {
    this.backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
  }

  // 헬스체크 요청 보내기
  private async sendHealthCheck(): Promise<void> {
    try {
      console.log('🏥 헬스체크 요청 보내는 중...');

      const response = await fetch(`${this.backendUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // 타임아웃 설정 (30초)
        signal: AbortSignal.timeout(30000)
      });

      if (response.ok) {
        console.log('✅ 헬스체크 성공 - 서버 활성 상태 유지');
      } else {
        console.warn('⚠️ 헬스체크 응답 상태:', response.status);
      }
    } catch (error) {
      console.error('❌ 헬스체크 실패:', error);
      // 실패해도 계속 시도
    }
  }

  // 헬스체크 시작
  public start(): void {
    if (this.intervalId) {
      console.log('⚠️ 헬스체크가 이미 실행중입니다.');
      return;
    }

    console.log('🚀 헬스체크 시작 - 30분마다 서버 핑 보냄');

    // 즉시 한 번 실행
    this.sendHealthCheck();

    // 30분마다 반복 실행
    this.intervalId = setInterval(() => {
      this.sendHealthCheck();
    }, this.INTERVAL_MS);
  }

  // 헬스체크 중지
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🛑 헬스체크 중지됨');
    }
  }

  // 현재 실행 상태 확인
  public isRunning(): boolean {
    return this.intervalId !== null;
  }
}

// 싱글톤 인스턴스 생성
export const healthCheckService = new HealthCheckService();

// 자동 시작 (브라우저에서만)
if (typeof window !== 'undefined') {
  // 페이지 로드 후 5초 뒤에 시작 (초기 로딩 완료 후)
  setTimeout(() => {
    healthCheckService.start();
  }, 5000);

  // 페이지 언로드 시 정리
  window.addEventListener('beforeunload', () => {
    healthCheckService.stop();
  });
}