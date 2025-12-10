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
      backgroundColor: '#f9fafb',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* 헤더 */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderBottom: '1px solid #f0f0f0',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <h1 style={{
          fontSize: '20px',
          fontWeight: '700',
          color: '#191f28',
          margin: 0,
          textAlign: 'center'
        }}>
          QR메뉴판 설치 인증
        </h1>
      </div>

      {/* 컨텐츠 */}
      <div style={{
        flex: 1,
        padding: '20px',
        maxWidth: '500px',
        width: '100%',
        margin: '0 auto'
      }}>
        {/* 안내 섹션 */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '16px'
        }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#191f28',
            marginBottom: '12px'
          }}>
            설치 사진을 올려주세요
          </h2>
          <p style={{
            fontSize: '15px',
            lineHeight: '1.6',
            color: '#626973',
            margin: 0
          }}>
            테이블에 설치된 QR메뉴판이 잘 보이도록 촬영해주세요.
            검수 완료 후 주문 시스템이 활성화됩니다.
          </p>
        </div>

        {/* 업로드 섹션 */}
        <div style={{ marginBottom: '80px' }}>
          {!previewUrl ? (
            <label style={{
              display: 'block',
              width: '100%',
              height: '180px',
              backgroundColor: 'white',
              borderRadius: '16px',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
              transition: 'all 0.2s'
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
                <div style={{
                  width: '56px',
                  height: '56px',
                  backgroundColor: '#fff7ed',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                  fontSize: '24px'
                }}>
                  📷
                </div>
                <p style={{ 
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#191f28',
                  marginBottom: '4px'
                }}>
                  사진 추가하기
                </p>
                <p style={{ 
                  fontSize: '14px',
                  color: '#8b95a1'
                }}>
                  탭하여 사진 선택
                </p>
              </div>
            </label>
          ) : (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '16px',
              position: 'relative'
            }}>
              <img
                src={previewUrl}
                alt="미리보기"
                style={{
                  width: '100%',
                  height: 'auto',
                  maxHeight: '400px',
                  objectFit: 'contain',
                  borderRadius: '12px',
                  backgroundColor: '#f9fafb'
                }}
              />
              <button
                onClick={() => {
                  setPreviewUrl(null);
                  setSelectedImage(null);
                }}
                style={{
                  position: 'absolute',
                  top: '24px',
                  right: '24px',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: 'white',
                  border: '1px solid #e5e8eb',
                  color: '#4e5968',
                  fontSize: '18px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
                }}
              >
                ×
              </button>
            </div>
          )}
        </div>

      </div>

      {/* 하단 고정 버튼 */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '16px 20px 34px',
        backgroundColor: 'white',
        borderTop: '1px solid #f0f0f0'
      }}>
        <button
          onClick={handleUpload}
          disabled={!selectedImage || isUploading}
          style={{
            width: '100%',
            maxWidth: '460px',
            margin: '0 auto',
            display: 'block',
            padding: '16px',
            backgroundColor: selectedImage && !isUploading ? '#FF6B00' : '#f2f4f6',
            color: selectedImage && !isUploading ? 'white' : '#b0b8c1',
            border: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: selectedImage && !isUploading ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s'
          }}
        >
          {isUploading ? (
            <>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid white',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  display: 'inline-block'
                }} />
                업로드 중...
              </span>
            </>
          ) : uploadSuccess ? (
            '완료'
          ) : (
            '제출하기'
          )}
        </button>
      </div>

      {/* 성공 메시지 모달 */}
      {uploadSuccess && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            padding: '32px 24px',
            maxWidth: '320px',
            width: '100%',
            textAlign: 'center'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              backgroundColor: '#fff7ed',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: '28px'
            }}>
              ✅
            </div>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '700',
              color: '#191f28',
              marginBottom: '8px'
            }}>
              제출 완료
            </h3>
            <p style={{
              fontSize: '15px',
              color: '#626973',
              lineHeight: '1.5',
              margin: 0
            }}>
              사진이 성공적으로 제출되었습니다.
              검수 후 연락드리겠습니다.
            </p>
          </div>
        </div>
      )}

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