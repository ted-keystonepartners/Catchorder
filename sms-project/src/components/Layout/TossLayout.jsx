/**
 * 토스 스타일 전체 레이아웃 컴포넌트
 */
import React from 'react';
import TossHeader from './TossHeader.jsx';

const TossLayout = ({ children, title, description, actions }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <TossHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 페이지 헤더 */}
        {(title || description || actions) && (
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div>
                {title && (
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    {title}
                  </h1>
                )}
                {description && (
                  <p className="text-gray-600 text-base">
                    {description}
                  </p>
                )}
              </div>
              
              {actions && (
                <div className="flex items-center space-x-3">
                  {actions}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 메인 콘텐츠 */}
        <div className="space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
};

/**
 * 토스 스타일 카드 컴포넌트
 */
export const TossCard = ({ 
  children, 
  className = '', 
  padding = 'default',
  hover = false 
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    default: 'p-6',
    lg: 'p-8'
  };

  return (
    <div 
      className={`
        bg-white rounded-2xl shadow-sm border border-gray-100 
        ${hover ? 'hover:shadow-md transition-shadow duration-200' : ''}
        ${paddingClasses[padding]}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

/**
 * 토스 스타일 섹션 헤더
 */
export const TossSectionHeader = ({ 
  title, 
  description, 
  actions,
  className = '' 
}) => {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 ${className}`}>
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">{title}</h2>
        {description && (
          <p className="text-gray-600 text-sm">{description}</p>
        )}
      </div>
      
      {actions && (
        <div className="flex items-center space-x-3">
          {actions}
        </div>
      )}
    </div>
  );
};

/**
 * 토스 스타일 통계 카드
 */
export const TossStatsCard = ({ 
  title, 
  value, 
  change, 
  changeType = 'positive', // positive, negative, neutral
  icon,
  description
}) => {
  const changeColors = {
    positive: 'text-green-600 bg-green-50',
    negative: 'text-red-600 bg-red-50',
    neutral: 'text-gray-600 bg-gray-50'
  };

  return (
    <TossCard hover className="relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium mb-2">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
          {description && (
            <p className="text-gray-500 text-xs">{description}</p>
          )}
        </div>
        {icon && (
          <div className="text-2xl opacity-80">
            {icon}
          </div>
        )}
      </div>
      
      {change && (
        <div className="mt-4">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${changeColors[changeType]}`}>
            {changeType === 'positive' && '↗'}
            {changeType === 'negative' && '↘'}
            {changeType === 'neutral' && '→'}
            {change}
          </span>
        </div>
      )}
      
      {/* 배경 장식 */}
      <div className="absolute -right-4 -top-4 w-16 h-16 bg-gradient-to-br from-blue-50 to-transparent rounded-full opacity-50" />
    </TossCard>
  );
};

/**
 * 토스 스타일 빈 상태 컴포넌트
 */
export const TossEmptyState = ({ 
  icon = '📋', 
  title, 
  description, 
  actions 
}) => {
  return (
    <div className="text-center py-12">
      <div className="text-6xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      {description && (
        <p className="text-gray-600 mb-6 max-w-sm mx-auto">{description}</p>
      )}
      {actions && (
        <div className="flex justify-center space-x-3">
          {actions}
        </div>
      )}
    </div>
  );
};

export default TossLayout;