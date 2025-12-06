import React, { useState, useRef } from 'react';
import { useToast } from '../hooks/useToast.js';
import ToastContainer from '../components/ui/Toast.jsx';
import MainLayout from '../components/Layout/MainLayout.jsx';

// SYSTEM_PROMPT 상수
const SYSTEM_PROMPT = `You are an expert at extracting structured data from menu images. Analyze the image and convert it into a precise markdown table.

## Output Format
Output ONLY the markdown table below. No explanations, no additional text.

| Category | Menu Name | Price | Description |
| :--- | :--- | :--- | :--- |

## Extraction Rules

### 1. Category Detection
- Section headers (large text, underlined, boxed) are categories
- Examples: "Salad & Appetizer", "Rice", "Pasta", "Main", "Dessert"
- Set menus → category is "Set Menu"
- If unclear, use the nearest section header above

### 2. Menu Name Merging
- If English name has Korean name directly below/beside it → merge into one
- Format: "English Name (한글명)"
- Example: "AVOCADO SALAD" + "새우 아보카도 샐러드" → "AVOCADO SALAD (새우 아보카도 샐러드)"
- If only one language exists, use that

### 3. Price Normalization
- Convert ALL prices to integer KRW (remove commas, ₩, 원)
- "19." → 19000
- "19" → 19000 (when contextually in 만원 unit)
- "19,000" → 19000
- "19K" → 19000
- "1.9" → 19000
- No price found → leave empty

### 4. Description Extraction
- Smaller text below/beside menu name (ingredients, features)
- Example: "Sea Urchin, Amaebi, Nori, Soy sauce"
- No description → leave empty (do NOT use "-")

### 5. Special Markers
- ★, ☆, 추천, BEST, NEW → prepend "[Signature]" to description
- "OR +2,000", "+2,000" → append "Option: +2000" to description
- "품절", "Sold Out" → prepend "[Sold Out]" to description
- "한정", "Limited" → prepend "[Limited]" to description

### 6. Exclude (DO NOT extract)
- Store name, logo, slogan
- SNS accounts, website URLs
- "Follow Us", "Instagram", promotional text
- Business hours, phone numbers
- Individual components of set menus (summarize in set description)
- Beverage options (include in set description if applicable)

### 7. Set Menu Handling
- Extract as ONE row
- Summarize components in description: "For 2-3 people, choice of salad/pasta/main, free drink per person"
- DO NOT create separate rows for each component

### 8. Ambiguous Cases
- Same line = one menu item
- Has price attached = menu item (descriptions don't have prices)
- Comma-separated ingredients = description
- Proper nouns / ALL CAPS = menu name

## Critical Rules
- Extract only what you see, do not infer
- If price is unclear, leave empty rather than guess wrong
- Output ONLY the table, nothing else`;

const MenuExtractPage = () => {
  const { success, error: showError, toasts, removeToast } = useToast();
  const fileInputRef = useRef(null);
  
  const [image, setImage] = useState(null);
  const [extractedData, setExtractedData] = useState([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [typingText, setTypingText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // 프로그레스 메시지 목록
  const progressMessages = [
    '🔍 이미지를 분석하고 있습니다...',
    '📝 메뉴 텍스트를 인식하는 중...',
    '💰 가격 정보를 추출하는 중...',
    '📊 카테고리를 분류하는 중...',
    '✨ 데이터를 정리하는 중...'
  ];

  // 타이핑 애니메이션
  React.useEffect(() => {
    if (!isTyping) {
      setIsTyping(true);
      const text = '메뉴판 이미지를 업로드하면 AI가 자동으로 메뉴 정보를 추출합니다';
      let currentIndex = 0;
      
      const typingInterval = setInterval(() => {
        if (currentIndex <= text.length) {
          setTypingText(text.slice(0, currentIndex));
          currentIndex++;
        } else {
          clearInterval(typingInterval);
          setIsTyping(false);
        }
      }, 30);
      
      return () => clearInterval(typingInterval);
    }
  }, []);

  // 파일을 base64로 변환
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // 파일 업로드 처리
  const handleFileSelect = (files) => {
    const imageFile = Array.from(files).find(file => 
      file.type === 'image/png' || file.type === 'image/jpeg' || file.type === 'image/jpg'
    );

    if (!imageFile) {
      showError('이미지 파일(PNG, JPG)만 업로드 가능합니다.');
      return;
    }

    const newImage = {
      id: Math.random().toString(36).substr(2, 9),
      file: imageFile,
      preview: URL.createObjectURL(imageFile),
      name: imageFile.name
    };

    // 기존 이미지가 있으면 URL 해제
    if (image) {
      URL.revokeObjectURL(image.preview);
    }

    setImage(newImage);
    setExtractedData([]); // 새 이미지 업로드 시 이전 결과 초기화
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
    handleFileSelect(files);
  };

  // 파일 선택 클릭
  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    handleFileSelect(files);
  };

  // 이미지 삭제
  const removeImage = () => {
    if (image) {
      URL.revokeObjectURL(image.preview);
      setImage(null);
      setExtractedData([]);
    }
  };

  // 마크다운 테이블 파싱
  const parseMarkdownTable = (markdown) => {
    const lines = markdown.trim().split('\n');
    const dataLines = lines.filter(line => line.trim() && !line.includes('---'));
    
    return dataLines.map(line => {
      const cells = line
        .split('|')
        .filter(cell => cell.trim())
        .map(cell => cell.trim());
      return cells;
    });
  };

  // TSV 변환 (엑셀 붙여넣기용)
  const convertToTSV = (tableData) => {
    return tableData.map(row => row.join('\t')).join('\n');
  };

  // Claude API 호출
  const extractMenuFromImage = async (image) => {
    const base64Data = await fileToBase64(image.file);
    const imageType = image.file.type;

    console.log('API Key:', import.meta.env.VITE_ANTHROPIC_API_KEY?.substring(0, 20));

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: imageType,
                data: base64Data
              }
            },
            {
              type: 'text',
              text: SYSTEM_PROMPT
            }
          ]
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || '추출에 실패했습니다.');
    }

    const data = await response.json();
    return data.content[0].text;
  };

  // 추출하기
  const handleExtract = async () => {
    if (!image) {
      showError('이미지를 먼저 업로드해주세요.');
      return;
    }

    if (!import.meta.env.VITE_ANTHROPIC_API_KEY) {
      showError('API 키가 설정되지 않았습니다.');
      return;
    }

    setIsExtracting(true);
    setExtractedData([]);
    setCurrentProgress(0);
    setProgressMessage(progressMessages[0]);

    // 프로그레스 바 애니메이션
    const progressInterval = setInterval(() => {
      setCurrentProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.random() * 15;
      });
      
      // 메시지 변경
      setProgressMessage(prev => {
        const currentIndex = progressMessages.indexOf(prev);
        if (currentIndex < progressMessages.length - 1) {
          return progressMessages[currentIndex + 1];
        }
        return prev;
      });
    }, 800);

    try {
      const markdownTable = await extractMenuFromImage(image);
      const parsedData = parseMarkdownTable(markdownTable);
      
      clearInterval(progressInterval);
      setCurrentProgress(100);
      setProgressMessage('✅ 추출 완료!');
      
      setTimeout(() => {
        setExtractedData(parsedData);
        success('메뉴 추출이 완료되었습니다!');
        setCurrentProgress(0);
        setProgressMessage('');
      }, 500);
      
    } catch (err) {
      clearInterval(progressInterval);
      console.error('추출 실패:', err);
      showError(`추출 실패: ${err.message}`);
    } finally {
      setTimeout(() => {
        setIsExtracting(false);
      }, 500);
    }
  };

  // 복사하기
  const handleCopy = () => {
    if (extractedData.length === 0) {
      showError('복사할 데이터가 없습니다.');
      return;
    }

    const tsvData = convertToTSV(extractedData);
    navigator.clipboard.writeText(tsvData)
      .then(() => {
        success('복사완료! 엑셀에 붙여넣기 할 수 있습니다.');
      })
      .catch(() => {
        showError('복사에 실패했습니다.');
      });
  };

  return (
    <MainLayout>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      <div style={{ 
        fontFamily: "'SUIT', -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif"
      }}>
        {/* 이미지 업로드 영역 */}
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
                이미지 에이전트
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
          {/* 왼쪽: 이미지 업로드 영역 */}
          <div>
            {!image ? (
              <div 
                onClick={handleFileClick}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                  border: isDragging ? '2px dashed #FF3D00' : '2px dashed #e5e7eb',
                  borderRadius: '12px',
                  padding: '40px 24px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: isDragging ? '#fff5f3' : '#fafafa',
                  transition: 'all 0.2s',
                  height: '300px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                
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
                  PNG, JPG 파일 지원
                </p>
              </div>
            ) : (
              <div style={{
                backgroundColor: '#fafafa',
                borderRadius: '12px',
                padding: '16px',
                height: '300px',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px'
                }}>
                  <h3 style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151'
                  }}>
                    업로드된 이미지
                  </h3>
                  <button
                    onClick={removeImage}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#ef4444',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = '#fef2f2';
                      e.currentTarget.style.borderColor = '#ef4444';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = 'white';
                      e.currentTarget.style.borderColor = '#e5e7eb';
                    }}
                  >
                    삭제
                  </button>
                </div>
                
                <div style={{
                  flex: 1,
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <img
                    src={image.preview}
                    alt={image.name}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain'
                    }}
                  />
                </div>
                
                <p style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  marginTop: '8px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {image.name}
                </p>
              </div>
            )}
          </div>

          {/* 오른쪽: 프로그레스 영역 */}
          <div style={{
            backgroundColor: '#fafafa',
            borderRadius: '12px',
            padding: '24px',
            height: '300px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}>
            {!image ? (
              <div style={{ textAlign: 'center', color: '#9ca3af' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  margin: '0 auto 12px',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <p style={{ fontSize: '14px', marginBottom: '4px' }}>이미지를 업로드하면</p>
                <p style={{ fontSize: '14px' }}>여기서 추출 진행 상황을 확인할 수 있습니다</p>
              </div>
            ) : !isExtracting && !extractedData.length ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  margin: '0 auto 16px',
                  backgroundColor: '#FF3D00',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg width="24" height="24" fill="white" viewBox="0 0 24 24">
                    <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                  </svg>
                </div>
                <p style={{ fontSize: '14px', color: '#374151', marginBottom: '16px' }}>
                  이미지가 준비되었습니다
                </p>
                <button
                  onClick={handleExtract}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#FF3D00',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#E65100';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#FF3D00';
                  }}
                >
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  AI로 메뉴 추출하기
                </button>
              </div>
            ) : isExtracting ? (
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '16px'
                }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: '#FF3D00',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: 'pulse 2s infinite'
                  }}>
                    <svg width="16" height="16" fill="white" viewBox="0 0 24 24">
                      <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#111827',
                      marginBottom: '4px'
                    }}>
                      AI가 메뉴를 분석하고 있어요
                    </p>
                    <p style={{
                      fontSize: '12px',
                      color: '#6b7280'
                    }}>
                      {progressMessage}
                    </p>
                  </div>
                </div>
                
                <div style={{
                  width: '100%',
                  height: '6px',
                  backgroundColor: '#e5e7eb',
                  borderRadius: '3px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${currentProgress}%`,
                    height: '100%',
                    backgroundColor: '#FF3D00',
                    borderRadius: '3px',
                    transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}/>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  margin: '0 auto 16px',
                  backgroundColor: '#10b981',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg width="24" height="24" fill="none" stroke="white" strokeWidth="3" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p style={{ fontSize: '14px', color: '#374151', marginBottom: '8px' }}>
                  추출이 완료되었습니다!
                </p>
                <p style={{ fontSize: '12px', color: '#6b7280' }}>
                  {extractedData.length - 1}개의 메뉴를 찾았습니다
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 결과 테이블 영역 */}
        {extractedData.length > 0 && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                color: '#111827',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
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
                    <path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/>
                  </svg>
                </div>
                추출 결과 ({extractedData.length - 1}개 메뉴)
              </h3>
              <button
                onClick={handleCopy}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#FF3D00',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '500',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#E65100';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#FF3D00';
                }}
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                엑셀용 복사
              </button>
            </div>

            <div style={{ 
              overflowX: 'auto',
              backgroundColor: '#fafafa',
              borderRadius: '8px',
              padding: '1px'
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '13px'
              }}>
                <tbody>
                  {extractedData.map((row, rowIndex) => (
                    <tr key={rowIndex} style={{
                      transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => {
                      if (rowIndex !== 0) {
                        e.currentTarget.style.backgroundColor = '#fafafa';
                      }
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    >
                      {row.map((cell, cellIndex) => (
                        rowIndex === 0 ? (
                          <th
                            key={cellIndex}
                            style={{
                              padding: '12px',
                              textAlign: 'left',
                              backgroundColor: '#f9fafb',
                              borderBottom: '1px solid #e5e7eb',
                              fontWeight: '600',
                              color: '#374151',
                              fontSize: '12px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em'
                            }}
                          >
                            {cell}
                          </th>
                        ) : (
                          <td
                            key={cellIndex}
                            style={{
                              padding: '12px',
                              borderBottom: '1px solid #f3f4f6',
                              color: '#111827',
                              fontSize: '13px'
                            }}
                          >
                            {cellIndex === 2 && cell ? (
                              <span style={{
                                fontWeight: '600',
                                color: '#FF3D00'
                              }}>
                                ₩{Number(cell).toLocaleString()}
                              </span>
                            ) : cell}
                          </td>
                        )
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @keyframes blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
      `}</style>
    </MainLayout>
  );
};

export default MenuExtractPage;