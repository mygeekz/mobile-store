
import React, { ReactNode, useEffect, useState } from 'react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  widthClass?: string; // e.g., 'max-w-md', 'max-w-lg', 'max-w-xl'
}

const Modal: React.FC<ModalProps> = ({ title, onClose, children, widthClass = 'max-w-md' }) => {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Trigger animation shortly after mount
    const timer = setTimeout(() => {
      setShowContent(true);
    }, 10); // Small delay for CSS transition to pick up initial state

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  return (
    <div 
      className={`fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out ${showContent ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      onClick={onClose} // Close on overlay click
      dir="rtl" // Ensure modal context is RTL
    >
      <div
        className={`bg-white rounded-xl shadow-2xl ${widthClass} w-full m-auto flex flex-col max-h-[90vh] transition-all duration-200 ease-out ${showContent ? 'transform scale-100 opacity-100' : 'transform scale-95 opacity-0 pointer-events-none'}`}
        onClick={(e) => e.stopPropagation()} // Prevent close when clicking inside modal content
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-2xl leading-none"
            aria-label="بستن"
          >
            &times;
          </button>
        </div>
        <div className="p-5 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
