/**
 * 인증 관련 Zustand 스토어 (AWS 연동)
 */
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// 개발/프로덕션 모두 Lambda URL 사용
const API_BASE = import.meta.env.VITE_API_BASE || 'https://l0dtib1m19.execute-api.ap-northeast-2.amazonaws.com/dev';

export const useAuthStore = create(
  devtools(
    (set, get) => ({
      // 상태 (sessionStorage와 메모리에 저장)
      user: typeof window !== 'undefined' ? JSON.parse(sessionStorage.getItem('catchorder_user') || 'null') : null,
      token: typeof window !== 'undefined' ? sessionStorage.getItem('catchorder_token') : null,
      isAuthenticated: typeof window !== 'undefined' ? !!sessionStorage.getItem('catchorder_token') : false,
      isLoading: false,
      isRestoring: false,
      isValidating: false,
      error: null,

      // 액션
      login: async (email, password) => {
        set({ isLoading: true, error: null });

        try {
          
          const response = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error?.message || data.message || '로그인에 실패했습니다.');
          }

          if (data.success && data.data) {
            
            // sessionStorage에 저장
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('catchorder_token', data.data.token);
              sessionStorage.setItem('catchorder_user', JSON.stringify(data.data.user));
            }
            
            set({
              user: data.data.user,
              token: data.data.token,
              isAuthenticated: true,
              isLoading: false,
              error: null
            });
            return true;
          } else if (data.token && data.user) {
            // 백엔드가 직접 토큰과 유저를 반환하는 경우
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('catchorder_token', data.token);
              sessionStorage.setItem('catchorder_user', JSON.stringify(data.user));
            }
            
            set({
              user: data.user,
              token: data.token,
              isAuthenticated: true,
              isLoading: false,
              error: null
            });
            return true;
          } else {
            throw new Error('로그인 응답이 올바르지 않습니다.');
          }
        } catch (error) {
          console.error('Login error in store:', error);
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: error.message || '로그인 중 오류가 발생했습니다.'
          });
          return false;
        }
      },

      logout: () => {
        // sessionStorage 클리어
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('catchorder_token');
          sessionStorage.removeItem('catchorder_user');
        }
        
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          isValidating: false,
          error: null
        });
      },

      clearError: () => {
        set({ error: null });
      },

      setUser: (user) => {
        set({ user });
      },

      // 세션 복원 - 즉시 인증 + 백그라운드 검증
      restoreSession: async () => {
        const { isRestoring } = get();
        
        // 이미 복원 중이면 중복 실행 방지
        if (isRestoring) {
          return true;
        }

        set({ isRestoring: true, error: null });

        try {
          // 1단계: sessionStorage에서 토큰과 사용자 정보 읽기
          let token = null;
          let savedUser = null;

          if (typeof window !== 'undefined') {
            token = sessionStorage.getItem('catchorder_token');
            const savedUserStr = sessionStorage.getItem('catchorder_user');
            savedUser = savedUserStr ? JSON.parse(savedUserStr) : null;
          }


          // 2단계: 토큰과 사용자 정보가 모두 있으면 즉시 인증 상태로 설정
          if (token && savedUser) {
            
            set({
              user: savedUser,
              token: token,
              isAuthenticated: true,
              isLoading: false,
              isRestoring: false,
              error: null
            });

            // 3단계: 백그라운드에서 토큰 검증 (사용자 경험에 영향 없음)
            get().validateTokenInBackground(token, savedUser);
            
            return true;
          } else {
            
            // sessionStorage 클리어
            if (typeof window !== 'undefined') {
              sessionStorage.removeItem('catchorder_token');
              sessionStorage.removeItem('catchorder_user');
            }
            
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
              isRestoring: false,
              error: null
            });
            return false;
          }
        } catch (error) {
          console.error('세션 복원 중 예외:', error);
          
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            isRestoring: false,
            error: null
          });
          return false;
        }
      },

      // 백그라운드 토큰 검증 (사용자 경험에 영향 없음)
      validateTokenInBackground: async (token, currentUser) => {
        const { isValidating } = get();
        
        // 이미 검증 중이면 중복 실행 방지
        if (isValidating) {
          return;
        }
        
        set({ isValidating: true });
        
        try {
          const response = await fetch(`${API_BASE}/api/auth/me`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          const data = await response.json();

          if (response.ok) {
            if (data && (data.id || data.user?.id)) {
              
              // 실제 사용자 데이터 추출
              const userData = data.id ? data : data.user;
              
              // 사용자 정보가 변경되었다면 업데이트
              const { user: currentStateUser } = get();
              if (JSON.stringify(currentStateUser) !== JSON.stringify(userData)) {
                set({ user: userData });
                
                // sessionStorage도 업데이트
                if (typeof window !== 'undefined') {
                  sessionStorage.setItem('catchorder_user', JSON.stringify(userData));
                }
              }
            }
          } else if (response.status === 401) {
            // 401 Unauthorized - 토큰이 실제로 만료됨
            
            // sessionStorage 클리어
            if (typeof window !== 'undefined') {
              sessionStorage.removeItem('catchorder_token');
              sessionStorage.removeItem('catchorder_user');
            }
            
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
              isValidating: false,
              error: '세션이 만료되었습니다.'
            });
          }
        } catch (error) {
          // 네트워크 오류는 무시 (로그인 상태 유지)
        } finally {
          // 검증 완료
          set({ isValidating: false });
        }
      },

      refreshUser: async () => {
        const { token } = get();
        
        if (!token) {
          return false;
        }

        set({ isLoading: true });

        try {
          const response = await fetch(`${API_BASE}/api/auth/me`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          const data = await response.json();

          if (response.ok && data.id) {
            set({
              user: data,
              isLoading: false,
              error: null
            });
            return true;
          } else {
            set({
              isLoading: false,
              error: data.message || '사용자 정보 새로고침 실패'
            });
            return false;
          }
        } catch (error) {
          console.error('Refresh user error:', error);
          set({
            isLoading: false,
            error: '사용자 정보 새로고침 중 오류가 발생했습니다.'
          });
          return false;
        }
      }
    }),
    {
      name: 'auth-store'
    }
  )
);

// 권한 체크 헬퍼 함수들
export const useIsAdmin = () => {
  const user = useAuthStore(state => state.user);
  return user?.role === 'ADMIN';
};

export const useIsManager = () => {
  const user = useAuthStore(state => state.user);
  return user?.role === 'MANAGER';
};

export const useIsGeneral = () => {
  const user = useAuthStore(state => state.user);
  return user?.role === 'GENERAL';
};

export const useHasRole = (requiredRoles) => {
  const user = useAuthStore(state => state.user);
  
  if (!user) return false;
  
  if (Array.isArray(requiredRoles)) {
    return requiredRoles.includes(user.role);
  }
  
  return user.role === requiredRoles;
};