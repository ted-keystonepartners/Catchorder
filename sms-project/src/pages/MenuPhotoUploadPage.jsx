import React, { useState } from 'react';
import { apiClient } from '../api/client.js';

const MenuPhotoUploadPage = () => {
  const [storeName, setStoreName] = useState('');
  const [photos, setPhotos] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    
    // 파일 읽기 및 미리보기 생성
    files.forEach(file => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const base64 = event.target.result;
        setPhotos(prev => [...prev, { data: base64, type: file.type }]);
        setPreviews(prev => [...prev, base64]);
      };
      
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!storeName || photos.length === 0) {
      alert('매장명과 사진을 모두 입력해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiClient.post('/api/placements', {
        store_name: storeName,
        photos: photos
      });

      if (response.success) {
        setIsCompleted(true);
      } else {
        alert('제출 중 오류가 발생했습니다. 다시 시도해주세요.');
      }
    } catch (error) {
      alert('제출 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCompleted) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '48px',
          borderRadius: '16px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
          textAlign: 'center',
          maxWidth: '400px'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            backgroundColor: '#10b981',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px'
          }}>
            <svg width="32" height="32" fill="white" viewBox="0 0 24 24">
              <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
            </svg>
          </div>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#111827',
            marginBottom: '8px'
          }}>
            제출 완료
          </h2>
          <p style={{
            fontSize: '16px',
            color: '#6b7280',
            marginBottom: '32px'
          }}>
            비치 사진이 성공적으로 제출되었습니다.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 24px',
              backgroundColor: '#F97316',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 4px 14px rgba(249, 115, 22, 0.3)'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#EA580C'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#F97316'}
          >
            새로운 제출
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)',
      padding: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        maxWidth: '500px',
        width: '100%',
        margin: '0 auto'
      }}>
        {/* 로고 및 헤더 */}
        <div style={{
          textAlign: 'center',
          marginBottom: '32px'
        }}>
          <div style={{
            fontSize: '36px',
            fontWeight: '900',
            background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '16px'
          }}>
            CatchOrder
          </div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#111827',
            marginBottom: '8px'
          }}>
            QR메뉴 비치 인증
          </h1>
          <p style={{
            fontSize: '14px',
            color: '#6b7280'
          }}>
            매장에 비치된 QR메뉴 사진을 업로드해주세요
          </p>
        </div>

        {/* 폼 카드 */}
        <form onSubmit={handleSubmit} style={{
          backgroundColor: 'white',
          borderRadius: '20px',
          padding: '32px 24px',
          boxShadow: '0 20px 40px rgba(249, 115, 22, 0.1)',
          border: '1px solid rgba(249, 115, 22, 0.1)'
        }}>
          {/* 매장명 입력 */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '8px'
            }}>
              매장명 <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="매장명을 입력해주세요"
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '14px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#F97316'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            />
          </div>

          {/* 사진 업로드 */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '8px'
            }}>
              비치 사진 <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '14px',
                border: '2px dashed #e5e7eb',
                borderRadius: '8px',
                cursor: 'pointer',
                backgroundColor: '#f9fafb'
              }}
            />
            <p style={{
              fontSize: '12px',
              color: '#6b7280',
              marginTop: '4px'
            }}>
              여러 장의 사진을 선택할 수 있습니다
            </p>
          </div>

          {/* 미리보기 */}
          {previews.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <p style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '12px'
              }}>
                업로드된 사진 ({previews.length}장)
              </p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                gap: '12px'
              }}>
                {previews.map((preview, index) => (
                  <div key={index} style={{
                    position: 'relative',
                    paddingTop: '100%',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '8px',
                    overflow: 'hidden'
                  }}>
                    <img
                      src={preview}
                      alt={`미리보기 ${index + 1}`}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        width: '24px',
                        height: '24px',
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        lineHeight: 1
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 제출 버튼 */}
          <button
            type="submit"
            disabled={isSubmitting || !storeName || photos.length === 0}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: isSubmitting || !storeName || photos.length === 0 ? '#9ca3af' : '#F97316',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: isSubmitting || !storeName || photos.length === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              boxShadow: isSubmitting || !storeName || photos.length === 0 ? 'none' : '0 4px 14px rgba(249, 115, 22, 0.3)'
            }}
            onMouseOver={(e) => { 
              if (!isSubmitting && storeName && photos.length > 0) 
                e.target.style.backgroundColor = '#EA580C' 
            }}
            onMouseOut={(e) => { 
              if (!isSubmitting && storeName && photos.length > 0) 
                e.target.style.backgroundColor = '#F97316' 
            }}
          >
            {isSubmitting ? '제출 중...' : '제출하기'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default MenuPhotoUploadPage;