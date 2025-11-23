import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getConsentResponses } from '../api/consentApi';

export default function ConsentResponsesPage() {
  const { storeId } = useParams();
  const [loading, setLoading] = useState(true);
  const [responses, setResponses] = useState([]);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadResponses();
  }, [storeId]);

  const loadResponses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await getConsentResponses(storeId);
      
      setResponses(data.responses || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('응답 조회 에러:', err);
      setError(err.message || '응답 조회에 실패했습니다.');
      setResponses([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg">
          {/* 헤더 */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">
              동의서 응답 조회
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              매장 ID: {storeId} | 총 {total}개의 응답
            </p>
          </div>

          {/* 컨텐츠 */}
          <div className="px-6 py-4">
            {loading && (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">응답 데이터 로딩 중...</span>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      오류가 발생했습니다
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      {error}
                    </div>
                    <div className="mt-3">
                      <button
                        onClick={loadResponses}
                        className="bg-red-100 px-3 py-1 text-sm text-red-800 rounded hover:bg-red-200"
                      >
                        다시 시도
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!loading && !error && responses.length === 0 && (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  응답이 없습니다
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  아직 제출된 동의서 응답이 없습니다.
                </p>
              </div>
            )}

            {!loading && !error && responses.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        응답자 정보
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        설치 정보
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        매장 정보
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        디자인 선택
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        제출일시
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {responses.map((response, index) => (
                      <tr key={response.response_id || index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">
                              {response.respondent_name || '-'}
                            </div>
                            <div className="text-gray-500">
                              {response.respondent_phone || '-'}
                            </div>
                            <div className="text-gray-500">
                              {response.respondent_position || '-'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            <div className="text-gray-900">
                              {response.remote_install_date || '-'} {response.remote_install_time || ''}
                            </div>
                            <div className="text-gray-500">
                              원격설치 예정
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            <div className="text-gray-900">
                              테이블 {response.table_count || '-'}개
                            </div>
                            <div className="text-gray-500">
                              {response.sticker_type || '-'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            <div className="text-gray-900">
                              {response.design_type || '-'}
                            </div>
                            <div className="text-gray-500">
                              {response.preferred_color || '-'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            <div className="text-gray-900">
                              {formatDate(response.created_at || response.submitted_at)}
                            </div>
                            <div className="text-gray-500">
                              {response.terms_agreement ? (
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                  동의함
                                </span>
                              ) : (
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                  동의안함
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 푸터 */}
          {!loading && !error && responses.length > 0 && (
            <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-500">
                총 {responses.length}개의 응답이 표시되고 있습니다.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}