/**
 * UI 관련 Zustand 스토어
 */
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { NOTIFICATION_TYPES } from '../utils/constants.js';

/**
 * UI 스토어 인터페이스
 * @typedef {Object} UIStore
 * @property {string|null} activeModal - 현재 활성화된 모달 이름
 * @property {Object|null} modalData - 모달에 전달할 데이터
 * @property {boolean} sidebarOpen - 사이드바 열림 상태
 * @property {Object|null} notification - 알림 메시지
 * @property {boolean} isMobile - 모바일 화면 여부
 * @property {Object} theme - 테마 설정
 * @property {Function} openModal - 모달 열기
 * @property {Function} closeModal - 모달 닫기
 * @property {Function} toggleSidebar - 사이드바 토글
 * @property {Function} showNotification - 알림 표시
 * @property {Function} hideNotification - 알림 숨기기
 */

/**
 * UI 스토어 생성
 */
export const useUIStore = create(
  devtools(
    (set, get) => ({
      // 상태
      activeModal: null,
      modalData: null,
      sidebarOpen: true,
      notification: null,
      isMobile: false,
      theme: {
        mode: 'light',
        primaryColor: 'blue',
        fontSize: 'normal'
      },
      loading: {
        global: false,
        components: {} // 컴포넌트별 로딩 상태
      },

      // 모달 관련 액션
      /**
       * 모달 열기
       * @param {string} modalName - 모달 이름
       * @param {Object} data - 모달에 전달할 데이터
       */
      openModal: (modalName, data = null) => {
        set({
          activeModal: modalName,
          modalData: data
        });
      },

      /**
       * 모달 닫기
       */
      closeModal: () => {
        set({
          activeModal: null,
          modalData: null
        });
      },

      /**
       * 모달 데이터 업데이트
       * @param {Object} data - 업데이트할 데이터
       */
      updateModalData: (data) => {
        set(state => ({
          modalData: { ...state.modalData, ...data }
        }));
      },

      // 사이드바 관련 액션
      /**
       * 사이드바 토글
       */
      toggleSidebar: () => {
        set(state => ({
          sidebarOpen: !state.sidebarOpen
        }));
      },

      /**
       * 사이드바 열기
       */
      openSidebar: () => {
        set({ sidebarOpen: true });
      },

      /**
       * 사이드바 닫기
       */
      closeSidebar: () => {
        set({ sidebarOpen: false });
      },

      // 알림 관련 액션
      /**
       * 알림 표시
       * @param {string} type - 알림 타입 (success, error, warning, info)
       * @param {string} message - 알림 메시지
       * @param {number} duration - 표시 시간 (밀리초, 기본 5초)
       * @param {Object} options - 추가 옵션
       */
      showNotification: (type, message, duration = 5000, options = {}) => {
        const notification = {
          id: Date.now() + Math.random(),
          type,
          message,
          duration,
          createdAt: new Date().toISOString(),
          ...options
        };

        set({ notification });

        // 자동 숨기기 (duration이 0이면 자동 숨기기 하지 않음)
        if (duration > 0) {
          setTimeout(() => {
            const current = get().notification;
            if (current && current.id === notification.id) {
              get().hideNotification();
            }
          }, duration);
        }
      },

      /**
       * 성공 알림 표시
       * @param {string} message - 알림 메시지
       * @param {number} duration - 표시 시간
       */
      showSuccess: (message, duration = 3000) => {
        get().showNotification(NOTIFICATION_TYPES.SUCCESS.type, message, duration);
      },

      /**
       * 에러 알림 표시
       * @param {string} message - 알림 메시지
       * @param {number} duration - 표시 시간
       */
      showError: (message, duration = 5000) => {
        get().showNotification(NOTIFICATION_TYPES.ERROR.type, message, duration);
      },

      /**
       * 경고 알림 표시
       * @param {string} message - 알림 메시지
       * @param {number} duration - 표시 시간
       */
      showWarning: (message, duration = 4000) => {
        get().showNotification(NOTIFICATION_TYPES.WARNING.type, message, duration);
      },

      /**
       * 정보 알림 표시
       * @param {string} message - 알림 메시지
       * @param {number} duration - 표시 시간
       */
      showInfo: (message, duration = 3000) => {
        get().showNotification(NOTIFICATION_TYPES.INFO.type, message, duration);
      },

      /**
       * 알림 숨기기
       */
      hideNotification: () => {
        set({ notification: null });
      },

      // 화면 크기 관련 액션
      /**
       * 모바일 화면 여부 설정
       * @param {boolean} isMobile - 모바일 여부
       */
      setIsMobile: (isMobile) => {
        set({ isMobile });
      },

      // 테마 관련 액션
      /**
       * 테마 모드 변경 (light/dark)
       * @param {string} mode - 테마 모드
       */
      setThemeMode: (mode) => {
        set(state => ({
          theme: { ...state.theme, mode }
        }));
      },

      /**
       * 주요 색상 변경
       * @param {string} color - 색상명
       */
      setPrimaryColor: (color) => {
        set(state => ({
          theme: { ...state.theme, primaryColor: color }
        }));
      },

      /**
       * 폰트 크기 변경
       * @param {string} size - 폰트 크기 (small, normal, large)
       */
      setFontSize: (size) => {
        set(state => ({
          theme: { ...state.theme, fontSize: size }
        }));
      },

      // 로딩 관련 액션
      /**
       * 전역 로딩 상태 설정
       * @param {boolean} isLoading - 로딩 여부
       */
      setGlobalLoading: (isLoading) => {
        set(state => ({
          loading: { ...state.loading, global: isLoading }
        }));
      },

      /**
       * 컴포넌트별 로딩 상태 설정
       * @param {string} componentName - 컴포넌트 이름
       * @param {boolean} isLoading - 로딩 여부
       */
      setComponentLoading: (componentName, isLoading) => {
        set(state => ({
          loading: {
            ...state.loading,
            components: {
              ...state.loading.components,
              [componentName]: isLoading
            }
          }
        }));
      },

      /**
       * 특정 컴포넌트 로딩 상태 조회
       * @param {string} componentName - 컴포넌트 이름
       * @returns {boolean} 로딩 여부
       */
      getComponentLoading: (componentName) => {
        const state = get();
        return state.loading.components[componentName] || false;
      },

      // 기타 유틸리티 액션
      /**
       * 확인 다이얼로그 표시
       * @param {string} message - 확인 메시지
       * @param {Function} onConfirm - 확인 콜백
       * @param {Function} onCancel - 취소 콜백
       * @param {Object} options - 추가 옵션
       */
      showConfirmDialog: (message, onConfirm, onCancel = null, options = {}) => {
        get().openModal('confirm', {
          message,
          onConfirm,
          onCancel,
          ...options
        });
      },

      /**
       * 입력 다이얼로그 표시
       * @param {string} title - 제목
       * @param {string} placeholder - 입력 힌트
       * @param {Function} onSubmit - 제출 콜백
       * @param {Function} onCancel - 취소 콜백
       * @param {Object} options - 추가 옵션
       */
      showInputDialog: (title, placeholder, onSubmit, onCancel = null, options = {}) => {
        get().openModal('input', {
          title,
          placeholder,
          onSubmit,
          onCancel,
          ...options
        });
      },

      /**
       * 브레드크럼 설정
       * @param {Array} breadcrumbs - 브레드크럼 항목들
       */
      setBreadcrumbs: (breadcrumbs) => {
        set({ breadcrumbs });
      },

      /**
       * 페이지 제목 설정
       * @param {string} title - 페이지 제목
       */
      setPageTitle: (title) => {
        set({ pageTitle: title });
        // 브라우저 탭 제목도 업데이트
        if (typeof window !== 'undefined') {
          document.title = title ? `${title} - 캐치오더 SMS` : '캐치오더 SMS';
        }
      },

      /**
       * 전체 UI 상태 초기화
       */
      reset: () => {
        set({
          activeModal: null,
          modalData: null,
          notification: null,
          loading: {
            global: false,
            components: {}
          }
        });
      }
    }),
    {
      name: 'ui-store' // devtools에서 표시될 이름
    }
  )
);