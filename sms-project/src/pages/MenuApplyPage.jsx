import React, { useState } from 'react';

const MenuApplyPage = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB 제한
        alert('파일 크기는 10MB 이하여야 합니다.');
        return;
      }
      
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedImage) {
      alert('사진을 선택해주세요.');
      return;
    }

    setIsUploading(true);
    
    // 실제 업로드 로직은 나중에 구현
    setTimeout(() => {
      setIsUploading(false);
      setUploadSuccess(true);
      setTimeout(() => {
        setUploadSuccess(false);
        setSelectedImage(null);
        setPreviewUrl(null);
      }, 3000);
    }, 2000);
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#fff7ed',
      padding: '20px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '500px',
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        padding: '32px 20px',
        margin: '0 auto'
      }}>
        {/* 헤더 */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#FF6B00',
            marginBottom: '16px'
          }}>
            캐치오더 QR메뉴판 신청
          </h1>
          
          <div style={{
            backgroundColor: '#fff7ed',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
            border: '1px solid #fed7aa'
          }}>
            <p style={{
              fontSize: '15px',
              lineHeight: '1.6',
              color: '#92400e',
              margin: '0 0 12px 0',
              fontWeight: '500'
            }}>
              📋 안내사항
            </p>
            <p style={{
              fontSize: '14px',
              lineHeight: '1.8',
              color: '#78350f',
              margin: 0
            }}>
              받으신 캐치오더 QR메뉴판을 테이블에 설치한 사진을 보내주시면, 
              검수 후 주문 페이지와 연결해드립니다.
            </p>
          </div>
        </div>

        {/* 업로드 섹션 */}
        <div style={{ marginBottom: '24px' }}>
          {!previewUrl ? (
            <label style={{
              display: 'block',
              width: '100%',
              aspectRatio: '1',
              border: '2px dashed #fed7aa',
              borderRadius: '12px',
              backgroundColor: '#fffbf5',
              cursor: 'pointer',
              position: 'relative',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#FF6B00';
              e.currentTarget.style.backgroundColor = '#fff7ed';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#fed7aa';
              e.currentTarget.style.backgroundColor = '#fffbf5';
            }}>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageChange}
                style={{ display: 'none' }}
              />
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>📷</div>
                <p style={{ 
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#FF6B00',
                  marginBottom: '8px'
                }}>
                  사진 업로드
                </p>
                <p style={{ 
                  fontSize: '13px',
                  color: '#92400e'
                }}>
                  클릭하여 사진 선택
                </p>
              </div>
            </label>
          ) : (
            <div style={{ position: 'relative' }}>
              <img
                src={previewUrl}
                alt="미리보기"
                style={{
                  width: '100%',
                  aspectRatio: '1',
                  objectFit: 'cover',
                  borderRadius: '12px',
                  border: '2px solid #fed7aa'
                }}
              />
              <button
                onClick={() => {
                  setPreviewUrl(null);
                  setSelectedImage(null);
                }}
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  color: 'white',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>
          )}
        </div>

        {/* 업로드 버튼 */}
        <button
          onClick={handleUpload}
          disabled={!selectedImage || isUploading}
          style={{
            width: '100%',
            padding: '16px',
            backgroundColor: selectedImage && !isUploading ? '#FF6B00' : '#e5e7eb',
            color: selectedImage && !isUploading ? 'white' : '#9ca3af',
            border: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: selectedImage && !isUploading ? 'pointer' : 'not-allowed',
            transition: 'all 0.3s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
          onMouseEnter={(e) => {
            if (selectedImage && !isUploading) {
              e.currentTarget.style.backgroundColor = '#ea580c';
            }
          }}
          onMouseLeave={(e) => {
            if (selectedImage && !isUploading) {
              e.currentTarget.style.backgroundColor = '#FF6B00';
            }
          }}
        >
          {isUploading ? (
            <>
              <div style={{
                width: '20px',
                height: '20px',
                border: '3px solid white',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              업로드 중...
            </>
          ) : uploadSuccess ? (
            <>
              ✅ 업로드 완료!
            </>
          ) : (
            <>
              📤 사진 제출하기
            </>
          )}
        </button>

        {/* 성공 메시지 */}
        {uploadSuccess && (
          <div style={{
            marginTop: '20px',
            padding: '16px',
            backgroundColor: '#dcfce7',
            borderRadius: '8px',
            border: '1px solid #86efac',
            textAlign: 'center'
          }}>
            <p style={{
              fontSize: '14px',
              color: '#166534',
              margin: 0
            }}>
              사진이 성공적으로 제출되었습니다.
              <br />
              검수 후 연락드리겠습니다.
            </p>
          </div>
        )}

        {/* 추가 안내 */}
        <div style={{
          marginTop: '32px',
          paddingTop: '24px',
          borderTop: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <p style={{
            fontSize: '13px',
            color: '#6b7280',
            lineHeight: '1.6'
          }}>
            문의사항이 있으시면<br />
            고객센터로 연락해주세요.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default MenuApplyPage;