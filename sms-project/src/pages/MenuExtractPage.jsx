import React, { useState, useRef, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { useToast } from '../hooks/useToast.js';
import ToastContainer from '../components/ui/Toast.jsx';
import MainLayout from '../components/Layout/MainLayout.jsx';
import { AIProgressBar, useAIProgress } from '../components/Common/AIProgressBar.jsx';

// SYSTEM_PROMPT 상수
const SYSTEM_PROMPT = `You are an expert at extracting structured data from Korean restaurant menu images. Analyze the image and convert it into a precise markdown table.

## Output Format
Output ONLY the markdown table below. No explanations, no additional text.
Start your response with "| Category |"

| Category | Menu Name | Price | Description |
| :--- | :--- | :--- | :--- |

## Extraction Rules

### 1. Category Detection
- Section headers (large text, underlined, boxed, decorative dividers) are categories
- Standard categories: "Salad", "Appetizer", "Rice", "Pasta", "Risotto", "Main", "Brunch", "Bread", "Side", "Dessert", "Beverage", "Set Menu"
- Korean category mapping: "밥류" → "Rice", "면류" → "Noodle", "안주류" → "Appetizer", "음료" → "Beverage"
- If unclear, use the nearest valid section header above

### 2. Menu Name
- Korean text is MORE RELIABLE than English for OCR
- If English seems garbled but Korean is clear → reconstruct English from Korean
- Format: Use the English name as primary, keep Korean if no English exists

### 3. Price Normalization
- Convert ALL prices to integer KRW (remove commas, ₩, 원, dots)
- "19." → 19000
- "19" → 19000 (when contextually in 만원 unit)
- "22." → 22000
- "5,000" → 5000
- CRITICAL: Match price to the CORRECT menu item
- Price is usually RIGHT-ALIGNED or connected by dots to menu name
- Do NOT mix up prices between adjacent menu items
- No price found → leave empty
- Size variations: "S 5,000 / M 7,000" → use base price, note sizes in description

### 4. Description - EXACT COPY RULE (CRITICAL)

LOCATION:
- Description is the SMALLER TEXT directly BELOW the menu name
- Usually 1-2 lines of Korean text
- Same column alignment as the menu name

EXTRACTION METHOD:
- COPY the Korean text EXACTLY as written in the image
- Include English description if present: "English text / 한글 설명"
- Do NOT translate Korean to English
- Do NOT summarize or rephrase
- Do NOT invent descriptions that aren't visible

IF UNREADABLE:
- Leave the cell EMPTY
- Do NOT guess or generate plausible descriptions

### 5. Special Markers
- ★, ☆, 추천, BEST, NEW → prepend "[Signature]" to description
- "한정", "Limited" → prepend "[Limited]" to description
- "품절", "Sold Out" → prepend "[Sold Out]" to description

### 6. Exclude (DO NOT extract)
- Store name, logo, slogan
- SNS accounts, website URLs
- Business hours, phone numbers
- Allergen notices, footnotes

### 7. Set Menu / Options
- Extract as ONE row with category "Set Menu"
- "OR +2,000" variations → note in description, use base price

### 8. Scan Thoroughly
- Check ALL corners and margins
- Extract small add-on items
- Don't miss items in decorative borders

## STRICT OUTPUT RULES
1. Start response with "| Category |" - no preamble
2. No text after the table
3. If image is unreadable, output only the header row
4. Empty description cell is BETTER than fabricated description

## HALLUCINATION WARNING
You must ONLY extract text that is VISIBLE in the image.
If you cannot clearly read the description text below a menu item, leave that cell EMPTY.
Do NOT generate plausible-sounding Korean descriptions.`;

const MenuExtractPage = () => {
  const { success, error: showError, toasts, removeToast } = useToast();
  const fileInputRef = useRef(null);
  
  const [images, setImages] = useState([]);
  const [extractedData, setExtractedData] = useState([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [typingText, setTypingText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);
  
  // 새로운 프로그레스 훅 사용
  const { isRunning, start: startProgress, complete: completeProgress, reset: resetProgress } = useAIProgress();

  // Typing animation effect
  useEffect(() => {
    const fullText = '메뉴판 이미지를 업로드하면 AI가 자동으로 메뉴 정보를 추출합니다';
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

  // 파일 -> base64 변환
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
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
      handleFileChange({ target: { files } });
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  // 파일 업로드 처리 (여러 개 이미지 지원)
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    
    const validFiles = files.filter(file => {
      if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) {
        showError('이미지 파일(PNG, JPG)만 업로드 가능합니다.');
        return false;
      }
      return true;
    });

    // 기존 이미지들 URL 해제
    images.forEach(img => {
      if (img.preview) {
        URL.revokeObjectURL(img.preview);
      }
    });

    const newImages = validFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      name: file.name,
      preview: URL.createObjectURL(file)
    }));

    setImages(newImages);
    setExtractedData([]); // 새 이미지 업로드 시 이전 결과 초기화
  };

  // 이미지 삭제
  const removeImage = (imageId) => {
    const imageToRemove = images.find(img => img.id === imageId);
    if (imageToRemove) {
      URL.revokeObjectURL(imageToRemove.preview);
      setImages(prev => prev.filter(img => img.id !== imageId));
      if (images.length === 1) {
        setExtractedData([]);
      }
    }
  };

  // 모든 이미지 삭제
  const removeAllImages = () => {
    images.forEach(img => URL.revokeObjectURL(img.preview));
    setImages([]);
    setExtractedData([]);
  };

  // 초기화
  const resetAll = () => {
    images.forEach(img => URL.revokeObjectURL(img.preview));
    setImages([]);
    setExtractedData([]);
    setIsExtracting(false);
    setError(null);
    resetProgress();
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
    console.log('API Key:', import.meta.env.VITE_ANTHROPIC_API_KEY ? 'EXISTS' : 'UNDEFINED');
    console.log('API Key prefix:', import.meta.env.VITE_ANTHROPIC_API_KEY?.substring(0, 20));
    
    const base64Data = await fileToBase64(image.file);
    const imageType = image.file.type;


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
        temperature: 0,
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

  // 여러 테이블 결과 합치기
  const mergeTableResults = (allResults) => {
    if (allResults.length === 0) return [];
    
    const mergedData = [];
    let headerAdded = false;
    
    allResults.forEach((result, index) => {
      if (result && result.length > 0) {
        // 첫 번째 결과의 헤더만 추가
        if (!headerAdded) {
          mergedData.push(...result);
          headerAdded = true;
        } else {
          // 나머지는 데이터 행만 추가 (헤더 제외)
          // 헤더 행 판별: 카테고리, 메뉴, 가격 등의 단어가 포함되어 있으면 헤더로 간주
          const dataRows = result.filter((row, rowIndex) => {
            if (rowIndex === 0) {
              const rowText = row.join(' ').toLowerCase();
              return !rowText.includes('카테고리') && !rowText.includes('메뉴') && 
                     !rowText.includes('가격') && !rowText.includes('category') && 
                     !rowText.includes('menu') && !rowText.includes('price');
            }
            return true;
          });
          mergedData.push(...dataRows);
        }
      }
    });
    
    return mergedData;
  };

  // 추출하기 (순차 처리)
  const handleExtract = async () => {
    if (!images.length) {
      showError('이미지를 먼저 업로드해주세요.');
      return;
    }

    setIsExtracting(true);
    setExtractedData([]);
    setError(null);
    
    // 프로그레스 시작
    startProgress('menuExtract');

    try {
      // API 키 체크
      if (!import.meta.env.VITE_ANTHROPIC_API_KEY) {
        throw new Error('API 키가 설정되지 않았습니다.');
      }

      const allResults = [];

      // 순차적으로 이미지 처리
      for (let i = 0; i < images.length; i++) {
        const image = images[i];

        try {
          const result = await extractMenuFromImage(images[i]);
          
          if (result) {
            const parsedTable = parseMarkdownTable(result);
            allResults.push(parsedTable);
          }
        } catch (err) {
          console.error(`이미지 ${image.name} 처리 실패:`, err);
          showError(`이미지 ${image.name} 처리 실패: ${err.message}`);
        }
      }

      // 모든 결과 합치기
      const mergedTable = mergeTableResults(allResults);
      
      // 모든 이미지 처리 완료
      completeProgress();
      
      flushSync(() => {
        setExtractedData(mergedTable);
      });
      
      success(`${images.length}개 이미지에서 메뉴 추출이 완료되었습니다!`);
      
      setTimeout(() => {
        setIsExtracting(false);
      }, 500);
      
    } catch (error) {
      console.error('추출 오류:', error);
      showError(error.message);
      setIsExtracting(false);
      resetProgress();
    }
  };

  // 복사하기
  const handleCopy = () => {
    if (extractedData.length === 0) return;

    const tsvData = convertToTSV(extractedData);
    
    // BOM 추가 (UTF-8)
    const bom = '\uFEFF';
    const dataWithBom = bom + tsvData;
    
    navigator.clipboard.writeText(dataWithBom).then(() => {
      success('테이블이 클립보드에 복사되었습니다! 엑셀에 붙여넣기하세요.');
    }).catch(err => {
      showError('복사 실패: ' + err.message);
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
                메뉴추출 에이전트
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
            {images.length === 0 ? (
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
                  multiple
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
                  PNG, JPG 파일 지원 (여러 개 동시 선택 가능)
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
                    업로드된 이미지 ({images.length}개)
                  </h3>
                  <button
                    onClick={removeAllImages}
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
                    모두 삭제
                  </button>
                </div>
                
                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  display: 'grid',
                  gridTemplateColumns: images.length === 1 ? '1fr' : 'repeat(2, 1fr)',
                  gap: '8px',
                  padding: '8px'
                }}>
                  {images.map(img => (
                    <div key={img.id} style={{
                      position: 'relative',
                      backgroundColor: 'white',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      aspectRatio: '1',
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      <div style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '4px'
                      }}>
                        <img
                          src={img.preview}
                          alt={img.name}
                          style={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            objectFit: 'contain'
                          }}
                        />
                      </div>
                      <p style={{
                        fontSize: '10px',
                        color: '#6b7280',
                        padding: '4px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {img.name}
                      </p>
                      <button
                        onClick={() => removeImage(img.id)}
                        style={{
                          position: 'absolute',
                          top: '4px',
                          right: '4px',
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(239, 68, 68, 0.9)',
                          border: 'none',
                          color: 'white',
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
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
            {images.length === 0 ? (
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
                <p style={{ fontSize: '12px', color: '#6b7280' }}>
                  버튼으로 메뉴 추출을 시작하세요
                </p>
              </div>
            ) : isExtracting ? (
              <AIProgressBar preset="menuExtract" />
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
            onClick={handleCopy}
            disabled={extractedData.length === 0}
            style={{
              padding: '8px 16px',
              backgroundColor: extractedData.length === 0 ? '#e5e7eb' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: extractedData.length === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: extractedData.length === 0 ? 0.5 : 1
            }}
            onMouseOver={(e) => {
              if (extractedData.length > 0) e.currentTarget.style.backgroundColor = '#059669';
            }}
            onMouseOut={(e) => {
              if (extractedData.length > 0) e.currentTarget.style.backgroundColor = '#10b981';
            }}
          >
            복사하기
          </button>

          <button
            onClick={handleExtract}
            disabled={images.length === 0 || isExtracting}
            style={{
              padding: '8px 24px',
              backgroundColor: images.length === 0 || isExtracting ? '#e5e7eb' : '#FF3D00',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: images.length === 0 || isExtracting ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: images.length === 0 || isExtracting ? 0.5 : 1
            }}
            onMouseOver={(e) => {
              if (images.length > 0 && !isExtracting) e.currentTarget.style.backgroundColor = '#E63600';
            }}
            onMouseOut={(e) => {
              if (images.length > 0 && !isExtracting) e.currentTarget.style.backgroundColor = '#FF3D00';
            }}
          >
            {isExtracting ? '추출 중...' : '추출하기'}
          </button>
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
                  backgroundColor: '#10b981',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '500',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#059669'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                엑셀에 붙여넣기
              </button>
            </div>
            
            {/* 테이블 */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'separate',
                borderSpacing: 0,
                fontSize: '13px'
              }}>
                <tbody>
                  {extractedData.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((cell, cellIndex) => {
                        const isHeader = rowIndex === 0;
                        const Tag = isHeader ? 'th' : 'td';
                        
                        return (
                          <Tag
                            key={cellIndex}
                            style={{
                              padding: '12px',
                              textAlign: 'left',
                              borderBottom: '1px solid #e5e7eb',
                              borderRight: cellIndex < row.length - 1 ? '1px solid #e5e7eb' : 'none',
                              backgroundColor: isHeader ? '#f9fafb' : 
                                              rowIndex % 2 === 0 ? '#ffffff' : '#f9fafb',
                              fontWeight: isHeader ? '600' : '400',
                              color: isHeader ? '#374151' : '#111827',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'keep-all',
                              minWidth: cellIndex === 0 ? '100px' : 
                                       cellIndex === 1 ? '200px' : 
                                       cellIndex === 2 ? '80px' : '250px'
                            }}
                          >
                            {cell}
                          </Tag>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <style>{`
          @keyframes blink {
            0%, 50%, 100% { opacity: 1; }
            25%, 75% { opacity: 0; }
          }
        `}</style>
      </div>
    </MainLayout>
  );
};

export default MenuExtractPage;