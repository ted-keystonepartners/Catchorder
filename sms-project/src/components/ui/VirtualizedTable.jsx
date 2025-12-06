/**
 * 가상화된 테이블 컴포넌트 - 대량 데이터 처리용
 */
import React, { useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';

/**
 * 가상화된 테이블 컴포넌트
 * @param {Object} props
 * @param {Array} props.data - 테이블 데이터
 * @param {Array} props.columns - 컬럼 정의
 * @param {number} props.height - 테이블 높이 (기본: 600px)
 * @param {number} props.itemHeight - 행 높이 (기본: 60px)
 * @param {boolean} props.loading - 로딩 상태
 * @param {Function} props.onRowClick - 행 클릭 핸들러
 * @param {boolean} props.striped - 줄무늬 효과
 * @param {string} props.emptyMessage - 빈 데이터 메시지
 */
const VirtualizedTable = ({
  data = [],
  columns = [],
  height = 600,
  itemHeight = 60,
  loading = false,
  onRowClick,
  striped = true,
  emptyMessage = '데이터가 없습니다'
}) => {
  // 헤더 렌더링
  const renderHeader = useCallback(() => (
    <div 
      className="flex bg-gray-50 border-b border-gray-200 sticky top-0 z-10"
      style={{ height: itemHeight }}
    >
      {columns.map((column, index) => (
        <div
          key={column.key}
          className="flex items-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
          style={{ 
            width: column.width || `${100 / columns.length}%`,
            minWidth: column.minWidth || '100px'
          }}
        >
          {column.title}
        </div>
      ))}
    </div>
  ), [columns, itemHeight]);

  // 행 렌더링
  const Row = useCallback(({ index, style }) => {
    const row = data[index];
    const isEven = index % 2 === 0;

    return (
      <div
        style={style}
        className={`flex border-b border-gray-200 cursor-pointer transition-colors hover:bg-gray-50 ${
          striped && !isEven ? 'bg-gray-25' : 'bg-white'
        }`}
        onClick={() => onRowClick?.(row, index)}
      >
        {columns.map((column) => (
          <div
            key={column.key}
            className="flex items-center px-6 py-3 text-sm text-gray-900"
            style={{ 
              width: column.width || `${100 / columns.length}%`,
              minWidth: column.minWidth || '100px'
            }}
          >
            {column.render 
              ? column.render(row[column.key], row, index)
              : row[column.key] || '-'
            }
          </div>
        ))}
      </div>
    );
  }, [data, columns, onRowClick, striped]);

  // 로딩 상태
  if (loading) {
    return (
      <div 
        className="flex items-center justify-center bg-white rounded-lg shadow-sm border border-gray-200"
        style={{ height }}
      >
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          <span className="text-gray-600">로딩 중...</span>
        </div>
      </div>
    );
  }

  // 빈 데이터 상태
  if (data.length === 0) {
    return (
      <div 
        className="flex items-center justify-center bg-white rounded-lg shadow-sm border border-gray-200"
        style={{ height }}
      >
        <div className="text-center">
          <svg 
            className="mx-auto h-12 w-12 text-gray-300" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={1.5} 
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
            />
          </svg>
          <p className="mt-4 text-gray-500">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* 헤더 */}
      {renderHeader()}
      
      {/* 가상화된 리스트 */}
      <List
        height={height - itemHeight} // 헤더 높이 제외
        itemCount={data.length}
        itemSize={itemHeight}
        itemData={data}
        width="100%"
      >
        {Row}
      </List>

      {/* 푸터 정보 */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-700">
            총 <span className="font-medium">{data.length.toLocaleString()}</span>개 항목
          </div>
          <div className="text-xs text-gray-500">
            가상화로 성능 최적화됨
          </div>
        </div>
      </div>
    </div>
  );
};

// 무한 스크롤이 가능한 가상화 테이블
export const InfiniteVirtualizedTable = ({
  data = [],
  columns = [],
  hasNextPage = false,
  isNextPageLoading = false,
  loadNextPage,
  height = 600,
  itemHeight = 60,
  ...props
}) => {
  const itemCount = hasNextPage ? data.length + 1 : data.length;

  const isItemLoaded = useCallback(
    (index) => !!data[index],
    [data]
  );

  const Item = useCallback(({ index, style }) => {
    let content;

    if (!isItemLoaded(index)) {
      content = (
        <div 
          style={style}
          className="flex items-center justify-center bg-white border-b border-gray-200"
        >
          <div className="flex items-center space-x-2 text-gray-500">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500"></div>
            <span className="text-sm">로딩 중...</span>
          </div>
        </div>
      );
    } else {
      const row = data[index];
      const isEven = index % 2 === 0;

      content = (
        <div
          style={style}
          className={`flex border-b border-gray-200 cursor-pointer transition-colors hover:bg-gray-50 ${
            !isEven ? 'bg-gray-25' : 'bg-white'
          }`}
          onClick={() => props.onRowClick?.(row, index)}
        >
          {columns.map((column) => (
            <div
              key={column.key}
              className="flex items-center px-6 py-3 text-sm text-gray-900"
              style={{ 
                width: column.width || `${100 / columns.length}%`,
                minWidth: column.minWidth || '100px'
              }}
            >
              {column.render 
                ? column.render(row[column.key], row, index)
                : row[column.key] || '-'
              }
            </div>
          ))}
        </div>
      );
    }

    return content;
  }, [data, columns, isItemLoaded, props.onRowClick]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* 헤더 */}
      <div 
        className="flex bg-gray-50 border-b border-gray-200 sticky top-0 z-10"
        style={{ height: itemHeight }}
      >
        {columns.map((column) => (
          <div
            key={column.key}
            className="flex items-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
            style={{ 
              width: column.width || `${100 / columns.length}%`,
              minWidth: column.minWidth || '100px'
            }}
          >
            {column.title}
          </div>
        ))}
      </div>
      
      {/* 무한 스크롤 리스트 */}
      <List
        height={height - itemHeight}
        itemCount={itemCount}
        itemSize={itemHeight}
        onItemsRendered={({ visibleStopIndex }) => {
          if (!hasNextPage || isNextPageLoading) return;
          
          // 끝에서 5개 항목 전에 다음 페이지 로드
          if (visibleStopIndex >= data.length - 5) {
            loadNextPage?.();
          }
        }}
      >
        {Item}
      </List>

      {/* 푸터 정보 */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-700">
            {data.length.toLocaleString()}개 항목 표시됨 
            {hasNextPage && ' (더 많은 데이터 로딩 가능)'}
          </div>
          <div className="text-xs text-gray-500">
            무한 스크롤 + 가상화
          </div>
        </div>
      </div>
    </div>
  );
};

export default VirtualizedTable;