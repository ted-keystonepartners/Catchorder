/**
 * 통합 모달 컴포넌트 - Tailwind CSS 기반
 */
import React, { useEffect } from 'react';
import Button from './Button.jsx';

/**
 * 모달 컴포넌트
 * @param {Object} props
 * @param {boolean} props.isOpen - 모달 열림 상태
 * @param {Function} props.onClose - 모달 닫기 핸들러
 * @param {string} props.title - 모달 제목
 * @param {React.ReactNode} props.children - 모달 내용
 * @param {boolean} props.showCloseButton - X 버튼 표시 여부
 * @param {boolean} props.closeOnBackdropClick - 배경 클릭시 닫기
 * @param {boolean} props.closeOnEscape - ESC 키로 닫기
 * @param {'sm' | 'md' | 'lg' | 'xl' | 'full'} props.size - 모달 크기
 * @param {Array} props.actions - 액션 버튼들
 * @param {string} props.className - 추가 CSS 클래스
 */
const Modal = ({
  isOpen = false,
  onClose,
  title,
  children,
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  size = 'md',
  actions = [],
  className = ''
}) => {
  // ESC 키 이벤트 리스너
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  // 스크롤 제어
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // 크기별 스타일
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    full: 'max-w-full mx-4'
  };

  const backdropClasses = [
    'fixed inset-0 z-50 flex items-center justify-center',
    'bg-black bg-opacity-50 backdrop-blur-sm',
    'animate-fadeIn'
  ].join(' ');

  const modalClasses = [
    'relative bg-white shadow-2xl',
    'rounded-xl md:rounded-xl', // No rounded corners on mobile for fullscreen
    'w-full mx-0 md:mx-4',
    'h-full md:h-auto md:max-h-[90vh]', // Fullscreen on mobile
    'overflow-hidden',
    'transform transition-all duration-300',
    'md:animate-slideUp', // Animation only on desktop
    sizeClasses[size] || sizeClasses.md,
    className
  ].join(' ');

  const headerClasses = [
    'flex items-center justify-between',
    'px-6 py-4 border-b border-gray-200',
    'bg-gray-50'
  ].join(' ');

  const bodyClasses = [
    'px-6 py-4 overflow-y-auto',
    'max-h-[calc(90vh-140px)]'
  ].join(' ');

  const footerClasses = [
    'flex items-center justify-end gap-3',
    'px-6 py-4 border-t border-gray-200',
    'bg-gray-50'
  ].join(' ');

  // 배경 클릭 핸들러
  const handleBackdropClick = (e) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose?.();
    }
  };

  // X 아이콘
  const CloseIcon = () => (
    <svg 
      className="w-6 h-6" 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M6 18L18 6M6 6l12 12" 
      />
    </svg>
  );

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translate(-50%, -40%) scale(0.95);
          }
          to { 
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-slideUp {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation: slideUp 0.3s ease-out;
        }
      `}</style>

      <div 
        className={backdropClasses}
        onClick={handleBackdropClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        <div className={modalClasses}>
          {/* Header */}
          {(title || showCloseButton) && (
            <div className={headerClasses}>
              <div>
                {title && (
                  <h3 
                    id="modal-title"
                    className="text-lg font-semibold text-gray-900"
                  >
                    {title}
                  </h3>
                )}
              </div>
              
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors rounded-md hover:bg-gray-100"
                  aria-label="모달 닫기"
                >
                  <CloseIcon />
                </button>
              )}
            </div>
          )}

          {/* Body */}
          <div className={bodyClasses}>
            {children}
          </div>

          {/* Footer */}
          {actions.length > 0 && (
            <div className={footerClasses}>
              {actions.map((action, index) => (
                <Button key={index} {...action}>
                  {action.children}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// 확인 모달 (편의 컴포넌트)
export const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = '확인',
  message,
  confirmText = '확인',
  cancelText = '취소',
  confirmVariant = 'danger',
  ...props
}) => {
  const actions = [
    {
      children: cancelText,
      variant: 'ghost',
      onClick: onClose
    },
    {
      children: confirmText,
      variant: confirmVariant,
      onClick: () => {
        onConfirm?.();
        onClose?.();
      }
    }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      actions={actions}
      size="sm"
      {...props}
    >
      <p className="text-gray-600">{message}</p>
    </Modal>
  );
};

// 알림 모달 (편의 컴포넌트)
export const AlertModal = ({
  isOpen,
  onClose,
  title = '알림',
  message,
  buttonText = '확인',
  ...props
}) => {
  const actions = [
    {
      children: buttonText,
      variant: 'primary',
      onClick: onClose
    }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      actions={actions}
      size="sm"
      {...props}
    >
      <p className="text-gray-600">{message}</p>
    </Modal>
  );
};

export default Modal;