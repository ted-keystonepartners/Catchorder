/**
 * 통합 테이블 컴포넌트 - Tailwind CSS 기반
 */
import React, { useState, useMemo } from 'react';

/**
 * 테이블 컴포넌트
 * @param {Object} props
 * @param {Array} props.data - 테이블 데이터
 * @param {Array} props.columns - 컬럼 정의
 * @param {boolean} props.loading - 로딩 상태
 * @param {boolean} props.striped - 줄무늬 스타일
 * @param {boolean} props.hover - 호버 효과
 * @param {boolean} props.sortable - 정렬 가능
 * @param {Function} props.onRowClick - 행 클릭 핸들러
 * @param {string} props.emptyMessage - 빈 데이터 메시지
 * @param {Object} props.pagination - 페이지네이션 설정
 * @param {string} props.className - 추가 CSS 클래스
 */
const Table = ({
  data = [],
  columns = [],
  loading = false,
  striped = true,
  hover = true,
  sortable = true,
  onRowClick,
  emptyMessage = '데이터가 없습니다',
  pagination,
  className = ''
}) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // 데이터 정렬
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [data, sortConfig]);

  // 정렬 핸들러
  const handleSort = (key) => {
    if (!sortable) return;

    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // 정렬 아이콘
  const SortIcon = ({ column }) => {
    if (!sortable || !column.sortable) return null;

    const isActive = sortConfig.key === column.key;
    const isAsc = isActive && sortConfig.direction === 'asc';
    const isDesc = isActive && sortConfig.direction === 'desc';

    return (
      <span className="ml-2 inline-flex flex-col">
        <svg
          className={`w-3 h-3 ${isAsc ? 'text-orange-500' : 'text-gray-300'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M5 12l5-5 5 5H5z" />
        </svg>
        <svg
          className={`w-3 h-3 -mt-1 ${isDesc ? 'text-orange-500' : 'text-gray-300'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M15 8l-5 5-5-5h10z" />
        </svg>
      </span>
    );
  };

  // 로딩 스피너
  const LoadingSpinner = () => (
    <div className="flex justify-center items-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      <span className="ml-3 text-gray-600">로딩 중...</span>
    </div>
  );

  // 빈 상태
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-12">
      <svg 
        className="w-12 h-12 text-gray-300 mb-4" 
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
      <p className="text-gray-500 text-center">{emptyMessage}</p>
    </div>
  );

  const tableClasses = [
    'min-w-full divide-y divide-gray-200',
    'bg-white shadow-sm rounded-lg overflow-hidden',
    className
  ].join(' ');

  const theadClasses = 'bg-gray-50';
  
  const thClasses = [
    'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
    sortable ? 'cursor-pointer hover:bg-gray-100 select-none' : ''
  ].join(' ');

  const tbodyClasses = 'bg-white divide-y divide-gray-200';

  const getTrClasses = (index) => [
    striped && index % 2 === 1 ? 'bg-gray-50' : '',
    hover ? 'hover:bg-gray-100' : '',
    onRowClick ? 'cursor-pointer' : '',
    'transition-colors duration-150'
  ].join(' ');

  const tdClasses = 'px-6 py-4 whitespace-nowrap text-sm text-gray-900';

  return (
    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
      <div className="overflow-x-auto">
        <table className={tableClasses}>
          {/* Header */}
          <thead className={theadClasses}>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={thClasses}
                  onClick={() => handleSort(column.key)}
                  style={{ width: column.width }}
                >
                  <div className="flex items-center">
                    {column.title}
                    <SortIcon column={column} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody className={tbodyClasses}>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-4">
                  <LoadingSpinner />
                </td>
              </tr>
            ) : sortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-4">
                  <EmptyState />
                </td>
              </tr>
            ) : (
              sortedData.map((row, index) => (
                <tr
                  key={row.id || index}
                  className={getTrClasses(index)}
                  onClick={() => onRowClick?.(row, index)}
                >
                  {columns.map((column) => (
                    <td key={column.key} className={tdClasses}>
                      {column.render
                        ? column.render(row[column.key], row, index)
                        : row[column.key]
                      }
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => pagination.onPageChange(pagination.current - 1)}
              disabled={pagination.current <= 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              이전
            </button>
            <button
              onClick={() => pagination.onPageChange(pagination.current + 1)}
              disabled={pagination.current >= pagination.total}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              다음
            </button>
          </div>
          
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                총 <span className="font-medium">{pagination.total}</span>개 중{' '}
                <span className="font-medium">{(pagination.current - 1) * pagination.pageSize + 1}</span> -{' '}
                <span className="font-medium">
                  {Math.min(pagination.current * pagination.pageSize, pagination.total)}
                </span>
                개 표시
              </p>
            </div>
            
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => pagination.onPageChange(pagination.current - 1)}
                  disabled={pagination.current <= 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {/* 페이지 번호들 */}
                {Array.from({ length: Math.min(5, pagination.total) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => pagination.onPageChange(pageNum)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        pageNum === pagination.current
                          ? 'z-10 bg-orange-50 border-orange-500 text-orange-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => pagination.onPageChange(pagination.current + 1)}
                  disabled={pagination.current >= pagination.total}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Table;