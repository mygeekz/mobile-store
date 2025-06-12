import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import moment from 'jalali-moment';

import { TopSupplierReportItem, NotificationMessage } from '../../types';
import Notification from '../../components/Notification';
import ShamsiDatePicker from '../../components/ShamsiDatePicker'; // New

const formatPrice = (price: number) => {
  return price.toLocaleString('fa-IR') + ' تومان';
};

const TopSuppliersReportPage: React.FC = () => {
  const [topSuppliers, setTopSuppliers] = useState<TopSupplierReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);
  
  const [startDate, setStartDate] = useState<Date | null>(moment().subtract(30, 'days').toDate());
  const [endDate, setEndDate] = useState<Date | null>(new Date());

  const fetchTopSuppliers = async () => {
    if (!startDate || !endDate) {
      setNotification({ type: 'error', text: 'لطفاً تاریخ شروع و پایان را انتخاب کنید.' });
      return;
    }
    setIsLoading(true);
    setNotification(null);
    setTopSuppliers([]);

    const fromDateShamsi = moment(startDate).locale('fa').format('YYYY/MM/DD');
    const toDateShamsi = moment(endDate).locale('fa').format('YYYY/MM/DD');

    try {
      const response = await fetch(`/api/reports/top-suppliers?fromDate=${fromDateShamsi}&toDate=${toDateShamsi}`);
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'خطا در دریافت گزارش تامین‌کنندگان برتر');
      }
      setTopSuppliers(result.data);
    } catch (error) {
      setNotification({ type: 'error', text: (error as Error).message });
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchTopSuppliers();
  }, []);

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <Notification message={notification} onClose={() => setNotification(null)} />

      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-3">گزارش تامین‌کنندگان برتر (بر اساس ارزش خرید کالا)</h2>
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
          <div className="w-full sm:w-auto">
            <label htmlFor="startDatePicker" className="block text-sm font-medium text-gray-700 mb-1">از تاریخ:</label>
            <ShamsiDatePicker
              id="startDatePicker"
              selectedDate={startDate}
              onDateChange={setStartDate}
              inputClassName="w-full p-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>
          <div className="w-full sm:w-auto">
            <label htmlFor="endDatePicker" className="block text-sm font-medium text-gray-700 mb-1">تا تاریخ:</label>
            <ShamsiDatePicker
              id="endDatePicker"
              selectedDate={endDate}
              onDateChange={(date) => {
                if (startDate && date && date < startDate) {
                  setEndDate(startDate);
                } else {
                  setEndDate(date);
                }
              }}
              inputClassName="w-full p-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>
          <button
            onClick={fetchTopSuppliers}
            disabled={isLoading}
            className="w-full sm:w-auto mt-3 sm:mt-0 self-end px-5 py-2.5 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:bg-teal-400 transition-colors"
          >
            {isLoading ? 'درحال بارگذاری...' : 'اعمال فیلتر'}
          </button>
        </div>

        {isLoading && topSuppliers.length === 0 && (
          <div className="p-10 text-center text-gray-500"><i className="fas fa-spinner fa-spin text-3xl mb-3"></i><p>در حال بارگذاری گزارش...</p></div>
        )}
        {!isLoading && topSuppliers.length === 0 && (
          <div className="p-10 text-center text-gray-500"><i className="fas fa-truck text-3xl text-gray-400 mb-3"></i><p>تامین‌کننده برتری در بازه زمانی انتخاب شده یافت نشد یا هنوز داده‌ای برای نمایش وجود ندارد.</p></div>
        )}
        
        {topSuppliers.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">رتبه</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">نام تامین‌کننده</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">مجموع ارزش خرید کالا</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">تعداد تراکنش‌های دریافت کالا</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">مشاهده پروفایل</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {topSuppliers.map((supplier, index) => (
                  <tr key={supplier.partnerId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">{(index + 1).toLocaleString('fa-IR')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{supplier.partnerName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-700 font-semibold">{formatPrice(supplier.totalPurchaseValue)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{supplier.transactionCount.toLocaleString('fa-IR')}</td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link to={`/partners/${supplier.partnerId}`} className="text-teal-600 hover:text-teal-800 transition-colors">
                        مشاهده جزئیات
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TopSuppliersReportPage;