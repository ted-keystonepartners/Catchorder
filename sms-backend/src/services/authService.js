/**
 * 인증 서비스
 */
import { db } from '../db/database.js';
import { comparePassword, hashPassword } from '../utils/password.js';
import { generateToken, verifyToken } from '../utils/jwt.js';
import { validateEmail, validatePassword } from '../utils/validator.js';
import { ERROR_CODES } from '../utils/constants.js';

export const authService = {
  /**
   * 사용자 로그인
   */
  async login(email, password) {
    try {
      // 이메일 형식 검증
      if (!validateEmail(email)) {
        throw {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: '올바른 이메일 형식이 아닙니다',
          statusCode: 400
        };
      }

      // 사용자 조회
      const user = await db.users.findByEmail(email);
      if (!user) {
        throw {
          code: ERROR_CODES.INVALID_CREDENTIALS,
          message: '이메일 또는 비밀번호가 올바르지 않습니다',
          statusCode: 401
        };
      }

      // 비밀번호 검증
      const isPasswordValid = await comparePassword(password, user.password_hash);
      if (!isPasswordValid) {
        throw {
          code: ERROR_CODES.INVALID_CREDENTIALS,
          message: '이메일 또는 비밀번호가 올바르지 않습니다',
          statusCode: 401
        };
      }

      // JWT 토큰 생성
      const token = generateToken(user);

      // 사용자 정보 (비밀번호 제외)
      const { password_hash, ...userInfo } = user;

      return {
        user: userInfo,
        token
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * 토큰 유효성 검증
   */
  async validateToken(token) {
    try {
      const decoded = verifyToken(token);
      const user = await db.users.findById(decoded.userId);
      
      if (!user) {
        throw {
          code: ERROR_CODES.USER_NOT_FOUND,
          message: '사용자를 찾을 수 없습니다',
          statusCode: 401
        };
      }

      const { password_hash, ...userInfo } = user;
      return userInfo;
    } catch (error) {
      throw error;
    }
  },

  /**
   * 사용자 생성 (ADMIN만 가능)
   */
  async createUser(email, password, role, name) {
    try {
      // 이메일 형식 검증
      if (!validateEmail(email)) {
        throw {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: '올바른 이메일 형식이 아닙니다',
          statusCode: 400
        };
      }

      // 비밀번호 검증
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        throw {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: passwordValidation.message,
          statusCode: 400
        };
      }

      // 기존 사용자 확인
      const existingUser = await db.users.findByEmail(email);
      if (existingUser) {
        throw {
          code: ERROR_CODES.USER_ALREADY_EXISTS,
          message: '이미 존재하는 이메일입니다',
          statusCode: 409
        };
      }

      // 비밀번호 해싱
      const password_hash = await hashPassword(password);

      // 사용자 생성
      const userData = {
        email,
        password_hash,
        role: role || 'GENERAL',
        name: name || email.split('@')[0]
      };

      const user = await db.users.create(userData);
      const { password_hash: _, ...userInfo } = user;

      return userInfo;
    } catch (error) {
      throw error;
    }
  },

  /**
   * 모든 사용자 조회 (ADMIN만 가능)
   */
  async getAllUsers() {
    try {
      const users = await db.users.getAll();
      return users.map(user => {
        const { password_hash, ...userInfo } = user;
        return userInfo;
      });
    } catch (error) {
      throw error;
    }
  }
};