/**
 * 업로드 라우트
 */
import express from 'express';
import multer from 'multer';
import { fileService } from '../services/fileService.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/roleCheck.js';
import { successResponse, errorResponse } from '../utils/response.js';

const router = express.Router();

// Multer 설정 (메모리 스토리지)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB 제한
  },
  fileFilter: (req, file, cb) => {
    // 파일 타입 검증
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel' // .xls
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Excel 파일(.xlsx, .xls)만 업로드 가능합니다'), false);
    }
  }
});

/**
 * POST /api/upload/stores
 * 매장 데이터 일괄 업로드
 */
router.post('/stores', authenticateToken, requireAdmin, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      const error = errorResponse(
        'VALIDATION_ERROR',
        '파일을 선택해주세요',
        400
      );
      return res.status(error.statusCode).json(error);
    }

    // 파일 형식 검증
    fileService.validateFileFormat(req.file);
    
    const result = await fileService.uploadStores(req.file.buffer);
    const response = successResponse(result, '매장 데이터 업로드 완료');
    
    res.json(response);
  } catch (error) {
    // Multer 에러 처리
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        const errorRes = errorResponse(
          'FILE_UPLOAD_ERROR',
          '파일 크기는 10MB를 초과할 수 없습니다',
          400
        );
        return res.status(errorRes.statusCode).json(errorRes);
      }
    }
    next(error);
  }
});

/**
 * POST /api/upload/owner-contacts
 * 담당자 연락처 일괄 업로드
 */
router.post('/owner-contacts', authenticateToken, requireAdmin, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      const error = errorResponse(
        'VALIDATION_ERROR',
        '파일을 선택해주세요',
        400
      );
      return res.status(error.statusCode).json(error);
    }

    // 파일 형식 검증
    fileService.validateFileFormat(req.file);
    
    const result = await fileService.uploadOwnerContacts(req.file.buffer);
    const response = successResponse(result, '담당자 연락처 업로드 완료');
    
    res.json(response);
  } catch (error) {
    // Multer 에러 처리
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        const errorRes = errorResponse(
          'FILE_UPLOAD_ERROR',
          '파일 크기는 10MB를 초과할 수 없습니다',
          400
        );
        return res.status(errorRes.statusCode).json(errorRes);
      }
    }
    next(error);
  }
});

/**
 * GET /api/upload/template/stores
 * 매장 업로드 템플릿 다운로드
 */
router.get('/template/stores', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    // 실제로는 Excel 템플릿 파일 반환
    const templateData = {
      filename: 'store_upload_template.xlsx',
      description: '매장 업로드 템플릿',
      columns: [
        'Seq (순번)',
        '매장명 (필수)',
        '주소 (필수)',
        '전화번호 (필수)',
        '담당자 전화번호',
        '카테고리',
        '직원수',
        '연매출',
        '담당자명'
      ]
    };
    
    const response = successResponse(templateData, '템플릿 정보 조회 성공');
    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/upload/template/owner-contacts
 * 담당자 연락처 템플릿 다운로드
 */
router.get('/template/owner-contacts', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    // 실제로는 Excel 템플릿 파일 반환
    const templateData = {
      filename: 'owner_contacts_template.xlsx',
      description: '담당자 연락처 템플릿',
      columns: [
        'Seq (매장 순번)',
        '담당자명 (필수)',
        '전화번호 (필수)'
      ]
    };
    
    const response = successResponse(templateData, '템플릿 정보 조회 성공');
    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;