/**
 * 요청/응답 로깅 미들웨어
 */
export const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // 요청 로그
  console.log(`📨 ${req.method} ${req.originalUrl} - ${new Date().toISOString()}`);
  
  // 요청 바디 로그 (민감한 정보 제외)
  if (req.body && Object.keys(req.body).length > 0) {
    const sanitizedBody = { ...req.body };
    // 비밀번호 필드 마스킹
    if (sanitizedBody.password) {
      sanitizedBody.password = '***';
    }
    if (sanitizedBody.password_hash) {
      sanitizedBody.password_hash = '***';
    }
    console.log('📝 Request Body:', JSON.stringify(sanitizedBody, null, 2));
  }

  // 원본 res.json 메서드 저장
  const originalJson = res.json;
  
  // res.json 메서드 오버라이드
  res.json = function(data) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // 응답 로그
    console.log(`📤 ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
    
    // 에러가 아닌 경우에만 응답 데이터 일부 로그
    if (res.statusCode < 400 && data) {
      if (data.success === false) {
        console.log('❌ Error Response:', data.error?.message);
      } else if (data.data) {
        console.log('✅ Response Data Keys:', Object.keys(data.data));
      }
    }
    
    // 원본 메서드 호출
    originalJson.call(this, data);
  };
  
  next();
};