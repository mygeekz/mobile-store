
import React, { useEffect } from 'react';
import { NotificationMessage } from '../types';

interface NotificationProps {
  message: NotificationMessage | null;
  onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({ message, onClose }) => {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000); // Auto-close after 3 seconds
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  if (!message) return null;

  const baseStyles = "fixed bottom-5 right-5 p-4 rounded-lg shadow-xl text-white text-right z-50 transition-all duration-300 ease-in-out";
  const typeStyles = message.type === 'success' 
    ? 'bg-green-600 hover:bg-green-700' 
    : 'bg-red-600 hover:bg-red-700';

  return (
    <div className={`${baseStyles} ${typeStyles}`} role="alert" dir="rtl">
      <div className="flex items-center justify-between">
        <p className="font-medium">{message.text}</p>
        <button 
          onClick={onClose} 
          className="ml-3 -mr-1 text-xl font-bold leading-none hover:text-gray-200 focus:outline-none" 
          aria-label="بستن"
        >
          &times;
        </button>
      </div>
    </div>
  );
};

export default Notification;
