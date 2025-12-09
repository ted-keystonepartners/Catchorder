import React, { useState, useRef, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { useToast } from '../hooks/useToast.js';
import ToastContainer from '../components/ui/Toast.jsx';
import MainLayout from '../components/Layout/MainLayout.jsx';

// SYSTEM_PROMPT 상수
const SYSTEM_PROMPT = `You are an expert at extracting structured data from Korean restaurant menu images. Analyze the image and convert it into a precise markdown table.

## Output Format
Output ONLY the markdown table below. No explanations, no additional text.

| Category | Menu Name | Price | Description |
| :--- | :--- | :--- | :--- |

## Extraction Rules

### 1. Category Detection
- Section headers (large text, underlined, boxed, decorative dividers) are categories
- Standard categories: "Salad", "Appetizer", "Rice", "Pasta", "Main", "Bread", "Side", "Dessert", "Beverage", "Set Menu"
- Normalize decorative text to standard categories:
  - "Salad & Appetizer" → "Salad & Appetizer"
  - "WE SERVE HOMEMADE DISHES" → "Main" (this is a slogan, not category)
  - "HERE'S OUR SPECIAL PLATE" → ignore (slogan)
- If unclear, use the nearest valid section header above

### 2. Menu Name - CRITICAL: Korean is Primary
- Korean text is MORE RELIABLE than English for OCR
- If English seems garbled but Korean is clear → reconstruct English from Korean
- Examples:
  - English "POLO" + Korean "풀포" → correct to "PULPO" (풀포 = pulpo = octopus)
  - English "PTERANUKI" + Korean "떡볶이" → correct to "TTEOKBOKKI"
  - English "TOPOKIMBA" + Korean "투움바" → correct to "TOYOUMBA"
- Format: "ENGLISH NAME (한글명)"
- If only Korean exists, use Korean only
- If only English exists, use English only

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

### 4. Description Extraction - CRITICAL: Get ALL text
- Capture ALL smaller text near the menu item
- Include BOTH:
  - English ingredients (e.g., "Sea Urchin, Amaebi, Nori, Soy sauce")
  - Korean description (e.g., "우니와 단새우의 조화로운 덮밥")
- Combine with " / " separator: "Sea Urchin, Amaebi, Nori / 우니와 단새우의 조화"
- Do NOT stop at first line - get ALL descriptive text for that menu item
- No description → leave empty

### 5. Special Markers
- ★, ☆, 추천, BEST, NEW → prepend "[Signature]" to description
- "한정", "Limited", "매일 한정" → prepend "[Limited]" to description
- "품절", "Sold Out" → prepend "[Sold Out]" to description

### 6. Exclude (DO NOT extract)
- Store name, logo, slogan ("HERE'S OUR", "FOLLOW US", etc.)
- SNS accounts, website URLs (@instagram, .com, .kr)
- Business hours, phone numbers
- Individual components of set menus (summarize in set description)
- Decorative text, page numbers

### 7. Set Menu Handling
- Extract as ONE row with category "Set Menu"
- List selection options in description
- Include set price and conditions (e.g., "For 2-3 people, free drink included")
- DO NOT create separate rows for each component

### 8. Sub-menus and Add-ons - CRITICAL: Extract ALL items
- Extract ALL menu items including:
  - Small add-on items (추가메뉴, 토핑, 사이드)
  - Items in corners or margins of the menu
  - Items with smaller font size
  - Items in separate small boxes
- These often appear:
  - At bottom of sections
  - In sidebars or margins
  - As "+금액" options next to main items
- If add-on has no clear category, use "Side" or "Add-on"
- Example: "+2,000 치즈추가" → Side | 치즈추가 | 2000 | 토핑 옵션

### 9. Option Prices (OR +금액)
- When menu shows "OR +2,000" or similar variations:
  - Base menu: extract with base price
  - Add option info to description: "Option: +2000 for upgrade"
- Do NOT create separate row for option price

### 10. Verification Steps (do this before output)
1. Read Korean name first for each item
2. Check if English matches Korean pronunciation - correct if not
3. Verify price is aligned with correct menu item
4. Check description captures ALL small text (both English AND Korean)
5. Scan corners and margins for missed small menus
6. Ensure category makes sense (not a slogan)

## Critical Rules
- Korean text is ground truth when English is unclear
- Get ALL descriptive text, not just first line
- Do NOT miss small/add-on menus in corners
- Double-check price alignment before outputting
- Output ONLY the table, nothing else`;

const MenuExtractPage = () => {
  const { success, error: showError, toasts, removeToast } = useToast();
  const fileInputRef = useRef(null);
  
  const [images, setImages] = useState([]);
  const [extractedData, setExtractedData] = useState([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [typingText, setTypingText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState(0);
  const [totalImages, setTotalImages] = useState(0);
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const progressIntervalRef = useRef(null);

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

  // 컴포넌트 언마운트 시 인터벌 정리
  React.useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
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

  // 파일 업로드 처리 (여러 개 이미지 지원)
  const handleFileSelect = (files) => {
    const imageFiles = Array.from(files).filter(file => 
      file.type === 'image/png' || file.type === 'image/jpeg' || file.type === 'image/jpg'
    );

    if (imageFiles.length === 0) {
      showError('이미지 파일(PNG, JPG)만 업로드 가능합니다.');
      return;
    }

    // 기존 이미지들 URL 해제
    images.forEach(img => URL.revokeObjectURL(img.preview));

    const newImages = imageFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file: file,
      preview: URL.createObjectURL(file),
      name: file.name
    }));

    setImages(newImages);
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

  // 부드러운 프로그레스 애니메이션
  const animateProgress = (targetProgress, duration = 2000) => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    
    const startProgress = animatedProgress;
    const diff = targetProgress - startProgress;
    const increment = diff / (duration / 50);
    let current = startProgress;
    
    progressIntervalRef.current = setInterval(() => {
      current += increment;
      if ((increment > 0 && current >= targetProgress) || 
          (increment < 0 && current <= targetProgress)) {
        current = targetProgress;
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setAnimatedProgress(current);
    }, 50);
  };

  // 추출하기 (순차 처리)
  const handleExtract = async () => {
    console.log('🚀 추출 시작');
    if (images.length === 0) {
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
    setAnimatedProgress(0);
    setTotalImages(images.length);
    setCurrentProcessingIndex(0);
    setProgressMessage('추출 준비 중...');
    
    // 초기 UI 업데이트
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const allResults = [];

    try {
      // 순차적으로 이미지 처리
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        
        // 이미지 처리 시작
        const startPercent = (i / images.length) * 100;
        const targetPercent = ((i + 1) / images.length) * 100;
        const midPercent = startPercent + (targetPercent - startPercent) * 0.7;
        
        setCurrentProcessingIndex(i + 1);
        setProgressMessage(`이미지 ${i + 1}/${images.length} 처리 중... (${image.name})`);
        setCurrentProgress(startPercent);
        
        // 부드러운 애니메이션으로 중간 지점까지
        animateProgress(midPercent, 3000);
        
        try {
          const markdownTable = await extractMenuFromImage(image);
          const parsedData = parseMarkdownTable(markdownTable);
          allResults.push(parsedData);
          
          // 처리 완료 후 목표 지점까지
          setCurrentProgress(targetPercent);
          animateProgress(targetPercent, 500);
          setProgressMessage(`이미지 ${i + 1}/${images.length} 완료!`);
          
          // 짧은 대기
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (err) {
          console.error(`이미지 ${image.name} 처리 실패:`, err);
          showError(`${image.name} 처리 실패: ${err.message}`);
          // 실패해도 진행률은 업데이트
          setCurrentProgress(targetPercent);
          animateProgress(targetPercent, 300);
        }
      }
      
      // 모든 결과 합치기
      const mergedData = mergeTableResults(allResults);
      
      // 완료 애니메이션
      setCurrentProgress(100);
      animateProgress(100, 300);
      setProgressMessage('✅ 모든 이미지 추출 완료!');
      
      setTimeout(() => {
        setExtractedData(mergedData);
        success(`${images.length}개 이미지에서 메뉴 추출이 완료되었습니다!`);
        setIsExtracting(false);
        setCurrentProgress(0);
        setAnimatedProgress(0);
        setProgressMessage('');
        setCurrentProcessingIndex(0);
        
        // 인터벌 정리
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
      }, 1000);
      
    } catch (err) {
      console.error('추출 실패:', err);
      showError(err.message || '메뉴 추출에 실패했습니다.');
      setCurrentProgress(0);
      setAnimatedProgress(0);
      setProgressMessage('');
      setIsExtracting(false);
      
      // 인터벌 정리
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
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
                  marginBottom: '20px'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #FF3D00 0%, #FF6B00 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: 'pulse 2s infinite',
                    boxShadow: '0 2px 8px rgba(255, 61, 0, 0.3)'
                  }}>
                    <svg width="20" height="20" fill="white" viewBox="0 0 24 24" style={{
                      animation: 'spin 3s linear infinite'
                    }}>
                      <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{
                      fontSize: '15px',
                      fontWeight: '700',
                      color: '#111827',
                      marginBottom: '6px'
                    }}>
                      AI가 메뉴를 분석하고 있어요
                    </p>
                    <p style={{
                      fontSize: '13px',
                      color: '#374151',
                      fontWeight: '500'
                    }}>
                      {progressMessage}
                    </p>
                  </div>
                  <div style={{
                    fontSize: '20px',
                    fontWeight: '700',
                    color: '#FF3D00',
                    minWidth: '50px',
                    textAlign: 'right'
                  }}>
                    {Math.round(animatedProgress || currentProgress)}%
                  </div>
                </div>
                
                <div style={{
                  position: 'relative',
                  width: '100%',
                  height: '8px',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  {/* 배경 애니메이션 */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(90deg, transparent, rgba(255,61,0,0.1), transparent)',
                    animation: 'shimmer 2s infinite linear'
                  }}/>
                  
                  {/* 실제 프로그레스 바 */}
                  <div style={{
                    width: `${animatedProgress || currentProgress}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #FF3D00, #FF6B00)',
                    borderRadius: '4px',
                    transition: 'width 0.3s ease-out',
                    boxShadow: '0 1px 2px rgba(255, 61, 0, 0.4)',
                    position: 'relative'
                  }}>
                    {/* 빛나는 효과 */}
                    <div style={{
                      position: 'absolute',
                      top: '1px',
                      left: '2px',
                      right: '2px',
                      height: '2px',
                      background: 'rgba(255,255,255,0.5)',
                      borderRadius: '2px'
                    }}/>
                  </div>
                </div>
                
                {/* 단계별 메시지 */}
                <p style={{
                  fontSize: '11px',
                  color: '#9ca3af',
                  textAlign: 'center',
                  marginTop: '8px',
                  fontStyle: 'italic'
                }}>
                  {animatedProgress < 30 ? '📝 텍스트 인식 중...' :
                   animatedProgress < 60 ? '💰 가격 정보 추출 중...' :
                   animatedProgress < 90 ? '📊 카테고리 분류 중...' :
                   '✨ 마무리하는 중...'}
                </p>
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
          0%, 100% { 
            opacity: 1;
            transform: scale(1);
          }
          50% { 
            opacity: 0.8;
            transform: scale(1.05);
          }
        }
        @keyframes blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </MainLayout>
  );
};

export default MenuExtractPage;