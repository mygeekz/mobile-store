import React, { useState, useEffect, ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import moment from 'jalali-moment';
import { SalesTransactionEntry, NotificationMessage } from '../types';
import Notification from '../components/Notification';

const InvoicesPage: React.FC = () => {
  const [sales, setSales] = useState<SalesTransactionEntry[]>([]);
  const [filteredSales, setFilteredSales] = useState<SalesTransactionEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchSales = async () => {
    setIsLoading(true);
    setNotification(null);
    try {
      const response = await fetch('/api/sales');
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'خطا در دریافت لیست فروش‌ها');
      }
      setSales(result.data);
      setFilteredSales(result.data);
    } catch (error) {
      setNotification({ type: 'error', text: (error as Error).message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  useEffect(() => {
    const lowerSearchTerm = searchTerm.toLowerCase().trim();
    if (!lowerSearchTerm) {
      setFilteredSales(sales);
      return;
    }
    const filtered = sales.filter(sale =>
      String(sale.id).includes(lowerSearchTerm) ||
      sale.itemName.toLowerCase().includes(lowerSearchTerm) ||
      (sale.customerFullName && sale.customerFullName.toLowerCase().includes(lowerSearchTerm)) ||
      sale.transactionDate.includes(lowerSearchTerm) // Shamsi date search
    );
    setFilteredSales(filtered);
  }, [searchTerm, sales]);

  const formatPrice = (price: number | undefined | null) => {
    if (price === undefined || price === null) return '-';
    return price.toLocaleString('fa-IR') + ' تومان';
  };
  
  const formatDateForDisplay = (shamsiDate: string | undefined | null) => {
    if (!shamsiDate) return 'نامشخص';
    return moment(shamsiDate, 'YYYY/MM/DD', 'fa').format('YYYY/MM/DD');
  };


  return (
    <div className="space-y-6 text-right" dir="rtl">
      <Notification message={notification} onClose={() => setNotification(null)} />

      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
          <h2 className="text-xl font-semibold text-gray-800">فاکتورهای فروش</h2>
           <div className="relative w-full sm:w-72">
            <input
              type="text"
              placeholder="جستجو بر اساس شناسه، نام کالا، مشتری، تاریخ..."
              value={searchTerm}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm outline-none text-right"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <i className="fa-solid fa-search text-gray-400"></i>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="p-10 text-center text-gray-500"><i className="fas fa-spinner fa-spin text-3xl mb-3"></i><p>در حال بارگذاری لیست فروش‌ها...</p></div>
        ) : sales.length === 0 ? (
          <div className="p-10 text-center text-gray-500"><i className="fas fa-file-invoice-dollar text-3xl text-gray-400 mb-3"></i><p>هنوز هیچ فروشی برای صدور فاکتور ثبت نشده است.</p></div>
        ) : filteredSales.length === 0 && searchTerm ? (
           <div className="p-10 text-center text-gray-500"><i className="fas fa-search-minus text-3xl text-gray-400 mb-3"></i><p>فروشی با مشخصات وارد شده یافت نشد.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">شناسه فروش</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">تاریخ</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">نام کالا</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">مشتری</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">مبلغ کل</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">عملیات</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSales.map(sale => (
                  <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{sale.id.toLocaleString('fa-IR')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatDateForDisplay(sale.transactionDate)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{sale.itemName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{sale.customerFullName || (sale.customerId ? 'مشتری حذف شده' : 'مهمان')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-indigo-700">{formatPrice(sale.totalPrice)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link 
                        to={`/invoices/${sale.id}`} 
                        className="px-3 py-1.5 bg-sky-500 text-white text-xs rounded-md hover:bg-sky-600 transition-colors"
                      >
                        مشاهده فاکتور
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

export default InvoicesPage;
