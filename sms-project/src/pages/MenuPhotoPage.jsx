import React, { useState, useRef, useEffect } from 'react';
import MainLayout from '../components/Layout/MainLayout.jsx';

const MenuPhotoPage = () => {
  const fileInputRef = useRef(null);
  
  const [originalImage, setOriginalImage] = useState(null);
  const [originalPreview, setOriginalPreview] = useState(null);
  const [resultImage, setResultImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [typingText, setTypingText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Typing animation effect
  useEffect(() => {
    const fullText = '일반 음식 사진을 고급 메뉴 사진으로 AI가 자동 변환합니다';
    let currentText = '';
    let index = 0;

    setIsTyping(true);
    const typingInterval = setInterval(() => {
      if (index < fullText.length) {
        currentText += fullText[index];
        setTypingText(currentText);
        index++;
      } else {
        clearInterval(typingInterval);
        setIsTyping(false);
      }
    }, 50);

    return () => clearInterval(typingInterval);
  }, []);

  // 파일을 base64로 변환
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
  };

  // 파일 업로드 처리
  const handleFileSelect = (file) => {
    // 파일 형식 검증
    if (!file.type.match(/^image\/(jpeg|jpg|png)$/)) {
      setError('JPG, PNG 파일만 업로드 가능합니다');
      return;
    }

    // 파일 크기 검증 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('파일 크기는 10MB 이하여야 합니다');
      return;
    }

    // 이전 미리보기 URL 해제
    if (originalPreview) {
      URL.revokeObjectURL(originalPreview);
    }

    setError(null);
    setOriginalImage(file);
    setOriginalPreview(URL.createObjectURL(file));
    setResultImage(null); // 새 이미지 업로드 시 이전 결과 초기화
  };

  // 드래그 앤 드롭 핸들러
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // 파일 선택 클릭
  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // 이미지 변환
  const convertImage = async () => {
    if (!originalImage) return;

    setIsLoading(true);
    setError(null);
    
    try {
      // 1. 이미지를 base64로 변환
      const base64Image = await fileToBase64(originalImage);
      
      // 2. Gemini API 호출
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${import.meta.env.VITE_GOOGLE_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [
                {
                  text: `(Masterpiece, Best Quality:1.5), A stunning, high-end commercial food photograph created based on the layout of the reference image. Dramatic, warm golden hour studio lighting creating an appetizing glow and cinematic atmosphere. Completely upgrade the visual quality. Render all food items shown in the reference with rich, juicy, and photorealistic textures, making them look Michelin-star quality. Maintain the exact arrangement of dishes and plates but present them in a luxurious fine dining setting. Sharp focus, shallow depth of field, 8k resolution, highly detailed. strictly 1:1 aspect ratio.`
                },
                {
                  inlineData: {
                    mimeType: originalImage.type,
                    data: base64Image
                  }
                }
              ]
            }],
            generationConfig: {
              temperature: 0.4,
              maxOutputTokens: 8192,
              responseMimeType: "application/json"
            }
          })
        }
      );
      
      if (!response.ok) {
        throw new Error('API 호출 실패');
      }

      const data = await response.json();
      console.log('API Response:', JSON.stringify(data, null, 2));
      
      // 3. 응답에서 이미지 추출
      const imagePart = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      if (imagePart && imagePart.inlineData) {
        setResultImage(`data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`);
      } else {
        throw new Error('이미지 생성에 실패했습니다. 다시 시도해주세요');
      }
      
    } catch (err) {
      setError(err.message || '이미지 변환에 실패했습니다. 다시 시도해주세요');
    } finally {
      setIsLoading(false);
    }
  };

  // 다운로드
  const downloadImage = () => {
    if (!resultImage) return;

    const link = document.createElement('a');
    link.href = resultImage;
    link.download = `menu_photo_${new Date().toISOString().slice(0, 19).replace(/[T:]/g, '')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 초기화
  const resetAll = () => {
    if (originalPreview) {
      URL.revokeObjectURL(originalPreview);
    }
    setOriginalImage(null);
    setOriginalPreview(null);
    setResultImage(null);
    setError(null);
  };

  // 컴포넌트 언마운트 시 URL 해제
  useEffect(() => {
    return () => {
      if (originalPreview) {
        URL.revokeObjectURL(originalPreview);
      }
    };
  }, [originalPreview]);

  return (
    <MainLayout>
      <div style={{ 
        fontFamily: "'SUIT', -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif"
      }}>
        {/* 상단 카드 영역 */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid #e5e7eb',
          marginBottom: '24px'
        }}>
          <div style={{ marginBottom: '20px' }}>
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px'
            }}>
              <div style={{ 
                width: '20px', 
                height: '20px', 
                backgroundColor: '#FF3D00', 
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="12" height="12" fill="white" viewBox="0 0 24 24">
                  <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a1.5 1.5 0 00-1.006-1.006L15.75 7.5l1.035-.259a1.5 1.5 0 001.006-1.006L18 5.25l.259 1.035a1.5 1.5 0 001.006 1.006L20.25 7.5l-1.035.259a1.5 1.5 0 00-1.006 1.006zM16.894 17.801L16.5 19.5l-.394-1.699a1.5 1.5 0 00-1.207-1.207L13.5 16.5l1.699-.394a1.5 1.5 0 001.207-1.207L16.5 13.5l.394 1.699a1.5 1.5 0 001.207 1.207L19.5 16.5l-1.699.394a1.5 1.5 0 00-1.207 1.207z"/>
                </svg>
              </div>
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                color: '#111827',
                margin: 0
              }}>
                사진생성 에이전트
              </h3>
            </div>
            <p style={{ 
              fontSize: '13px', 
              color: '#6b7280',
              margin: '0 0 0 28px',
              minHeight: '20px'
            }}>
              {typingText}
              {isTyping && (
                <span style={{
                  display: 'inline-block',
                  width: '2px',
                  height: '14px',
                  backgroundColor: '#6b7280',
                  marginLeft: '2px',
                  animation: 'blink 1s infinite',
                  verticalAlign: 'middle'
                }}/>
              )}
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '24px'
          }}>
            {/* 왼쪽: 원본 사진 업로드 영역 */}
            <div>
              <h3 style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '12px'
              }}>
                원본 사진
              </h3>
              <div 
                onClick={handleFileClick}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                  border: isDragging ? '2px dashed #FF3D00' : '2px dashed #e5e7eb',
                  borderRadius: '12px',
                  height: '300px',
                  cursor: 'pointer',
                  backgroundColor: isDragging ? '#fff5f3' : '#fafafa',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                
                {originalPreview ? (
                  <img
                    src={originalPreview}
                    alt="원본 이미지"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain'
                    }}
                  />
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      width: '64px',
                      height: '64px',
                      margin: '0 auto 16px',
                      backgroundColor: '#FF3D00',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <svg width="32" height="32" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    
                    <p style={{ 
                      fontSize: '16px', 
                      fontWeight: '600', 
                      color: '#111827', 
                      marginBottom: '8px' 
                    }}>
                      이미지를 드래그하거나 클릭하여 업로드
                    </p>
                    <p style={{ 
                      fontSize: '13px', 
                      color: '#9ca3af' 
                    }}>
                      PNG, JPG 파일 지원 (최대 10MB)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 오른쪽: 변환된 사진 영역 */}
            <div>
              <h3 style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '12px'
              }}>
                변환된 사진
              </h3>
              <div style={{
                border: '2px solid #e5e7eb',
                borderRadius: '12px',
                height: '300px',
                backgroundColor: '#fafafa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {isLoading ? (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      border: '4px solid #e5e7eb',
                      borderTop: '4px solid #FF3D00',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      margin: '0 auto 16px'
                    }}></div>
                    <p style={{
                      fontSize: '14px',
                      color: '#6b7280'
                    }}>
                      이미지를 변환하는 중...
                    </p>
                  </div>
                ) : resultImage ? (
                  <img
                    src={resultImage}
                    alt="변환된 이미지"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain'
                    }}
                  />
                ) : (
                  <div style={{
                    fontSize: '14px',
                    color: '#9ca3af',
                    textAlign: 'center'
                  }}>
                    변환된 이미지가 여기에 표시됩니다
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 버튼 영역 */}
          <div style={{
            marginTop: '24px',
            display: 'flex',
            gap: '8px',
            justifyContent: 'flex-end'
          }}>
            <button
              onClick={resetAll}
              style={{
                padding: '8px 16px',
                backgroundColor: 'white',
                color: '#6b7280',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#f9fafb';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
              }}
            >
              초기화
            </button>

            <button
              onClick={downloadImage}
              disabled={!resultImage}
              style={{
                padding: '8px 16px',
                backgroundColor: !resultImage ? '#e5e7eb' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: !resultImage ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                opacity: !resultImage ? 0.5 : 1
              }}
              onMouseOver={(e) => {
                if (resultImage) e.currentTarget.style.backgroundColor = '#059669';
              }}
              onMouseOut={(e) => {
                if (resultImage) e.currentTarget.style.backgroundColor = '#10b981';
              }}
            >
              다운로드
            </button>

            <button
              onClick={convertImage}
              disabled={!originalImage || isLoading}
              style={{
                padding: '8px 24px',
                backgroundColor: !originalImage || isLoading ? '#e5e7eb' : '#FF3D00',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: !originalImage || isLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                opacity: !originalImage || isLoading ? 0.5 : 1
              }}
              onMouseOver={(e) => {
                if (originalImage && !isLoading) e.currentTarget.style.backgroundColor = '#E63600';
              }}
              onMouseOut={(e) => {
                if (originalImage && !isLoading) e.currentTarget.style.backgroundColor = '#FF3D00';
              }}
            >
              {isLoading ? '변환 중...' : '변환하기'}
            </button>
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            marginBottom: '24px'
          }}>
            <p style={{
              fontSize: '14px',
              color: '#dc2626',
              margin: 0
            }}>
              {error}
            </p>
          </div>
        )}

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes blink {
            0%, 50%, 100% { opacity: 1; }
            25%, 75% { opacity: 0; }
          }
        `}</style>
      </div>
    </MainLayout>
  );
};

export default MenuPhotoPage;