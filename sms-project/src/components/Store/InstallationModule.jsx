import React, { useEffect, useState } from 'react';
import Card from '../Common/Card.jsx';
import Button from '../Common/Button.jsx';
import Badge from '../Common/Badge.jsx';
import { useInstallation } from '../../hooks/useInstallation.js';
import { formatDateTime } from '../../utils/formatter.js';

/**
 * InstallationModule 컴포넌트 - P1 완료 모듈 (핵심 기능)
 * @param {Object} props
 * @param {Object} props.store - 매장 정보
 */
const InstallationModule = ({ store }) => {
  const { 
    status, 
    link, 
    loading, 
    sendUrl, 
    resendUrl, 
    fetchStatus, 
    getLinkStatus,
    startPolling,
    stopPolling
  } = useInstallation(store.id);

  const [pollingInterval, setPollingInterval] = useState(null);
  const linkStatus = getLinkStatus();

  // 컴포넌트 마운트 시 상태 조회
  useEffect(() => {
    fetchStatus();
  }, [store.id]);

  // 상태가 도입확정이고 링크가 발송된 경우 폴링 시작
  useEffect(() => {
    if (store.status === 'REMOTE_INSTALL_SCHEDULED' && linkStatus.hasActiveLink && linkStatus.sentAt) {
      startPolling(3000); // 3초마다 폴링
      return () => stopPolling();
    } else {
      stopPolling();
    }
  }, [store.status, linkStatus.hasActiveLink, linkStatus.sentAt]);

  // 가입 완료 시 폴링 중지
  useEffect(() => {
    if (store.status === 'ADMIN_SETTING' || store.status === 'QR_LINKING' || store.status === 'QR_MENU_ONLY') {
      stopPolling();
    }
  }, [store.status]);

  const handleSendUrl = async () => {
    try {
      await sendUrl({
        message: `안녕하세요! ${store.name} 매장의 캐치오더 온라인 가입 링크를 보내드립니다.`,
        senderName: '캐치오더 영업팀'
      });
    } catch (error) {
      console.error('Send URL error:', error);
    }
  };

  const handleResendUrl = async () => {
    if (!link?.id) return;
    
    try {
      await resendUrl(link.id);
    } catch (error) {
      console.error('Resend URL error:', error);
    }
  };

  // 상태별 렌더링
  const renderContent = () => {
    switch (store.status) {
      case 'REMOTE_INSTALL_SCHEDULED':
        return (
          <div className="space-y-4">
            {!linkStatus.hasActiveLink ? (
              // 링크가 없는 경우
              <div className="text-center py-6">
                <div className="w-12 h-12 mx-auto bg-orange-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">온라인 가입 준비 완료</h3>
                <p className="text-sm text-gray-500 mb-4">
                  매장에서 직접 가입할 수 있도록 온라인 가입 링크를 발송해주세요.
                </p>
                <Button
                  onClick={handleSendUrl}
                  loading={loading}
                  className="w-full sm:w-auto"
                >
                  온라인 가입 URL 발송
                </Button>
              </div>
            ) : (
              // 링크가 발송된 경우
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">발송 완료</p>
                    <p className="text-xs text-gray-500">
                      발송 시각: {formatDateTime(linkStatus.sentAt)}
                    </p>
                  </div>
                  <Badge variant="warning">
                    답변 대기중
                  </Badge>
                </div>

                <div className="bg-yellow-50 p-4 rounded-md">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <div className="w-4 h-4 bg-yellow-400 rounded-full animate-pulse"></div>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-800">
                        매장에서 온라인 가입을 진행 중입니다...
                        <br />
                        <span className="text-xs">3초마다 자동으로 상태를 확인합니다.</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResendUrl}
                    loading={loading}
                  >
                    재발송
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchStatus}
                    loading={loading}
                  >
                    상태 새로고침
                  </Button>
                </div>

                {linkStatus.resendCount > 0 && (
                  <p className="text-xs text-gray-500">
                    재발송 횟수: {linkStatus.resendCount}회
                  </p>
                )}
              </div>
            )}
          </div>
        );

      case 'ADMIN_SETTING':
      case 'QR_LINKING':
      case 'QR_MENU_ONLY':
        return (
          <div className="text-center py-6">
            <div className="w-12 h-12 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">✓ 설치 완료!</h3>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center py-2 px-4 bg-green-50 rounded-md">
                <span className="text-green-700">설치 완료일:</span>
                <span className="font-medium text-green-900">
                  {formatDateTime(store.updatedAt)}
                </span>
              </div>
              
              <div className="flex justify-between items-center py-2 px-4 bg-green-50 rounded-md">
                <span className="text-green-700">약관 동의:</span>
                <span className="font-medium text-green-900">✓ 동의함</span>
              </div>
              
              {store.status === 'QR_LINKING' && (
                <div className="flex justify-between items-center py-2 px-4 bg-green-50 rounded-md">
                  <span className="text-green-700">앱 설치:</span>
                  <span className="font-medium text-green-900">✓ QR 연동 완료</span>
                </div>
              )}
            </div>

            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                disabled
              >
                온라인 가입 URL 발송 (완료됨)
              </Button>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-6">
            <div className="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">온라인 가입 대기중</h3>
            <p className="text-sm text-gray-500">
              매장 상태가 '도입확정'이 되면 온라인 가입 링크를 발송할 수 있습니다.
            </p>
          </div>
        );
    }
  };

  return (
    <Card title="🎯 P1 완료 모듈 (온라인 가입)">
      {renderContent()}
    </Card>
  );
};

export default InstallationModule;