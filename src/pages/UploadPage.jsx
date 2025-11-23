import React, { useState } from 'react';
import MainLayout from '../components/Layout/MainLayout.jsx';
import Card from '../components/Common/Card.jsx';
import Button from '../components/Common/Button.jsx';
import Loading from '../components/Common/Loading.jsx';

/**
 * UploadPage 컴포넌트 - 데이터 업로드 페이지 (ADMIN만)
 */
const UploadPage = () => {
  const [uploadState, setUploadState] = useState({
    file: null,
    uploading: false,
    progress: 0,
    preview: [],
    result: null
  });

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.type !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        alert('Excel 파일(.xlsx)만 업로드 가능합니다.');
        return;
      }
      
      setUploadState(prev => ({
        ...prev,
        file,
        preview: [],
        result: null
      }));
      
      // 파일 미리보기 생성 (실제로는 Excel 파싱 라이브러리 사용)
      generatePreview(file);
    }
  };

  const generatePreview = (file) => {
    // Mock 미리보기 데이터 생성
    const mockData = Array.from({ length: 10 }, (_, i) => ({
      seq: i + 1,
      name: `샘플매장${i + 1}`,
      address: `서울특별시 강남구 테헤란로 ${100 + i}`,
      phone: `02-123-${4567 + i}`,
      owner: i % 3 === 0 ? '김영업' : i % 3 === 1 ? '이매니저' : '박팀장'
    }));
    
    setUploadState(prev => ({
      ...prev,
      preview: mockData
    }));
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      const mockEvent = { target: { files: [file] } };
      handleFileSelect(mockEvent);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleUpload = async () => {
    if (!uploadState.file) return;

    setUploadState(prev => ({ ...prev, uploading: true, progress: 0 }));

    // 업로드 시뮬레이션
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 200));
      setUploadState(prev => ({ ...prev, progress: i }));
    }

    // 결과 시뮬레이션
    const result = {
      success: Math.random() > 0.2, // 80% 성공률
      totalRows: uploadState.preview.length,
      successRows: Math.floor(uploadState.preview.length * 0.9),
      errorRows: Math.floor(uploadState.preview.length * 0.1),
      errors: [
        { row: 3, message: '전화번호 형식이 올바르지 않습니다.' },
        { row: 7, message: '매장명이 너무 깁니다.' }
      ]
    };

    setUploadState(prev => ({
      ...prev,
      uploading: false,
      progress: 0,
      result
    }));
  };

  const resetUpload = () => {
    setUploadState({
      file: null,
      uploading: false,
      progress: 0,
      preview: [],
      result: null
    });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">데이터 업로드</h1>
          <p className="mt-1 text-sm text-gray-500">
            Excel 파일을 통해 매장 데이터를 일괄 업로드할 수 있습니다.
          </p>
        </div>

        {/* 파일 업로드 섹션 */}
        <Card title="매장 데이터 업로드">
          <div className="space-y-6">
            {/* 드래그 앤 드롭 영역 */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors duration-200"
            >
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="mt-4">
                <label htmlFor="file-upload" className="cursor-pointer">
                  <span className="mt-2 block text-sm font-medium text-gray-900">
                    파일을 드래그하거나 클릭하여 업로드
                  </span>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    accept=".xlsx"
                    className="sr-only"
                    onChange={handleFileSelect}
                  />
                </label>
                <p className="mt-2 text-xs text-gray-500">
                  Excel 파일만 지원 (.xlsx)
                </p>
              </div>
            </div>

            {/* 선택된 파일 정보 */}
            {uploadState.file && (
              <div className="bg-blue-50 p-4 rounded-md">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  <div className="ml-3 flex-1">
                    <p className="text-sm text-blue-800 font-medium">
                      {uploadState.file.name}
                    </p>
                    <p className="text-xs text-blue-600">
                      크기: {(uploadState.file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetUpload}
                  >
                    제거
                  </Button>
                </div>
              </div>
            )}

            {/* 업로드 진행률 */}
            {uploadState.uploading && (
              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>업로드 중...</span>
                  <span>{uploadState.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadState.progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* 미리보기 섹션 */}
        {uploadState.preview.length > 0 && (
          <Card title="데이터 미리보기 (처음 10개)">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Seq
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      매장명
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      주소
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      전화번호
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      담당자
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {uploadState.preview.map((row, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row.seq}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row.address}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row.phone}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row.owner}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex justify-between items-center">
              <p className="text-sm text-gray-500">
                총 {uploadState.preview.length}개 데이터를 업로드할 예정입니다.
              </p>
              <div className="space-x-2">
                <Button
                  variant="outline"
                  onClick={resetUpload}
                  disabled={uploadState.uploading}
                >
                  취소
                </Button>
                <Button
                  onClick={handleUpload}
                  loading={uploadState.uploading}
                >
                  업로드 시작
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* 업로드 결과 */}
        {uploadState.result && (
          <Card title="업로드 결과">
            <div className="space-y-4">
              {uploadState.result.success ? (
                <div className="bg-green-50 p-4 rounded-md">
                  <div className="flex">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800">
                        업로드가 완료되었습니다!
                      </h3>
                      <div className="mt-2 text-sm text-green-700">
                        <p>성공: {uploadState.result.successRows}개</p>
                        <p>실패: {uploadState.result.errorRows}개</p>
                        <p>총합: {uploadState.result.totalRows}개</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 p-4 rounded-md">
                  <div className="flex">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        업로드 중 오류가 발생했습니다
                      </h3>
                    </div>
                  </div>
                </div>
              )}

              {/* 에러 목록 */}
              {uploadState.result.errors?.length > 0 && (
                <div className="bg-yellow-50 p-4 rounded-md">
                  <h4 className="text-sm font-medium text-yellow-800 mb-2">
                    오류 세부사항:
                  </h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {uploadState.result.errors.map((error, index) => (
                      <li key={index}>
                        행 {error.row}: {error.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex space-x-2">
                <Button onClick={resetUpload}>
                  새 파일 업로드
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.location.href = '/stores'}
                >
                  매장 목록 보기
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* 도움말 */}
        <Card title="업로드 가이드">
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">필수 컬럼:</h4>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>Seq (순번)</li>
                <li>매장명</li>
                <li>주소</li>
                <li>전화번호</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">선택 컬럼:</h4>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>담당자</li>
                <li>사업자등록번호</li>
                <li>카테고리</li>
                <li>직원수</li>
                <li>연매출</li>
              </ul>
            </div>

            <div className="bg-blue-50 p-3 rounded-md">
              <p className="text-blue-800">
                <strong>주의사항:</strong> 전화번호는 하이픈(-) 포함하여 입력해주세요. 
                예: 02-123-4567
              </p>
            </div>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
};

export default UploadPage;