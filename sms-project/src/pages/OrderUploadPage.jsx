import React, { useState, useRef } from 'react';
import { useToast } from '../hooks/useToast.js';
import ToastContainer from '../components/ui/Toast.jsx';
import MainLayout from '../components/Layout/MainLayout.jsx';
import { apiClient } from '../api/client.js';

const OrderUploadPage = () => {
  const { success, error: showError, toasts, removeToast } = useToast();
  const fileInputRef = useRef(null);
  
  const [csvFile, setCsvFile] = useState(null);
  const [csvData, setCsvData] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [dbStores, setDbStores] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [errorOrders, setErrorOrders] = useState([]);
  const [currentStep, setCurrentStep] = useState(0); // 0: upload, 1: mapping, 2: result
  const [saveResults, setSaveResults] = useState(null); // 저장 결과 통계
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingMessage, setProcessingMessage] = useState('');
  const [typingText, setTypingText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // 타이핑 애니메이션
  React.useEffect(() => {
    if (!isTyping) {
      setIsTyping(true);
      const text = '주문 데이터를 업로드하면 AI가 자동으로 처리해줍니다';
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

  // CSV 파싱
  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      data.push(row);
    }
    
    return data;
  };

  // 파일 읽기
  const readFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsText(file, 'UTF-8');
    });
  };

  // 파일 업로드 처리
  const handleFileSelect = async (files) => {
    const file = Array.from(files).find(f => f.type === 'text/csv' || f.name.endsWith('.csv'));

    if (!file) {
      showError('CSV 파일만 업로드 가능합니다.');
      return;
    }

    setCsvFile(file);
    setIsProcessing(true);
    setProcessingProgress(0);
    setProcessingMessage('파일을 읽는 중...');

    // 프로그레스 애니메이션 시작
    const progressInterval = setInterval(() => {
      setProcessingProgress(prev => {
        if (prev >= 90) return 90;
        return prev + Math.random() * 10;
      });
    }, 300);

    try {
      // Step 1: 파일 읽기
      setProcessingMessage('📄 CSV 파일을 확인하고 있습니다...');
      await new Promise(resolve => setTimeout(resolve, 500));
      const text = await readFile(file);
      setProcessingProgress(20);
      
      // Step 2: 데이터 파싱
      setProcessingMessage('📊 주문 데이터를 분석하고 있습니다...');
      await new Promise(resolve => setTimeout(resolve, 500));
      const data = parseCSV(text);
      setProcessingProgress(30);
      
      // Step 3: 결제완료 필터링
      setProcessingMessage('✔️ 결제완료 주문을 필터링하고 있습니다...');
      await new Promise(resolve => setTimeout(resolve, 500));
      const filtered = data.filter(row => row['결제상태'] === '결제완료');
      setProcessingProgress(40);
      
      if (filtered.length === 0) {
        showError('결제완료 상태의 주문이 없습니다.');
        clearInterval(progressInterval);
        setIsProcessing(false);
        setProcessingProgress(0);
        setProcessingMessage('');
        return;
      }

      setCsvData(data);
      setFilteredOrders(filtered);
      setProcessingProgress(50);
      
      // Step 4: DB 매장 목록 가져오기
      setProcessingMessage('🏪 매장 데이터베이스를 조회하고 있습니다...');
      await new Promise(resolve => setTimeout(resolve, 500));
      const fetchedStores = await fetchStores();
      setProcessingProgress(60);
      
      if (!fetchedStores || fetchedStores.length === 0) {
        showError('매장 목록이 비어있습니다.');
        clearInterval(progressInterval);
        setIsProcessing(false);
        setProcessingProgress(0);
        setProcessingMessage('');
        return;
      }
      
      // Step 5: 고유 매장명 추출
      setProcessingMessage('🔍 고유한 매장명을 추출하고 있습니다...');
      await new Promise(resolve => setTimeout(resolve, 500));
      const uniqueStoreNames = [...new Set(filtered.map(row => row['매장명']))];
      setProcessingProgress(70);
      
      // Step 6: AI 매핑
      setProcessingMessage('🤖 AI가 유사한 매장명을 매핑하고 있습니다...');
      await new Promise(resolve => setTimeout(resolve, 500));
      await requestMapping(uniqueStoreNames, fetchedStores);
      
      clearInterval(progressInterval);
      setProcessingProgress(100);
      setProcessingMessage('✨ 매핑 완료!');
      
      setCurrentStep(1);
      success(`${filtered.length}개의 결제완료 주문을 찾았습니다.`);
    } catch (err) {
      clearInterval(progressInterval);
      console.error('파일 처리 실패:', err);
      showError('파일 처리 중 오류가 발생했습니다.');
      setProcessingProgress(0);
      setProcessingMessage('');
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
        setProcessingProgress(0);
        setProcessingMessage('');
      }, 1000);
    }
  };

  // DB 매장 목록 가져오기
  const fetchStores = async () => {
    console.log("========== Fetching stores START ==========");
    setIsLoading(true);
    
    try {
      console.log("Calling GET /api/stores...");
      const response = await apiClient.get('/api/stores');
      console.log("API response received:", response);
      console.log("Response success:", response.success);
      console.log("Response data:", response.data);
      console.log("Response error:", response.error);
      
      if (response.success) {
        // 다양한 응답 구조 처리
        const stores = response.data?.stores || response.data || response.stores || [];
        console.log("Parsed stores array:", stores);
        console.log("Stores count:", stores.length);
        console.log("First 5 stores:", stores.slice(0, 5));
        
        // 데이터 검증
        if (Array.isArray(stores)) {
          console.log("Stores is valid array");
          if (stores.length > 0) {
            console.log("Sample store structure:", stores[0]);
            console.log("Sample store seq:", stores[0]?.seq);
            console.log("Sample store name:", stores[0]?.store_name);
          }
          setDbStores(stores);  // UI 업데이트용
          return stores;  // 직접 반환
        } else {
          console.error("Stores is not an array:", typeof stores);
          setDbStores([]);
          return [];
        }
      } else {
        console.error("API response not successful:", response);
        throw new Error(response.error || '매장 목록을 가져올 수 없습니다.');
      }
    } catch (err) {
      console.error('매장 목록 조회 실패 - Full error:', err);
      console.error('Error message:', err.message);
      console.error('Error stack:', err.stack);
      showError('매장 목록 조회에 실패했습니다.');
      setDbStores([]); // 실패 시 빈 배열로 초기화
      return [];  // 실패 시에도 빈 배열 반환
    } finally {
      setIsLoading(false);
      console.log("========== Fetching stores END ==========");
      console.log("Final dbStores state will be updated");
    }
  };

  // Claude API로 매핑 요청
  const requestMapping = async (storeNames, dbStoresList) => {
    console.log("DB stores count:", dbStoresList.length);
    console.log("DB stores sample:", dbStoresList.slice(0, 3));
    console.log("CSV store names:", storeNames);
    
    const systemPrompt = `You are a store name matching expert. Match order data store names to DB store names.

## DB Store List:
${dbStoresList.map(s => `{seq: "${s.seq}", store_name: "${s.store_name}"}`).join('\n')}

## Order Data Store Names:
${JSON.stringify(storeNames)}

## Matching Rules (IMPORTANT!)
1. IGNORE spaces: "아베크 청담" = "아베크청담"
2. IGNORE special characters: "이시야S&D" = "이시야SD"
3. IGNORE suffixes: "강남점", "강남본점", "강남" are the same
4. ALLOW branch name variations: "판교아브뉴프랑점" ≈ "판교점" (same brand = match)
5. PRIORITIZE brand name: If brand matches, use location to find best match

## Principles
- When uncertain, STILL map to the most similar store
- Similar mapping is BETTER than no mapping
- Only use null when there is absolutely no related store

## Response Format (JSON only, no other text)
{
  "mappings": [
    {"csv_name": "store name", "seq": "12345", "db_name": "DB store name", "match_type": "exact"},
    {"csv_name": "store name", "seq": "12345", "db_name": "DB store name", "match_type": "similar"},
    {"csv_name": "store name", "seq": null, "db_name": null, "match_type": "none"}
  ]
}

match_type criteria:
- exact: Names are identical
- similar: Same store but different name spelling
- none: No matching store exists`;

    try {
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
            content: systemPrompt
          }]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || '매핑 요청에 실패했습니다.');
      }

      const data = await response.json();
      console.log("Claude response:", data);
      let responseText = data.content[0].text;
      // 마크다운 코드블록 제거
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const mappingResult = JSON.parse(responseText);
      
      // 매핑 결과 저장
      setMappings(mappingResult.mappings.map(m => ({
        ...m,
        selectedSeq: m.seq // 초기값 설정
      })));
    } catch (err) {
      console.error('매핑 실패:', err);
      showError(`매핑 실패: ${err.message}`);
      
      // 실패 시 기본 매핑 (모두 null)
      setMappings(storeNames.map(name => ({
        csv_name: name,
        seq: null,
        db_name: null,
        match_type: 'none',
        selectedSeq: null
      })));
    }
  };

  // 매핑 변경 핸들러
  const handleMappingChange = (csvName, newSeq) => {
    setMappings(prev => prev.map(m => {
      if (m.csv_name === csvName) {
        const selectedStore = dbStores.find(s => s.seq === newSeq);
        return {
          ...m,
          selectedSeq: newSeq,
          db_name: selectedStore?.store_name || null,
          match_type: selectedStore ? 'manual' : 'none'
        };
      }
      return m;
    }));
  };

  // 주문 저장
  const handleSave = async () => {
    setIsSaving(true);
    setErrorOrders([]);

    try {
      // 매핑 정보를 Map으로 변환
      const mappingMap = new Map();
      mappings.forEach(m => {
        mappingMap.set(m.csv_name, m.selectedSeq);
      });

      // 주문 데이터 준비 - 매핑 안 된 주문도 포함
      const ordersToSave = filteredOrders
        .map(order => {
          const seq = mappingMap.get(order['매장명']);
          return {
            order_id: order['주문번호'],
            seq: seq === 'none' ? null : seq,  // 'none'인 경우 null로 저장
            store_name_csv: order['매장명'],
            order_time: order['주문시간'],
            payment_status: order['결제상태'],
            coupon_discount: parseInt(order['쿠폰할인금액']) || 0,
            payment_amount: parseInt(order['결제금액']) || 0,
            payment_time: order['결제시간']
          };
        });

      if (ordersToSave.length === 0) {
        showError('저장할 주문이 없습니다. 매핑을 확인해주세요.');
        setIsSaving(false);
        return;
      }

      // POST 요청
      const response = await apiClient.post('/api/order', { orders: ordersToSave });

      if (response.success) {
        const result = response.data;
        
        // 결과 메시지 생성
        const savedCount = result.saved || 0;
        const updatedCount = result.updated || 0;
        const errorCount = result.errors?.length || 0;
        const duplicateCount = result.duplicates || 0;
        
        // 저장 결과 state 저장 (UI 표시용)
        setSaveResults({
          saved: savedCount,
          updated: updatedCount,
          errors: errorCount,
          duplicates: duplicateCount,
          total: ordersToSave.length
        });
        
        // 성공 메시지 생성
        let successMsg = [];
        if (savedCount > 0) successMsg.push(`신규 ${savedCount}개`);
        if (updatedCount > 0) successMsg.push(`업데이트 ${updatedCount}개`);
        
        if (successMsg.length > 0) {
          success(`주문 처리 완료: ${successMsg.join(', ')}`);
        }
        
        // 에러/중복 처리
        if (result.errors && result.errors.length > 0) {
          setErrorOrders(result.errors);
          if (duplicateCount > 0) {
            showError(`중복 ${duplicateCount}개, 오류 ${errorCount - duplicateCount}개 발생`);
          } else {
            showError(`${errorCount}개 주문에서 오류가 발생했습니다.`);
          }
        }
        
        setCurrentStep(2);
      } else {
        throw new Error(response.error || '주문 저장에 실패했습니다.');
      }
    } catch (err) {
      console.error('저장 실패:', err);
      showError(`저장 실패: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
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
    handleFileSelect(e.dataTransfer.files);
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    handleFileSelect(e.target.files);
  };

  // 초기화
  const resetAll = () => {
    setCsvFile(null);
    setCsvData([]);
    setFilteredOrders([]);
    setMappings([]);
    setErrorOrders([]);
    setSaveResults(null);
    setCurrentStep(0);
  };

  // 매핑 통계
  const getMappingStats = () => {
    const exact = mappings.filter(m => m.match_type === 'exact').length;
    const similar = mappings.filter(m => m.match_type === 'similar').length;
    const manual = mappings.filter(m => m.match_type === 'manual').length;
    const none = mappings.filter(m => !m.selectedSeq || m.selectedSeq === 'none').length;
    
    return { exact, similar, manual, none };
  };

  // 샘플 CSV 다운로드
  const downloadSampleCSV = () => {
    const sampleData = `주문번호,매장명,회원명,주문시간,결제모듈,결제상태,쿠폰할인금액,결제금액,결제시간
T-20251205012353110863,이시야S&D 본점,홍길동,2025-12-05 01:23:53,후불결제,결제완료,0,9800,2025-12-05 01:23:58
T-20251205012353110864,정희 판교점,김철수,2025-12-05 02:15:23,후불결제,결제완료,1000,15000,2025-12-05 02:15:28
T-20251205012353110865,아베크 청담점,이영희,2025-12-05 03:45:13,후불결제,결제완료,0,12000,2025-12-05 03:45:18
T-20251205012353110866,메가커피 강남점,박민수,2025-12-05 04:12:33,선불결제,결제완료,500,4500,2025-12-05 04:12:38
T-20251205012353110867,스타벅스 역삼점,,2025-12-05 05:33:43,후불결제,취소,0,18000,
T-20251205012353110868,올리브영 신논현점,최수진,2025-12-05 06:22:53,후불결제,대기,0,8500,`;

    const blob = new Blob([sampleData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'sample_orders.csv');
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    success('샘플 CSV 파일이 다운로드되었습니다.');
  };

  return (
    <MainLayout>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      <div style={{ 
        fontFamily: "'SUIT', -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif"
      }}>
        {/* 데이터 에이전트 섹션 */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid #e5e7eb',
          marginBottom: '24px'
        }}>
          <div style={{ marginBottom: '0' }}>
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
                데이터 에이전트
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
        </div>

        {/* 단계 표시 */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid #e5e7eb',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center',
              flex: 1
            }}>
              {[
                { label: 'CSV 업로드', icon: (
                  <svg width="16" height="16" fill="white" viewBox="0 0 20 20">
                    <path d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" />
                  </svg>
                )},
                { label: '매장 매핑', icon: (
                  <svg width="16" height="16" fill="white" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5a2 2 0 012.828 0zM8.414 15.414a2 2 0 01-2.828 0 2 2 0 010-2.828l3-3a2 2 0 012.828 0 1 1 0 001.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5z" clipRule="evenodd" />
                  </svg>
                )},
                { label: '저장 완료', icon: (
                  <svg width="16" height="16" fill="white" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              ].map((step, index) => (
                <React.Fragment key={index}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    opacity: currentStep >= index ? 1 : 0.4
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: currentStep >= index ? '#FF3D00' : '#e5e7eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {step.icon}
                    </div>
                    <span style={{
                      fontSize: '14px',
                      fontWeight: currentStep === index ? '600' : '400',
                      color: currentStep >= index ? '#111827' : '#9ca3af'
                    }}>
                      {step.label}
                    </span>
                  </div>
                  {index < 2 && (
                    <div style={{
                      flex: 1,
                      height: '2px',
                      backgroundColor: currentStep > index ? '#FF3D00' : '#e5e7eb',
                      margin: '0 16px'
                    }} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* 프로그레스바 */}
        {isProcessing && processingMessage && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #e5e7eb',
            marginBottom: '24px'
          }}>
            <div style={{
              backgroundColor: '#fafafa',
              borderRadius: '12px',
              padding: '24px'
            }}>
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
                    AI가 데이터를 처리하고 있어요
                  </p>
                  <p style={{
                    fontSize: '12px',
                    color: '#6b7280'
                  }}>
                    {processingMessage}
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
                  width: `${processingProgress}%`,
                  height: '100%',
                  backgroundColor: '#FF3D00',
                  borderRadius: '3px',
                  transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                }}/>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: CSV 업로드 */}
        {currentStep === 0 && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
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
                    <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
                  </svg>
                </div>
                주문 데이터 업로드
              </h3>
              <button
                onClick={downloadSampleCSV}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '500',
                  color: '#374151',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#f9fafb';
                  e.currentTarget.style.borderColor = '#d1d5db';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.borderColor = '#e5e7eb';
                }}
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                샘플 CSV 다운로드
              </button>
            </div>

            <div 
              onClick={handleFileClick}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{
                border: isDragging ? '2px dashed #FF3D00' : '2px dashed #e5e7eb',
                borderRadius: '12px',
                padding: '60px 24px',
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: isDragging ? '#fff5f3' : '#fafafa',
                transition: 'all 0.2s'
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
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
                <svg width="32" height="32" fill="white" viewBox="0 0 24 24">
                  <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 14H8v-2h8v2zm0-4H8v-2h8v2z"/>
                </svg>
              </div>
              
              <p style={{ 
                fontSize: '16px', 
                fontWeight: '600', 
                color: '#111827', 
                marginBottom: '8px' 
              }}>
                {isProcessing ? '처리 중...' : 'CSV 파일을 드래그하거나 클릭하여 업로드'}
              </p>
              <p style={{ 
                fontSize: '13px', 
                color: '#9ca3af' 
              }}>
                주문번호, 매장명, 결제상태 등이 포함된 CSV 파일
              </p>
            </div>

            {csvFile && (
              <div style={{
                marginTop: '16px',
                padding: '12px',
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#6b7280'
              }}>
                파일: {csvFile.name} ({(csvFile.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>
        )}

        {/* Step 2: 매장 매핑 */}
        {currentStep === 1 && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              marginBottom: '20px' 
            }}>
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                color: '#111827',
                margin: 0
              }}>
                매장 매핑 검토
              </h3>
              <div style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
                {(() => {
                  const stats = getMappingStats();
                  return (
                    <>
                      <span style={{ 
                        padding: '6px 10px', 
                        backgroundColor: '#fff5f3', 
                        color: '#7c2d12',
                        border: '1px solid #ffccb8',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontWeight: '500'
                      }}>
                        <svg width="12" height="12" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        일치: {stats.exact}
                      </span>
                      <span style={{ 
                        padding: '6px 10px', 
                        backgroundColor: '#fff5f3', 
                        color: '#7c2d12',
                        border: '1px solid #ffccb8',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontWeight: '500'
                      }}>
                        <svg width="12" height="12" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        유사: {stats.similar}
                      </span>
                      <span style={{ 
                        padding: '6px 10px', 
                        backgroundColor: '#fff5f3', 
                        color: '#7c2d12',
                        border: '1px solid #ffccb8',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontWeight: '500'
                      }}>
                        <svg width="12" height="12" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                        수정: {stats.manual}
                      </span>
                      <span style={{ 
                        padding: '6px 10px', 
                        backgroundColor: '#fef2f2', 
                        color: '#991b1b',
                        border: '1px solid #fecaca',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontWeight: '500'
                      }}>
                        <svg width="12" height="12" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        없음: {stats.none}
                      </span>
                    </>
                  );
                })()}
              </div>
            </div>

            <div style={{ 
              overflowX: 'auto',
              backgroundColor: '#fafafa',
              borderRadius: '8px',
              padding: '1px',
              maxHeight: '400px',
              overflowY: 'auto'
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '13px'
              }}>
                <thead>
                  <tr>
                    <th style={{
                      padding: '12px',
                      textAlign: 'left',
                      backgroundColor: '#f9fafb',
                      borderBottom: '1px solid #e5e7eb',
                      fontWeight: '600',
                      color: '#374151',
                      position: 'sticky',
                      top: 0
                    }}>
                      CSV 매장명
                    </th>
                    <th style={{
                      padding: '12px',
                      textAlign: 'left',
                      backgroundColor: '#f9fafb',
                      borderBottom: '1px solid #e5e7eb',
                      fontWeight: '600',
                      color: '#374151',
                      position: 'sticky',
                      top: 0
                    }}>
                      매핑된 DB 매장
                    </th>
                    <th style={{
                      padding: '12px',
                      textAlign: 'center',
                      backgroundColor: '#f9fafb',
                      borderBottom: '1px solid #e5e7eb',
                      fontWeight: '600',
                      color: '#374151',
                      position: 'sticky',
                      top: 0
                    }}>
                      상태
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {mappings.map((mapping, index) => (
                    <tr key={index}>
                      <td style={{
                        padding: '12px',
                        borderBottom: '1px solid #f3f4f6',
                        color: '#111827'
                      }}>
                        {mapping.csv_name}
                      </td>
                      <td style={{
                        padding: '12px',
                        borderBottom: '1px solid #f3f4f6'
                      }}>
                        <select
                          value={mapping.selectedSeq || 'none'}
                          onChange={(e) => handleMappingChange(mapping.csv_name, e.target.value === 'none' ? null : e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '4px',
                            fontSize: '13px',
                            backgroundColor: 'white'
                          }}
                        >
                          <option value="none">매핑 안함</option>
                          {dbStores.map((store, storeIndex) => (
                            <option key={`${store.seq}-${storeIndex}`} value={store.seq}>
                              {store.store_name} ({store.seq})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{
                        padding: '12px',
                        borderBottom: '1px solid #f3f4f6',
                        textAlign: 'center'
                      }}>
                        {mapping.match_type === 'exact' && (
                          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="16" height="16" fill="#FF3D00" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                        {mapping.match_type === 'similar' && (
                          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="16" height="16" fill="#FF7043" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                        {mapping.match_type === 'manual' && (
                          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="16" height="16" fill="#6b7280" viewBox="0 0 20 20">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                          </div>
                        )}
                        {mapping.match_type === 'none' && (
                          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="16" height="16" fill="#dc2626" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{
              marginTop: '24px',
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <button
                onClick={resetAll}
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#6b7280',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                다시 시작
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                style={{
                  padding: '10px 24px',
                  backgroundColor: isSaving ? '#9ca3af' : '#FF3D00',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {isSaving ? '저장 중...' : '주문 저장'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: 저장 완료 */}
        {currentStep === 2 && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{
                width: '64px',
                height: '64px',
                margin: '0 auto 16px',
                backgroundColor: '#FF3D00',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="32" height="32" fill="white" viewBox="0 0 24 24">
                  <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
                </svg>
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
                저장 완료!
              </h3>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>
                주문 데이터가 성공적으로 처리되었습니다.
              </p>

              {/* 저장 결과 통계 */}
              {saveResults && (
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'center',
                  marginBottom: '32px',
                  flexWrap: 'wrap'
                }}>
                  <div style={{
                    padding: '12px 20px',
                    backgroundColor: '#fff5f3',
                    borderRadius: '8px',
                    border: '1px solid #ffccb8',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <svg width="16" height="16" fill="#FF3D00" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#7c2d12' }}>
                      신규: {saveResults.saved}개
                    </span>
                  </div>

                  <div style={{
                    padding: '12px 20px',
                    backgroundColor: '#fff5f3',
                    borderRadius: '8px',
                    border: '1px solid #ffccb8',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <svg width="16" height="16" fill="#FF3D00" viewBox="0 0 20 20">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#7c2d12' }}>
                      업데이트: {saveResults.updated}개
                    </span>
                  </div>

                  {saveResults.duplicates > 0 && (
                    <div style={{
                      padding: '12px 20px',
                      backgroundColor: '#fff5f3',
                      borderRadius: '8px',
                      border: '1px solid #ffccb8',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <svg width="16" height="16" fill="#FF3D00" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#7c2d12' }}>
                        중복: {saveResults.duplicates}개
                      </span>
                    </div>
                  )}

                  {saveResults.errors > 0 && (
                    <div style={{
                      padding: '12px 20px',
                      backgroundColor: '#fef2f2',
                      borderRadius: '8px',
                      border: '1px solid #fecaca',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <svg width="16" height="16" fill="#ef4444" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#7f1d1d' }}>
                        오류: {saveResults.errors - (saveResults.duplicates || 0)}개
                      </span>
                    </div>
                  )}
                </div>
              )}

              {errorOrders.length > 0 && (
                <div style={{
                  marginBottom: '24px',
                  padding: '16px',
                  backgroundColor: '#fef2f2',
                  borderRadius: '8px',
                  border: '1px solid #fecaca',
                  textAlign: 'left'
                }}>
                  <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#dc2626', marginBottom: '8px' }}>
                    오류 발생 주문 ({errorOrders.length}개)
                  </h4>
                  <div style={{ fontSize: '12px', color: '#7f1d1d', maxHeight: '150px', overflowY: 'auto' }}>
                    {errorOrders.map((error, index) => (
                      <div key={`error-${error.order_id}-${index}`} style={{ marginBottom: '4px' }}>
                        • {error.order_id}: {error.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={resetAll}
                style={{
                  padding: '12px 32px',
                  backgroundColor: '#FF3D00',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                새 파일 업로드
              </button>
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

export default OrderUploadPage;