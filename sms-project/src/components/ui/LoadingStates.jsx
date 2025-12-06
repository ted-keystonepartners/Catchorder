/**
 * 로딩 상태 컴포넌트들
 */
import React from 'react';

/**
 * 기본 로딩 스피너
 */
export const Spinner = ({ 
  size = 'md', 
  color = 'orange', 
  className = '' 
}) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const colors = {
    orange: 'border-orange-500',
    blue: 'border-blue-500',
    green: 'border-green-500',
    gray: 'border-gray-500',
    white: 'border-white'
  };

  return (
    <div 
      className={`animate-spin rounded-full border-b-2 border-transparent ${sizes[size]} ${colors[color]} ${className}`}
    />
  );
};

/**
 * 인라인 로딩 (버튼 등에서 사용)
 */
export const InlineLoading = ({ 
  text = '로딩 중...', 
  size = 'sm',
  color = 'gray' 
}) => (
  <div className="flex items-center gap-2">
    <Spinner size={size} color={color} />
    <span className="text-sm text-gray-600">{text}</span>
  </div>
);

/**
 * 페이지 로딩 오버레이
 */
export const PageLoading = ({ 
  text = '페이지 로딩 중...', 
  description 
}) => (
  <div className="fixed inset-0 bg-white bg-opacity-90 backdrop-blur-sm z-50 flex items-center justify-center">
    <div className="text-center">
      <Spinner size="xl" color="orange" className="mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">{text}</h3>
      {description && (
        <p className="text-sm text-gray-500">{description}</p>
      )}
    </div>
  </div>
);

/**
 * 섹션 로딩 (컨테이너 내부)
 */
export const SectionLoading = ({ 
  text = '데이터를 불러오는 중...', 
  height = '200px',
  className = '' 
}) => (
  <div 
    className={`flex flex-col items-center justify-center bg-gray-50 rounded-lg border border-gray-200 ${className}`}
    style={{ height }}
  >
    <Spinner size="lg" color="orange" className="mb-3" />
    <p className="text-sm text-gray-600">{text}</p>
  </div>
);

/**
 * 테이블 로딩 행
 */
export const TableLoading = ({ 
  columns = 5, 
  rows = 5 
}) => (
  <div className="animate-pulse">
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div 
        key={rowIndex} 
        className="flex border-b border-gray-200 py-4"
      >
        {Array.from({ length: columns }).map((_, colIndex) => (
          <div 
            key={colIndex} 
            className="flex-1 px-6"
          >
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    ))}
  </div>
);

/**
 * 카드 로딩 스켈레톤
 */
export const CardLoading = ({ 
  count = 1, 
  className = '' 
}) => (
  <div className={`space-y-4 ${className}`}>
    {Array.from({ length: count }).map((_, index) => (
      <div 
        key={index}
        className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse"
      >
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-gray-200 rounded-full flex-shrink-0"></div>
          <div className="flex-1 space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            <div className="flex space-x-2">
              <div className="h-6 bg-gray-200 rounded w-16"></div>
              <div className="h-6 bg-gray-200 rounded w-20"></div>
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

/**
 * 리스트 아이템 로딩 스켈레톤
 */
export const ListItemLoading = ({ 
  count = 3,
  showAvatar = true,
  lines = 2 
}) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="flex items-start space-x-3 animate-pulse">
        {showAvatar && (
          <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0"></div>
        )}
        <div className="flex-1 space-y-2">
          {Array.from({ length: lines }).map((_, lineIndex) => (
            <div 
              key={lineIndex}
              className={`h-3 bg-gray-200 rounded ${
                lineIndex === 0 ? 'w-3/4' : 'w-1/2'
              }`}
            ></div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

/**
 * 데이터 로딩 상태
 */
export const DataLoading = ({ 
  type = 'list', // list, table, card, chart
  message = '데이터를 불러오는 중...',
  ...props 
}) => {
  const renderByType = () => {
    switch (type) {
      case 'table':
        return <TableLoading {...props} />;
      case 'card':
        return <CardLoading {...props} />;
      case 'list':
        return <ListItemLoading {...props} />;
      case 'chart':
        return (
          <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center animate-pulse">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-200 rounded-lg mx-auto mb-3"></div>
              <p className="text-sm text-gray-500">차트 로딩 중...</p>
            </div>
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center py-8">
            <InlineLoading text={message} />
          </div>
        );
    }
  };

  return (
    <div className="w-full">
      {renderByType()}
    </div>
  );
};

/**
 * 무한 스크롤 로딩
 */
export const InfiniteScrollLoading = () => (
  <div className="flex justify-center items-center py-6">
    <div className="flex items-center space-x-3">
      <Spinner size="sm" color="orange" />
      <span className="text-sm text-gray-600">더 많은 데이터를 불러오는 중...</span>
    </div>
  </div>
);

/**
 * 검색 로딩
 */
export const SearchLoading = ({ 
  query 
}) => (
  <div className="flex items-center justify-center py-8">
    <div className="text-center">
      <Spinner size="lg" color="orange" className="mx-auto mb-3" />
      <h3 className="text-lg font-medium text-gray-900 mb-1">검색 중...</h3>
      {query && (
        <p className="text-sm text-gray-500">
          "<span className="font-medium">{query}</span>" 검색 결과를 찾고 있습니다.
        </p>
      )}
    </div>
  </div>
);

/**
 * 파일 업로드 로딩
 */
export const FileUploadLoading = ({ 
  progress = 0, 
  fileName = '',
  status = 'uploading' // uploading, processing, completed
}) => {
  const statusMessages = {
    uploading: '업로드 중...',
    processing: '처리 중...',
    completed: '완료!'
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center space-x-3">
        <Spinner size="sm" color="orange" />
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">
            {fileName || '파일 업로드'}
          </p>
          <p className="text-xs text-gray-500">
            {statusMessages[status]}
          </p>
        </div>
      </div>
      
      {progress > 0 && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>진행률</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className="bg-orange-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * 커스텀 로딩 컴포넌트 생성 헬퍼
 */
export const createLoadingComponent = ({
  spinner = true,
  text,
  description,
  className = '',
  size = 'md'
}) => {
  return () => (
    <div className={`flex flex-col items-center justify-center py-8 ${className}`}>
      {spinner && <Spinner size={size} color="orange" className="mb-3" />}
      {text && <h3 className="text-lg font-medium text-gray-900 mb-1">{text}</h3>}
      {description && <p className="text-sm text-gray-500 text-center">{description}</p>}
    </div>
  );
};

export default {
  Spinner,
  InlineLoading,
  PageLoading,
  SectionLoading,
  TableLoading,
  CardLoading,
  ListItemLoading,
  DataLoading,
  InfiniteScrollLoading,
  SearchLoading,
  FileUploadLoading,
  createLoadingComponent
};