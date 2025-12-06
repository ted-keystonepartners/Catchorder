/**
 * 인증 관련 커스텀 훅
 */
import { useAuthStore, useIsAdmin, useIsGeneral, useHasRole } from '../context/authStore.js';
import { ROLE } from '../utils/constants.js';

/**
 * @typedef {import('../types/api.js').User} User
 */

/**
 * 인증 훅 반환값
 * @typedef {Object} AuthHookReturn
 * @property {User|null} user - 현재 로그인한 사용자
 * @property {string|null} token - 인증 토큰
 * @property {boolean} isAuthenticated - 인증 여부
 * @property {boolean} isLoading - 로딩 상태
 * @property {string|null} error - 에러 메시지
 * @property {Function} login - 로그인 함수
 * @property {Function} logout - 로그아웃 함수
 * @property {Function} clearError - 에러 초기화
 * @property {Function} isAdmin - 관리자 여부 확인
 * @property {Function} isGeneral - 일반 사용자 여부 확인
 * @property {Function} hasRole - 권한 확인
 */

/**
 * 인증 관련 훅
 * @returns {AuthHookReturn} 인증 상태 및 액션들
 */
export const useAuth = () => {
  const {
    user,
    token,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    clearError,
    setUser,
    restoreSession,
    refreshUser
  } = useAuthStore();

  /**
   * 현재 사용자가 관리자인지 확인
   * @returns {boolean}
   */
  const isAdmin = () => {
    return user?.role === ROLE.ADMIN.code;
  };

  /**
   * 현재 사용자가 일반 사용자인지 확인
   * @returns {boolean}
   */
  const isGeneral = () => {
    return user?.role === ROLE.GENERAL.code;
  };

  /**
   * 특정 권한을 가지고 있는지 확인
   * @param {string|Array<string>} requiredRoles - 필요한 권한(들)
   * @returns {boolean}
   */
  const hasRole = (requiredRoles) => {
    if (!user) return false;
    
    if (Array.isArray(requiredRoles)) {
      return requiredRoles.includes(user.role);
    }
    
    return user.role === requiredRoles;
  };

  /**
   * 사용자 이름 표시용 함수
   * @returns {string}
   */
  const getDisplayName = () => {
    if (!user) return '';
    return user.name || user.email || 'Unknown User';
  };

  /**
   * 사용자 권한 표시용 함수
   * @returns {string}
   */
  const getRoleLabel = () => {
    if (!user) return '';
    
    switch (user.role) {
      case ROLE.ADMIN.code:
        return ROLE.ADMIN.label;
      case ROLE.GENERAL.code:
        return ROLE.GENERAL.label;
      default:
        return user.role;
    }
  };

  /**
   * 로그인 상태 확인 (토큰과 사용자 정보 모두 있어야 함)
   * @returns {boolean}
   */
  const isLoggedIn = () => {
    return isAuthenticated && !!user && !!token;
  };

  /**
   * 세션 만료 확인
   * @returns {boolean}
   */
  const isSessionExpired = () => {
    if (!token) return true;
    
    try {
      const decoded = JSON.parse(atob(token));
      return decoded.exp < Date.now();
    } catch {
      return true;
    }
  };

  /**
   * 마지막 로그인 시간 포맷
   * @returns {string}
   */
  const getLastLoginFormatted = () => {
    if (!user?.lastLoginAt) return '';
    
    try {
      const date = new Date(user.lastLoginAt);
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  /**
   * 로그인 처리 (에러 처리 포함)
   * @param {string} email - 이메일
   * @param {string} password - 비밀번호
   * @returns {Promise<boolean>}
   */
  const handleLogin = async (email, password) => {
    try {
      const success = await login(email, password);
      return success;
    } catch (err) {
      console.error('Login handling error:', err);
      return false;
    }
  };

  /**
   * 로그아웃 처리 (에러 처리 포함)
   * @returns {Promise<boolean>}
   */
  const handleLogout = async () => {
    try {
      await logout();
      return true;
    } catch (err) {
      console.error('Logout handling error:', err);
      return false;
    }
  };

  /**
   * 세션 복원 처리
   * @returns {Promise<boolean>}
   */
  const handleRestoreSession = async () => {
    try {
      const success = await restoreSession();
      return success;
    } catch (err) {
      console.error('Session restore handling error:', err);
      return false;
    }
  };

  /**
   * 권한 기반 컴포넌트 렌더링 헬퍼
   * @param {string|Array<string>} requiredRoles - 필요한 권한
   * @param {React.ReactNode} component - 렌더링할 컴포넌트
   * @param {React.ReactNode} fallback - 권한이 없을 때 렌더링할 컴포넌트
   * @returns {React.ReactNode}
   */
  const renderWithPermission = (requiredRoles, component, fallback = null) => {
    if (hasRole(requiredRoles)) {
      return component;
    }
    return fallback;
  };

  return {
    // 상태
    user,
    token,
    isAuthenticated,
    isLoading,
    error,

    // 기본 액션
    login: handleLogin,
    logout: handleLogout,
    clearError,
    setUser,
    restoreSession: handleRestoreSession,
    refreshUser,

    // 권한 체크
    isAdmin,
    isGeneral,
    hasRole,

    // 유틸리티
    getDisplayName,
    getRoleLabel,
    isLoggedIn,
    isSessionExpired,
    getLastLoginFormatted,
    renderWithPermission,

    // Hook으로 권한 체크 (컴포넌트에서 사용)
    useIsAdmin: () => useIsAdmin(),
    useIsGeneral: () => useIsGeneral(),
    useHasRole: (roles) => useHasRole(roles)
  };
};