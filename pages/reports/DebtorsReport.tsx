
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DebtorReportItem, NotificationMessage } from '../../types';
import Notification from '../../components/Notification';

const formatBalance = (balance: number) => {
  // Debtors always have a positive balance (they owe us)
  return <span className="text-red-600 font-semibold">{balance.toLocaleString('fa-IR')} تومان (بدهکار)</span>;
};

const DebtorsReportPage: React.FC = () => {
  const [debtors, setDebtors] = useState<DebtorReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  const fetchDebtors = async () => {
    setIsLoading(true);
    setNotification(null);
    try {
      const response = await fetch('/api/reports/debtors');
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'خطا در دریافت لیست بدهکاران');
      }
      setDebtors(result.data);
    } catch (error) {
      setNotification({ type: 'error', text: (error as Error).message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDebtors();
  }, []);

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <Notification message={notification} onClose={() => setNotification(null)} />

      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-3 border-b pb-4">
            <h2 className="text-xl font-semibold text-gray-800">گزارش مشتریان بدهکار</h2>
            <button
                onClick={fetchDebtors}
                disabled={isLoading}
                className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-indigo-400 transition-colors text-sm"
            >
                <i className={`fas fa-sync-alt ml-2 ${isLoading ? 'fa-spin' : ''}`}></i>
                به‌روزرسانی لیست
            </button>
        </div>
        
        {isLoading ? (
          <div className="p-10 text-center text-gray-500"><i className="fas fa-spinner fa-spin text-3xl mb-3"></i><p>در حال بارگذاری لیست بدهکاران...</p></div>
        ) : debtors.length === 0 ? (
          <div className="p-10 text-center text-gray-500"><i className="fas fa-check-circle text-3xl text-green-500 mb-3"></i><p>در حال حاضر هیچ مشتری بدهکاری وجود ندارد.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">نام کامل مشتری</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">شماره تماس</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">مبلغ بدهی</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">عملیات</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {debtors.map(debtor => (
                  <tr key={debtor.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{debtor.fullName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700" dir="ltr">{debtor.phoneNumber || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {formatBalance(debtor.balance)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link to={`/customers/${debtor.id}`} className="text-indigo-600 hover:text-indigo-800 transition-colors">
                        مشاهده جزئیات حساب
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

export default DebtorsReportPage;
