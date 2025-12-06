/**
 * JWT 생성/검증 유틸리티
 */
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-12345';
const JWT_EXPIRY = process.env.JWT_EXPIRY || 3600000; // 1시간

export const generateToken = (user) => {
  const payload = {
    userId: user.userId,
    email: user.email,
    role: user.role,
    name: user.name
  };

  const options = {
    expiresIn: parseInt(JWT_EXPIRY) / 1000 // ms를 seconds로 변환
  };

  return jwt.sign(payload, JWT_SECRET, options);
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      const newError = new Error('토큰이 만료되었습니다');
      newError.name = 'TokenExpiredError';
      throw newError;
    } else if (error.name === 'JsonWebTokenError') {
      const newError = new Error('유효하지 않은 토큰입니다');
      newError.name = 'JsonWebTokenError';
      throw newError;
    } else {
      throw error;
    }
  }
};

export const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
};