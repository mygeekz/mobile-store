
import React from 'react';
import { NavLink } from 'react-router-dom';
import { NavItem } from '../types';
import { SIDEBAR_ITEMS } from '../constants';

const Sidebar: React.FC = () => {
  return (
    <div className="w-72 bg-white border-l border-gray-200 flex flex-col fixed h-full right-0"> {/* Added right-0, changed border-r to border-l */}
      <div className="h-16 flex items-center px-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-indigo-600">کوروش</h1>
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {SIDEBAR_ITEMS.map((item: NavItem) => (
            <li key={item.id}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg whitespace-nowrap cursor-pointer text-right ${ // Added text-right
                    isActive
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`
                }
              >
                <i className={`${item.icon} w-5 h-5 ml-3 text-base`}></i> {/* Changed mr-3 to ml-3 */}
                {item.name}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t border-gray-200">
        <div className="bg-indigo-50 p-4 rounded-lg text-right"> {/* Added text-right */}
          <h3 className="text-sm font-medium text-indigo-800">نیاز به کمک دارید؟</h3>
          <p className="text-xs text-indigo-700 mt-1">با تیم پشتیبانی ما تماس بگیرید</p>
          <button className="mt-3 w-full bg-indigo-600 text-white py-2 px-4 text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
            تماس با پشتیبانی
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
