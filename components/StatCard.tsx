
import React from 'react';
import { StatCardData } from '../types';

const StatCard: React.FC<StatCardData> = ({ title, value, icon, iconBgColor, iconTextColor, trendPercentage, trendDirection, trendText }) => {
  const trendColor = trendDirection === 'up' ? 'text-green-500' : 'text-red-500';
  const trendIcon = trendDirection === 'up' ? 'fa-solid fa-arrow-up' : 'fa-solid fa-arrow-down';

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 text-right"> {/* Added text-right */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`w-12 h-12 ${iconBgColor} rounded-lg flex items-center justify-center`}>
          <i className={`${icon} ${iconTextColor} text-xl`}></i>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-end"> {/* Added justify-end for RTL trend alignment */}
        <span className="text-gray-500 text-sm mr-2">{trendText}</span> {/* Changed ml-2 to mr-2 and swapped order with percentage */}
        <span className={`${trendColor} text-sm font-medium flex items-center`}>
          {trendPercentage}% <i className={`${trendIcon} ml-1 text-xs`}></i> {/* Changed mr-1 to ml-1 and swapped order */}
        </span>
      </div>
    </div>
  );
};

export default StatCard;
