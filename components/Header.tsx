
import React, { useState, useEffect, useRef } from 'react';
import { USER_PROFILE } from '../constants';

interface HeaderProps {
  pageTitle: string;
}

const Header: React.FC<HeaderProps> = ({ pageTitle }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const toggleProfileMenu = () => setIsProfileMenuOpen(!isProfileMenuOpen);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-10">
      <h2 className="text-xl font-semibold text-gray-800">{pageTitle}</h2>
      
      <div className="flex-1 max-w-lg mx-auto px-4">
        <div className="relative">
          <input
            type="text"
            placeholder="جستجو..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2 border-none rounded-full bg-gray-100 focus:bg-white focus:ring-2 focus:ring-indigo-500 text-sm outline-none text-right" /* pr-10, pl-4, text-right */
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none"> {/* right-0, pr-3 */}
            <i className="fa-solid fa-search text-gray-400"></i>
          </div>
        </div>
      </div>
      
      <div className="relative" ref={profileMenuRef}>
        <button 
          onClick={toggleProfileMenu}
          className="flex items-center space-x-3 space-x-reverse cursor-pointer focus:outline-none p-1 rounded-full hover:bg-gray-100" /* Added space-x-reverse */
        >
          <i className={`fa-solid fa-chevron-down text-gray-400 text-xs transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''} ml-2`}></i> {/* Added ml-2 for spacing from text */}
          <div className="hidden md:block text-right"> {/* text-right */}
            <p className="text-sm font-medium text-gray-700">{USER_PROFILE.name}</p>
            <p className="text-xs text-gray-500">{USER_PROFILE.role}</p>
          </div>
           <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-sm">
            <i className="fa-solid fa-user"></i>
          </div>
        </button>
        
        {isProfileMenuOpen && (
          <div className="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-20 border border-gray-200 text-right"> {/* left-0, text-right */}
            <a href="#profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">پروفایل شما</a>
            <a href="#settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">تنظیمات</a>
            <a href="#logout" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">خروج</a>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
