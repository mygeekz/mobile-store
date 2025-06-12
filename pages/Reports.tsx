
import React from 'react';
import { Link } from 'react-router-dom';
import { ReportCardItem } from '../types';

const reportItems: ReportCardItem[] = [
  {
    id: 'sales-summary',
    title: 'گزارش فروش و سود',
    description: 'تحلیل جامع فروش، درآمد و سودآوری در بازه‌های زمانی مختلف.',
    icon: 'fa-solid fa-chart-line',
    path: '/reports/sales-summary',
  },
  {
    id: 'debtors',
    title: 'گزارش بدهکاران',
    description: 'لیست مشتریانی که به کسب و کار شما بدهکار هستند.',
    icon: 'fa-solid fa-user-clock',
    path: '/reports/debtors',
  },
  {
    id: 'creditors',
    title: 'گزارش بستانکاران',
    description: 'لیست همکاران و تامین‌کنندگانی که شما به آنها بدهکار هستید.',
    icon: 'fa-solid fa-building-shield',
    path: '/reports/creditors',
  },
  {
    id: 'top-customers',
    title: 'مشتریان برتر',
    description: 'شناسایی و تحلیل مشتریان با بیشترین حجم خرید.',
    icon: 'fa-solid fa-star',
    path: '/reports/top-customers',
  },
  {
    id: 'top-suppliers',
    title: 'تامین کنندگان برتر',
    description: 'شناسایی و تحلیل تامین‌کنندگان کلیدی بر اساس حجم خرید.',
    icon: 'fa-solid fa-truck-fast',
    path: '/reports/top-suppliers',
  },
];

const ReportsHub: React.FC = () => {
  return (
    <div className="space-y-8 text-right" dir="rtl">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6 border-b pb-4">مرکز گزارشات</h2>
        <p className="text-gray-600 mb-8">
          از این بخش برای دسترسی به گزارشات تحلیلی مختلف در مورد عملکرد کسب و کار خود استفاده کنید.
          این گزارشات به شما کمک می‌کنند تا تصمیمات آگاهانه‌تری برای رشد و بهبود فعالیت‌های خود بگیرید.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reportItems.map((item) => (
            <Link
              key={item.id}
              to={item.path}
              className="block bg-gradient-to-br from-indigo-50 via-white to-sky-50 p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 ease-in-out border border-gray-200 hover:border-indigo-300 group"
            >
              <div className="flex items-center mb-3">
                <div className="p-3 bg-indigo-100 rounded-full mr-4 group-hover:bg-indigo-200 transition-colors">
                  <i className={`${item.icon} text-2xl text-indigo-600 group-hover:text-indigo-700 transition-colors`}></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 group-hover:text-indigo-700 transition-colors">{item.title}</h3>
              </div>
              <p className="text-sm text-gray-600 group-hover:text-gray-700 transition-colors">{item.description}</p>
              <div className="mt-4 text-indigo-600 group-hover:text-indigo-800 font-medium text-sm transition-colors">
                مشاهده گزارش <i className="fas fa-arrow-left mr-2"></i>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReportsHub;
