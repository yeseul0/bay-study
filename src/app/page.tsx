export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">스터디 인증 시스템</h1>

      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center">
          <p className="text-gray-600 mb-6">GitHub과 연동하여 스터디에 참여하세요</p>
          <button className="bg-gray-900 text-white px-6 py-3 rounded-lg hover:bg-gray-800">
            GitHub으로 로그인
          </button>
        </div>
      </div>
    </div>
  );
}
