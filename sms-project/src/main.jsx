import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// 잘못된 API URL이 캐시된 경우 제거
if (typeof window !== 'undefined') {
  const oldApiUrl = 'mk04952lrj';
  const correctApiUrl = 'l0dtib1m19';
  
  // localStorage 정리
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value && value.includes(oldApiUrl)) {
        localStorage.removeItem(key);
      }
    });
  } catch (e) {
    console.error('Error cleaning localStorage:', e);
  }
  
  // sessionStorage 정리
  try {
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
      const value = sessionStorage.getItem(key);
      if (value && value.includes(oldApiUrl)) {
        sessionStorage.removeItem(key);
      }
    });
  } catch (e) {
    console.error('Error cleaning sessionStorage:', e);
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
