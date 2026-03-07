import { useState, useEffect } from 'react';
import { getReportContents, saveReportContent } from '../api/reportsApi.js';

/**
 * 보고내용 관리 커스텀 훅
 * @param {string} sectionId - 섹션 ID (kpi_summary, active_store_trend, cohort_forecast, funnel)
 * @returns {Object} - 보고내용 상태 및 함수들
 */
export function useReportContent(sectionId) {
  // 현재 월 계산 (YYYY-MM 형식)
  const getCurrentMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  const [currentMonth] = useState(getCurrentMonth());
  const [showReport, setShowReport] = useState(false);
  const [content, setContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  // 보고내용 로드
  useEffect(() => {
    const loadContent = async () => {
      setLoading(true);
      try {
        const response = await getReportContents(currentMonth);
        if (response.success && response.data) {
          // 해당 섹션의 보고내용 찾기
          const sectionContent = response.data.find(
            item => item.section_id === sectionId
          );
          if (sectionContent) {
            setContent(sectionContent.content || '');
            setShowReport(true);
          }
        }
      } catch (err) {
        console.error('보고내용 로드 실패:', err);
      } finally {
        setLoading(false);
      }
    };

    if (sectionId) {
      loadContent();
    }
  }, [sectionId, currentMonth]);

  // 보고내용 저장
  const save = async () => {
    if (!content.trim()) {
      alert('내용을 입력해주세요.');
      return false;
    }

    try {
      const response = await saveReportContent(sectionId, currentMonth, content);
      if (response.success) {
        setIsEditing(false);
        return true;
      } else {
        alert('저장에 실패했습니다: ' + (response.error || '알 수 없는 오류'));
        return false;
      }
    } catch (err) {
      console.error('보고내용 저장 실패:', err);
      alert('저장에 실패했습니다.');
      return false;
    }
  };

  return {
    showReport,
    setShowReport,
    content,
    setContent,
    isEditing,
    setIsEditing,
    save,
    loading,
    currentMonth
  };
}
