import { STUDY_GROUP_ABI } from './studyGroupABI';
import { authenticatedFetch } from './auth';

// ERC-20 표준 ABI (approve, balanceOf 필요)
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address owner) external view returns (uint256)"
];

// Testnet USDC 컨트랙트 주소
const USDC_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_USDC_CONTRACT_ADDRESS || "0x068E4cb0bA7502D20FBF65BD84316EC6252591a2";


declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}

// 지갑 연결
export async function connectWallet(): Promise<string | null> {
  if (!window.ethereum) {
    alert('MetaMask가 설치되어 있지 않습니다!');
    return null;
  }

  try {
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts'
    }) as string[];
    return accounts[0];
  } catch (error) {
    console.error('지갑 연결 실패:', error);
    return null;
  }
}

// 스터디 참여 (ERC-20 토큰 approve + 스마트 컨트랙트 호출 + 백엔드 알림)
export async function joinStudy(
  proxyAddress: string,
  depositAmount: string
): Promise<{ success: boolean; message: string }> {
  try {
    // 1. 지갑 연결
    const walletAddress = await connectWallet();
    if (!walletAddress) {
      return { success: false, message: '지갑 연결이 필요합니다.' };
    }

    // 2. Web3 초기화
    const { ethers } = await import('ethers');
    const provider = new ethers.BrowserProvider(window.ethereum!);
    const signer = await provider.getSigner();

    // 3. 컨트랙트 인스턴스 생성
    const studyContract = new ethers.Contract(proxyAddress, STUDY_GROUP_ABI, signer);
    const usdcContract = new ethers.Contract(USDC_CONTRACT_ADDRESS, ERC20_ABI, signer);

    console.log('💰 스터디 참여 시작 (ERC-20 토큰)');

    // 백엔드에서 받은 예치금 사용 (소수점 제거 후 BigInt 변환)
    const cleanAmount = depositAmount.split('.')[0]; // 소수점 앞 부분만 사용

    // 임시 수정: 백엔드에서 잘못된 단위로 저장된 경우 보정
    // 100000000000000 → 100000000 (올바른 USDC 단위)
    let correctedAmount = cleanAmount;
    if (cleanAmount.length > 9) { // 너무 큰 값인 경우
      // 뒤의 6자리만 사용 (USDC 소수점 자리수)
      correctedAmount = cleanAmount.slice(0, -6);
    }

    const valueToSend = BigInt(correctedAmount);
    console.log('📋 예치금 정보:', {
      백엔드에서받은값: depositAmount,
      정리된값: cleanAmount,
      보정된값: correctedAmount,
      BigInt변환값: valueToSend.toString()
    });
    console.log('💸 승인할 USDC 금액:', valueToSend.toString());

    // USDC 잔액 확인
    try {
      const balance = await usdcContract.balanceOf(walletAddress);
      console.log('💰 현재 USDC 잔액:', balance.toString());
      console.log('💰 USDC 잔액 (실제 단위):', (Number(balance) / 1000000).toString(), 'USDC');

      if (BigInt(balance) < valueToSend) {
        return { success: false, message: 'USDC 잔액이 부족합니다.' };
      }
    } catch (error) {
      console.error('❌ USDC 잔액 조회 실패:', error);
    }

    // 4. 1단계: USDC 토큰 approve
    console.log('📝 USDC 승인 요청 중...');
    const approveTx = await usdcContract.approve(proxyAddress, valueToSend);
    console.log('📡 USDC 승인 트랜잭션 전송 완료');

    // approve 트랜잭션 확인 대기
    await approveTx.wait();
    console.log('✅ USDC 승인 완료');

    // 5. 2단계: 스터디 참여
    console.log('🎯 스터디 참여 요청 중...');
    const joinTx = await studyContract.joinStudy();
    console.log('📡 스터디 참여 트랜잭션 전송 완료');

    // 6. 트랜잭션 확인 대기
    await joinTx.wait();
    console.log('✅ 스터디 참여 완료');

    // 6. 백엔드에 참여 알림
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
    const response = await authenticatedFetch(`${backendUrl}/study/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress,
        proxyAddress
      }),
    });

    if (response.ok) {
      console.log('✅ 백엔드 알림 성공');
      return {
        success: true,
        message: '스터디 참여가 완료되었습니다!'
      };
    } else {
      await response.json(); // Error response data
      console.error('❌ 백엔드 알림 실패');
      return {
        success: false,
        message: '스마트 컨트랙트 호출은 성공했지만 백엔드 등록에 실패했습니다.'
      };
    }

  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    console.error('❌ 스터디 참여 실패:', error);

    if (error.code === 'ACTION_REJECTED') {
      return { success: false, message: '사용자가 트랜잭션을 취소했습니다.' };
    } else if (error.code === 'INSUFFICIENT_FUNDS') {
      return { success: false, message: '잔액이 부족합니다.' };
    } else if (error.code === 3) {
      // execution reverted 에러 상세 분석
      console.error('❌ 컨트랙트 실행 실패 - 상세 정보:', {
        code: error.code,
        message: error.message,
        data: error.data
      });

      if (error.data && error.data.includes('fb8f41b2')) {
        return { success: false, message: '이미 참여한 스터디이거나 참여 조건을 만족하지 않습니다.' };
      }

      return { success: false, message: '스마트 컨트랙트 실행이 실패했습니다. 스터디 상태나 조건을 확인해주세요.' };
    } else if (error.message?.includes('Incorrect deposit amount')) {
      return { success: false, message: '예치금 금액이 올바르지 않습니다.' };
    } else if (error.message?.includes('Already joined')) {
      return { success: false, message: '이미 참여한 스터디입니다.' };
    } else {
      return {
        success: false,
        message: error.message || '스터디 참여 중 오류가 발생했습니다.'
      };
    }
  }
}

// 스터디 탈퇴 (예치금 환불)
export async function leaveStudy(
  proxyAddress: string
): Promise<{ success: boolean; message: string }> {
  try {
    // 1. 지갑 연결
    const walletAddress = await connectWallet();
    if (!walletAddress) {
      return { success: false, message: '지갑 연결이 필요합니다.' };
    }

    // 2. Web3 초기화
    const { ethers } = await import('ethers');
    const provider = new ethers.BrowserProvider(window.ethereum!);
    const signer = await provider.getSigner();

    // 3. 컨트랙트 인스턴스 생성
    const studyContract = new ethers.Contract(proxyAddress, STUDY_GROUP_ABI, signer);

    console.log('🚪 스터디 탈퇴 시작');

    // 4. 스터디 탈퇴
    console.log('📝 스터디 탈퇴 요청 중...');
    const leaveTx = await studyContract.leaveStudy();
    console.log('📡 스터디 탈퇴 트랜잭션 전송 완료');

    // 5. 트랜잭션 확인 대기
    await leaveTx.wait();
    console.log('✅ 스터디 탈퇴 완료');

    // 6. 백엔드에 탈퇴 알림 (JWT 인증 필요)
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
    const response = await fetch(`${backendUrl}/study/withdraw`, {
      method: 'POST',
      credentials: 'include', // JWT 쿠키 포함
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        proxyAddress
      }),
    });

    if (response.ok) {
      console.log('✅ 백엔드 알림 성공');
      return {
        success: true,
        message: '스터디 탈퇴가 완료되었습니다! 예치금이 환불되었습니다.'
      };
    } else {
      await response.json(); // Error response data
      console.error('❌ 백엔드 알림 실패');
      return {
        success: false,
        message: '스마트 컨트랙트 탈퇴는 성공했지만 백엔드 업데이트에 실패했습니다.'
      };
    }

  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    console.error('❌ 스터디 탈퇴 실패:', error);

    if (error.code === 'ACTION_REJECTED') {
      return { success: false, message: '사용자가 트랜잭션을 취소했습니다.' };
    } else if (error.code === 'INSUFFICIENT_FUNDS') {
      return { success: false, message: '가스비가 부족합니다.' };
    } else if (error.code === 3) {
      console.error('❌ 컨트랙트 실행 실패 - 상세 정보:', {
        code: error.code,
        message: error.message,
        data: error.data
      });

      return { success: false, message: '스터디 탈퇴가 불가능합니다. 스터디 상태를 확인해주세요.' };
    } else {
      return {
        success: false,
        message: error.message || '스터디 탈퇴 중 오류가 발생했습니다.'
      };
    }
  }
}

// 현재 사용자의 실제 예치금 잔액 조회
export async function getMyBalance(proxyAddress: string): Promise<{ success: boolean; balance?: string; message: string }> {
  // 1. MetaMask 연결 확인
  if (!window.ethereum) {
    return { success: false, message: 'MetaMask를 설치해주세요.' };
  }

  try {
    // 2. 현재 연결된 지갑 주소 가져오기
    const walletAddress = await connectWallet();
    if (!walletAddress) {
      return { success: false, message: '지갑 연결에 실패했습니다.' };
    }

    // 3. Web3 초기화
    const { ethers } = await import('ethers');
    const provider = new ethers.BrowserProvider(window.ethereum!);

    // 4. 스터디 컨트랙트 인스턴스 생성 (읽기 전용)
    const studyContract = new ethers.Contract(proxyAddress, STUDY_GROUP_ABI, provider);

    // 5. balances 매핑에서 현재 사용자 잔액 조회
    console.log('💰 잔액 조회 중:', { proxyAddress, walletAddress });
    const balance = await studyContract.balances(walletAddress);

    // BigInt를 문자열로 변환
    const balanceString = balance.toString();
    console.log('💰 현재 잔액:', balanceString);

    return {
      success: true,
      balance: balanceString,
      message: '잔액 조회 완료'
    };

  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    console.error('❌ 잔액 조회 실패:', error);
    return {
      success: false,
      message: error.message || '잔액 조회 중 오류가 발생했습니다.'
    };
  }
}