import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { NavItem } from '../types';
import { SIDEBAR_ITEMS } from '../constants';

const Sidebar: React.FC = () => {
  // State for store name with a default value
  const [storeName, setStoreName] = useState('فروشگاه کوروش');
  // State for the logo URL
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  // Loading state to prevent UI flicker
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetches both store name and logo path from the settings API
    const fetchStoreSettings = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/settings');
        if (!response.ok) {
          throw new Error('پاسخ شبکه برای تنظیمات صحیح نبود');
        }
        const result = await response.json();
        if (result.success && result.data) {
          // Set store name from settings, or keep default
          setStoreName(result.data.store_name || 'فروشگاه کوروش');
          // If a logo path exists, construct the full URL
          if (result.data.store_logo_path) {
            setLogoUrl(`/uploads/${result.data.store_logo_path}`);
          }
        }
      } catch (error) {
        console.error("خطا در دریافت تنظیمات فروشگاه برای سایدبار:", error);
        // In case of an error, we simply use the default values and don't show a notification
      } finally {
        setIsLoading(false);
      }
    };

    fetchStoreSettings();
  }, []);

  return (
    <div className="w-72 bg-white border-l border-gray-200 flex flex-col fixed h-full right-0 print:hidden">
      {/* Header section of the sidebar */}
      <div className="h-16 flex items-center justify-start px-4 border-b border-gray-200 gap-3">
        {/* Conditional rendering for the logo */}
        {isLoading ? (
            // Show a pulsing placeholder while the logo is loading
            <div className="h-10 w-10 bg-gray-200 animate-pulse rounded-md"></div>
        ) : logoUrl ? (
          // If logoUrl exists, display the image
          <img src={logoUrl} alt="لوگو" className="h-10 w-10 object-contain rounded-md" />
        ) : (
          // If no logo is set, display a default store icon
          <div className="h-10 w-10 bg-indigo-100 flex items-center justify-center rounded-md">
             <i className="fa-solid fa-store text-indigo-600 text-xl"></i>
          </div>
        )}
        {/* Store Name */}
        <h1 className="text-xl font-bold text-indigo-600">{storeName}</h1>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {SIDEBAR_ITEMS.map((item: NavItem) => (
            <li key={item.id}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg whitespace-nowrap cursor-pointer text-right ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`
                }
              >
                <i className={`${item.icon} w-5 h-5 ml-3 text-base`}></i>
                {item.name}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Support Section */}
      <div className="p-4 border-t border-gray-200">
        <div className="bg-indigo-50 p-4 rounded-lg text-right">
          <h3 className="text-sm font-medium text-indigo-800">نیاز به کمک دارید؟</h3>
          <p className="text-xs text-indigo-700 mt-1">با تیم پشتیبانی ما تماس بگیرید</p>
          <a 
            href="tel:09361583838"
            className="mt-3 w-full block text-center bg-indigo-600 text-white py-2 px-4 text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            تماس با پشتیبانی (۰۹۳۶۱۵۸۳۸۳۸)
          </a>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
