/**
 * 대리점 관리 페이지
 * 동의서에서 수집된 대리점명, 대리점 연락처 리스트
 */
import React, { useState, useEffect } from 'react';
import MainLayout from '../components/Layout/MainLayout.jsx';
import { getAgencies } from '../api/agencyApi.js';

const AgencyListPage = () => {
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadAgencies();
  }, []);

  const loadAgencies = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getAgencies();
      setAgencies(result.data || []);
    } catch (err) {
      console.error('대리점 목록 로드 실패:', err);
      setError('대리점 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 검색 필터링
  const filteredAgencies = agencies.filter(agency => {
    const search = searchTerm.toLowerCase();
    return (
      (agency.agency_name || '').toLowerCase().includes(search) ||
      (agency.agency_phone || '').toLowerCase().includes(search)
    );
  });

  // CSV 다운로드
  const handleDownloadCSV = () => {
    const headers = ['대리점명', '대리점연락처', '등록매장수', '최초등록일', '최근등록일'];
    const rows = filteredAgencies.map(agency => [
      agency.agency_name,
      agency.agency_phone,
      agency.store_count,
      agency.first_submitted_at ? new Date(agency.first_submitted_at).toLocaleDateString('ko-KR') : '',
      agency.last_submitted_at ? new Date(agency.last_submitted_at).toLocaleDateString('ko-KR') : ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `대리점목록_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <MainLayout>
      <div style={{ padding: '0' }}>
        {/* 헤더 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <h1 style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#111827',
              margin: '0 0 4px 0'
            }}>
              대리점 관리
            </h1>
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              margin: 0
            }}>
              가입동의서에서 수집된 대리점 정보입니다
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {/* 검색 */}
            <div style={{ position: 'relative' }}>
              <svg
                width="18"
                height="18"
                fill="none"
                stroke="#9ca3af"
                viewBox="0 0 24 24"
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)'
                }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="대리점명, 연락처 검색"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  padding: '10px 16px 10px 40px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  width: '250px',
                  outline: 'none'
                }}
              />
            </div>

            {/* CSV 다운로드 */}
            <button
              onClick={handleDownloadCSV}
              disabled={filteredAgencies.length === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                backgroundColor: filteredAgencies.length === 0 ? '#e5e7eb' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: filteredAgencies.length === 0 ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s'
              }}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              CSV 다운로드
            </button>
          </div>
        </div>

        {/* 통계 카드 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>전체 대리점</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#111827' }}>
              {agencies.length}
            </div>
          </div>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>연결된 매장</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#FF3D00' }}>
              {agencies.reduce((sum, a) => sum + (a.store_count || 0), 0)}
            </div>
          </div>
        </div>

        {/* 테이블 */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          overflow: 'hidden'
        }}>
          {loading ? (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '60px'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                border: '3px solid #f3f4f6',
                borderTop: '3px solid #FF3D00',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
            </div>
          ) : error ? (
            <div style={{
              padding: '60px',
              textAlign: 'center',
              color: '#ef4444'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
              <p>{error}</p>
              <button
                onClick={loadAgencies}
                style={{
                  marginTop: '16px',
                  padding: '8px 16px',
                  backgroundColor: '#FF3D00',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                다시 시도
              </button>
            </div>
          ) : filteredAgencies.length === 0 ? (
            <div style={{
              padding: '60px',
              textAlign: 'center',
              color: '#6b7280'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
              <p style={{ margin: 0 }}>
                {searchTerm ? '검색 결과가 없습니다' : '등록된 대리점이 없습니다'}
              </p>
              <p style={{ fontSize: '13px', marginTop: '8px', color: '#9ca3af' }}>
                가입동의서 제출 시 대리점 정보가 자동으로 수집됩니다
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{
                      padding: '14px 20px',
                      textAlign: 'left',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#374151'
                    }}>
                      대리점명
                    </th>
                    <th style={{
                      padding: '14px 20px',
                      textAlign: 'left',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#374151'
                    }}>
                      대리점 연락처
                    </th>
                    <th style={{
                      padding: '14px 20px',
                      textAlign: 'center',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#374151'
                    }}>
                      등록 매장수
                    </th>
                    <th style={{
                      padding: '14px 20px',
                      textAlign: 'left',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#374151'
                    }}>
                      최초 등록일
                    </th>
                    <th style={{
                      padding: '14px 20px',
                      textAlign: 'left',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#374151'
                    }}>
                      최근 등록일
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAgencies.map((agency, index) => (
                    <tr
                      key={index}
                      style={{
                        borderBottom: '1px solid #f3f4f6',
                        transition: 'background-color 0.15s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{
                        padding: '16px 20px',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#111827'
                      }}>
                        {agency.agency_name || '-'}
                      </td>
                      <td style={{
                        padding: '16px 20px',
                        fontSize: '14px',
                        color: '#374151'
                      }}>
                        {agency.agency_phone ? (
                          <a
                            href={`tel:${agency.agency_phone}`}
                            style={{
                              color: '#2563eb',
                              textDecoration: 'none'
                            }}
                          >
                            {agency.agency_phone}
                          </a>
                        ) : (
                          <span style={{ color: '#9ca3af' }}>-</span>
                        )}
                      </td>
                      <td style={{
                        padding: '16px 20px',
                        fontSize: '14px',
                        textAlign: 'center'
                      }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: '32px',
                          padding: '4px 12px',
                          backgroundColor: '#FFF5F3',
                          color: '#FF3D00',
                          borderRadius: '16px',
                          fontSize: '13px',
                          fontWeight: '600'
                        }}>
                          {agency.store_count || 0}
                        </span>
                      </td>
                      <td style={{
                        padding: '16px 20px',
                        fontSize: '13px',
                        color: '#6b7280'
                      }}>
                        {agency.first_submitted_at
                          ? new Date(agency.first_submitted_at).toLocaleDateString('ko-KR')
                          : '-'}
                      </td>
                      <td style={{
                        padding: '16px 20px',
                        fontSize: '13px',
                        color: '#6b7280'
                      }}>
                        {agency.last_submitted_at
                          ? new Date(agency.last_submitted_at).toLocaleDateString('ko-KR')
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 하단 정보 */}
        {!loading && filteredAgencies.length > 0 && (
          <div style={{
            marginTop: '16px',
            fontSize: '13px',
            color: '#6b7280',
            textAlign: 'right'
          }}>
            총 {filteredAgencies.length}개 대리점
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </MainLayout>
  );
};

export default AgencyListPage;
