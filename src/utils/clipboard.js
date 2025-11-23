/**
 * 클립보드 유틸리티 함수
 */

/**
 * 텍스트를 클립보드에 복사
 * @param {string} text - 복사할 텍스트
 * @returns {Promise<boolean>} 성공 여부
 */
export const copyToClipboard = async (text) => {
  try {
    // 최신 브라우저 Clipboard API 사용
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    
    // 폴백: 구형 브라우저 지원
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'absolute';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch (err) {
      document.body.removeChild(textArea);
      return false;
    }
  } catch (err) {
    console.error('클립보드 복사 실패:', err);
    return false;
  }
};

/**
 * 클립보드에서 텍스트 읽기
 * @returns {Promise<string|null>} 클립보드 텍스트 또는 null
 */
export const readFromClipboard = async () => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      return await navigator.clipboard.readText();
    }
    return null;
  } catch (err) {
    console.error('클립보드 읽기 실패:', err);
    return null;
  }
};

/**
 * 클립보드 지원 여부 확인
 * @returns {boolean} 지원 여부
 */
export const isClipboardSupported = () => {
  return !!(navigator.clipboard || document.queryCommandSupported?.('copy'));
};