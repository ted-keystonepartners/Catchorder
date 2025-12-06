import React from 'react';

/**
 * Table 컴포넌트
 * @param {Object} props
 * @param {Array} props.columns - 컬럼 정의 [{key, label, sortable, render}]
 * @param {Array} props.data - 테이블 데이터
 * @param {Function} props.onRowClick - 행 클릭 핸들러
 * @param {Function} props.onSort - 정렬 핸들러
 * @param {Object} props.sortConfig - 정렬 설정 {field, order}
 * @param {boolean} props.loading - 로딩 상태
 * @param {string} props.emptyMessage - 빈 데이터 메시지
 * @param {string} props.className - 추가 CSS 클래스
 */
const Table = ({
  columns = [],
  data = [],
  onRowClick,
  onSort,
  sortConfig,
  loading = false,
  emptyMessage = '데이터가 없습니다.',
  className = ''
}) => {
  const handleSort = (column) => {
    if (!column.sortable || !onSort) return;
    onSort(column.key);
  };

  const getSortIcon = (column) => {
    if (!column.sortable) return null;
    
    const isActive = sortConfig?.field === column.key;
    const isAsc = isActive && sortConfig?.order === 'asc';
    const isDesc = isActive && sortConfig?.order === 'desc';

    return (
      <span className="ml-1 inline-flex flex-col">
        <svg
          className={`h-3 w-3 ${isAsc ? 'text-gray-900' : 'text-gray-400'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" />
        </svg>
        <svg
          className={`h-3 w-3 -mt-1 ${isDesc ? 'text-gray-900' : 'text-gray-400'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
        </svg>
      </span>
    );
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-12 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full mx-auto" />
          <p className="mt-2 text-sm text-gray-500">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white shadow rounded-lg overflow-hidden ${className}`}>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                onClick={() => handleSort(column)}
                className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                  column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                }`}
              >
                <div className="flex items-center">
                  {column.label}
                  {getSortIcon(column)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-6 py-12 text-center text-sm text-gray-500"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr
                key={row.id || rowIndex}
                onClick={() => onRowClick && onRowClick(row)}
                className={`${
                  onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''
                } transition-colors duration-150`}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                  >
                    {column.render
                      ? column.render(row[column.key], row)
                      : row[column.key] || '-'}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Table;