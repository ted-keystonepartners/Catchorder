import React, { useState, useEffect } from 'react';
import { publishReport, getPublishedReports, deletePublishedReport } from '../../api/reportsApi.js';

const ACCENT = '#FF3D00';

const PublishReportModal = ({ isOpen, onClose, onCollectSnapshot }) => {
  const [title, setTitle] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState(null);
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState('publish'); // 'publish' | 'list'
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // 기본 제목 설정
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const month = now.getMonth() + 1;
      const week = Math.ceil(now.getDate() / 7);
      setTitle(`${month}월 ${week}주차 리포트`);
      setPublishedUrl(null);
      setCopied(false);
      setView('publish');
    }
  }, [isOpen]);

  // 발행 목록 로드
  useEffect(() => {
    if (view === 'list') {
      loadReports();
    }
  }, [view]);

  const loadReports = async () => {
    setLoadingReports(true);
    try {
      const response = await getPublishedReports();
      if (response.success) {
        setReports(response.data?.reports || []);
      }
    } catch (err) {
      console.error('발행 목록 로드 실패:', err);
    } finally {
      setLoadingReports(false);
    }
  };

  const handlePublish = async () => {
    if (!title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }

    setIsPublishing(true);
    try {
      // 현재 리포트 데이터 수집
      const snapshot = await onCollectSnapshot();

      const response = await publishReport(title, snapshot, 'user');

      if (response.success) {
        const baseUrl = window.location.origin;
        const shareUrl = `${baseUrl}/reports/shared/${response.data.share_token}`;
        setPublishedUrl(shareUrl);
      } else {
        alert('발행에 실패했습니다: ' + (response.error || '알 수 없는 오류'));
      }
    } catch (err) {
      console.error('발행 실패:', err);
      alert('발행에 실패했습니다.');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publishedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // fallback
      const textArea = document.createElement('textarea');
      textArea.value = publishedUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDelete = async (reportId) => {
    if (!confirm('이 리포트를 삭제하시겠습니까?')) return;

    setDeletingId(reportId);
    try {
      const response = await deletePublishedReport(reportId);
      if (response.success) {
        setReports(prev => prev.filter(r => r.id !== reportId));
      } else {
        alert('삭제에 실패했습니다.');
      }
    } catch (err) {
      alert('삭제에 실패했습니다.');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '520px',
        maxHeight: '80vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #f3f4f6',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', gap: '16px' }}>
            <button
              onClick={() => setView('publish')}
              style={{
                padding: '6px 12px',
                fontSize: '14px',
                fontWeight: view === 'publish' ? '600' : '400',
                color: view === 'publish' ? ACCENT : '#6b7280',
                backgroundColor: view === 'publish' ? '#fff5f3' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              발행하기
            </button>
            <button
              onClick={() => setView('list')}
              style={{
                padding: '6px 12px',
                fontSize: '14px',
                fontWeight: view === 'list' ? '600' : '400',
                color: view === 'list' ? ACCENT : '#6b7280',
                backgroundColor: view === 'list' ? '#fff5f3' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              발행 목록
            </button>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              color: '#9ca3af',
              cursor: 'pointer',
              lineHeight: 1
            }}
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
          {view === 'publish' ? (
            publishedUrl ? (
              // 발행 완료
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  backgroundColor: '#f0fdf4',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  fontSize: '32px'
                }}>
                  ✓
                </div>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '700',
                  color: '#111827',
                  margin: '0 0 8px 0'
                }}>
                  발행 완료
                </h3>
                <p style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  margin: '0 0 20px 0'
                }}>
                  아래 링크를 공유하세요
                </p>

                <div style={{
                  display: 'flex',
                  gap: '8px',
                  backgroundColor: '#f9fafb',
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '16px'
                }}>
                  <input
                    type="text"
                    value={publishedUrl}
                    readOnly
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      fontSize: '13px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      backgroundColor: 'white'
                    }}
                  />
                  <button
                    onClick={handleCopy}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: copied ? '#16a34a' : ACCENT,
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {copied ? '복사됨!' : '복사'}
                  </button>
                </div>

                <button
                  onClick={() => window.open(publishedUrl, '_blank')}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: 'white',
                    color: ACCENT,
                    border: `1px solid ${ACCENT}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  새 탭에서 열기
                </button>
              </div>
            ) : (
              // 발행 폼
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  리포트 제목
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 3월 1주차 리포트"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '15px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    marginBottom: '16px'
                  }}
                />

                <div style={{
                  backgroundColor: '#f9fafb',
                  padding: '16px',
                  borderRadius: '8px',
                  marginBottom: '20px'
                }}>
                  <p style={{
                    fontSize: '13px',
                    color: '#6b7280',
                    margin: 0,
                    lineHeight: 1.6
                  }}>
                    현재 리포트 화면의 모든 데이터(KPI, 퍼널, 코호트, Key Task, 보고내용)가 스냅샷으로 저장됩니다. 발행 후에는 원본 데이터가 변경되어도 발행된 리포트는 유지됩니다.
                  </p>
                </div>

                <button
                  onClick={handlePublish}
                  disabled={isPublishing}
                  style={{
                    width: '100%',
                    padding: '14px',
                    backgroundColor: isPublishing ? '#fca5a5' : ACCENT,
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: isPublishing ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isPublishing ? '발행 중...' : '발행하기'}
                </button>
              </div>
            )
          ) : (
            // 발행 목록
            <div>
              {loadingReports ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                  로딩 중...
                </div>
              ) : reports.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                  발행된 리포트가 없습니다
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {reports.map(report => (
                    <div
                      key={report.id}
                      style={{
                        padding: '16px',
                        backgroundColor: '#f9fafb',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#111827',
                          marginBottom: '4px'
                        }}>
                          {report.title}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: '#9ca3af'
                        }}>
                          {formatDate(report.published_at)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => {
                            const url = `${window.location.origin}/reports/shared/${report.share_token}`;
                            navigator.clipboard.writeText(url);
                            alert('링크가 복사되었습니다.');
                          }}
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            backgroundColor: 'white',
                            color: '#374151',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          링크 복사
                        </button>
                        <button
                          onClick={() => window.open(`/reports/shared/${report.share_token}`, '_blank')}
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            backgroundColor: ACCENT,
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          보기
                        </button>
                        <button
                          onClick={() => handleDelete(report.id)}
                          disabled={deletingId === report.id}
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            backgroundColor: '#fef2f2',
                            color: '#dc2626',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: deletingId === report.id ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {deletingId === report.id ? '...' : '삭제'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublishReportModal;
