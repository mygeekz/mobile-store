
import React, { useState, useEffect, ChangeEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import moment from 'jalali-moment';

import { 
    InstallmentSaleDetailData, 
    InstallmentPaymentRecord,
    InstallmentCheckInfo,
    NotificationMessage,
    CheckStatus,
    InstallmentPaymentStatus,
} from '../types';
import Notification from '../components/Notification';
import Modal from '../components/Modal';
// ShamsiDatePicker not directly used here now, but kept for potential future use in edit modes.

const CHECK_STATUSES_OPTIONS: CheckStatus[] = ["در جریان وصول", "وصول شده", "برگشت خورده", "نزد مشتری", "باطل شده"];

const InstallmentSaleDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [saleData, setSaleData] = useState<InstallmentSaleDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  const [isEditCheckModalOpen, setIsEditCheckModalOpen] = useState(false);
  const [editingCheck, setEditingCheck] = useState<InstallmentCheckInfo | null>(null);
  
  const fetchInstallmentSaleDetail = async () => {
    if (!id) {
      navigate('/installment-sales');
      return;
    }
    setIsLoading(true);
    setNotification(null);
    try {
      const response = await fetch(`/api/installment-sales/${id}`);
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'خطا در دریافت جزئیات فروش اقساطی');
      }
      setSaleData(result.data);
    } catch (error: any) {
      setNotification({ type: 'error', text: error.message });
      if (error.message.includes('یافت نشد')) {
        setTimeout(() => navigate('/installment-sales'), 2000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInstallmentSaleDetail();
  }, [id]);


  const handlePaymentStatusChange = async (paymentId: number, newStatus: boolean) => {
    if (!saleData || !paymentId) return;
    
    const paymentToUpdate = saleData.payments.find(p => p.id === paymentId);
    if (!paymentToUpdate) return;

    // Optimistic update for UI responsiveness (optional, but good UX)
    const originalPayments = [...saleData.payments];
    const updatedPayments = saleData.payments.map(p => 
        p.id === paymentId 
        ? { ...p, status: newStatus ? 'پرداخت شده' : ('پرداخت نشده' as InstallmentPaymentStatus), paymentDate: newStatus ? moment().locale('fa').format('YYYY/MM/DD') : null } 
        : p
    );
    setSaleData(prev => prev ? ({ ...prev, payments: updatedPayments }) : null);


    try {
      const response = await fetch(`/api/installment-sales/payment/${paymentId}`, {
         method: 'PUT', 
         headers: {'Content-Type': 'application/json'},
         body: JSON.stringify({ paid: newStatus, paymentDate: newStatus ? moment().locale('fa').format('YYYY/MM/DD') : undefined }) 
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'خطا در به‌روزرسانی وضعیت قسط');
      }
      setNotification({type: 'success', text: `وضعیت قسط به‌روز شد.`});
      fetchInstallmentSaleDetail(); // Re-fetch to get accurate overall status and remaining amounts
    } catch (error: any) {
      setNotification({ type: 'error', text: `خطا در به‌روزرسانی وضعیت قسط: ${error.message}` });
      // Revert optimistic update if API call fails
      setSaleData(prev => prev ? ({ ...prev, payments: originalPayments }) : null);
    }
  };
  
  const openEditCheckModal = (check: InstallmentCheckInfo) => {
    setEditingCheck({...check}); // Create a copy for editing
    setIsEditCheckModalOpen(true);
  };

  const handleEditCheckChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!editingCheck) return;
    const { name, value } = e.target;
    setEditingCheck(prev => prev ? ({ ...prev, [name]: name === 'amount' ? Number(value) : value }) : null);
  };
  
  const handleSaveCheckChanges = async () => {
    if (!editingCheck || !editingCheck.id || !saleData) return;
    
    const originalChecks = [...saleData.checks];
    const updatedChecks = saleData.checks.map(c => c.id === editingCheck.id ? editingCheck : c);
    setSaleData(prev => prev ? {...prev, checks: updatedChecks} : null);


    try {
      const response = await fetch(`/api/installment-sales/check/${editingCheck.id}`, { 
        method: 'PUT', 
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ status: editingCheck.status }) 
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'خطا در به‌روزرسانی وضعیت چک');
      }
      setNotification({ type: 'success', text: `وضعیت چک شماره ${editingCheck.checkNumber} به‌روز شد.`});
      setIsEditCheckModalOpen(false);
      setEditingCheck(null);
      fetchInstallmentSaleDetail(); // Re-fetch
    } catch (error: any) {
        setNotification({ type: 'error', text: `خطا در به‌روزرسانی چک: ${error.message}`});
        setSaleData(prev => prev ? {...prev, checks: originalChecks} : null); // Revert
    }
  };


  const formatPrice = (price: number | undefined | null) => {
    if (price === undefined || price === null) return '-';
    return price.toLocaleString('fa-IR') + ' تومان';
  };
  
  const formatDate = (shamsiDate: string | null | undefined, format: string = 'YYYY/MM/DD') => {
    if (!shamsiDate) return '-';
    return moment(shamsiDate, 'YYYY/MM/DD').locale('fa').format(format);
  };

  const getPaymentStatusColor = (status: InstallmentPaymentStatus, dueDate?: string): string => {
    if (status === 'پرداخت شده') return 'bg-green-100 text-green-700';
    if (status === 'پرداخت نشده' && dueDate && moment(dueDate, 'YYYY/MM/DD').isBefore(moment(), 'day')) return 'bg-red-100 text-red-700'; // Overdue
    return 'bg-yellow-100 text-yellow-700'; // پرداخت نشده (Not overdue or unknown)
  };
  
  const getCheckStatusColor = (status: CheckStatus): string => {
    if (status === 'وصول شده') return 'bg-green-100 text-green-700';
    if (status === 'برگشت خورده' || status === 'باطل شده') return 'bg-red-100 text-red-700';
    if (status === 'نزد مشتری') return 'bg-blue-100 text-blue-700';
    return 'bg-yellow-100 text-yellow-700'; // در جریان وصول
  };


  if (isLoading) return <div className="p-6 text-center"><i className="fas fa-spinner fa-spin text-2xl text-indigo-600"></i> در حال بارگذاری...</div>;
  if (!saleData) return <div className="p-6 text-center text-red-500">اطلاعات فروش اقساطی یافت نشد.</div>;

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <Notification message={notification} onClose={() => setNotification(null)} />

      {/* Sale Summary */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-3 border-b pb-2">خلاصه فروش اقساطی (شناسه: {saleData.id.toLocaleString('fa-IR')})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <p><strong>مشتری:</strong> <Link to={`/customers/${saleData.customerId}`} className="text-indigo-600 hover:underline">{saleData.customerFullName}</Link></p>
          <p><strong>موبایل:</strong> {saleData.phoneModel} (IMEI: {saleData.phoneImei})</p>
          <p><strong>قیمت فروش نهایی:</strong> {formatPrice(saleData.actualSalePrice)}</p>
          <p><strong>پیش پرداخت:</strong> {formatPrice(saleData.downPayment)}</p>
          <p><strong>تعداد اقساط:</strong> {saleData.numberOfInstallments.toLocaleString('fa-IR')} ماه</p>
          <p><strong>مبلغ هر قسط:</strong> {formatPrice(saleData.installmentAmount)}</p>
          <p><strong>تاریخ شروع اقساط:</strong> {formatDate(saleData.installmentsStartDate)}</p>
          <p><strong>مبلغ کل اقساط (محاسباتی):</strong> {formatPrice(saleData.totalInstallmentPrice)}</p>
          <p className="font-bold text-indigo-700"><strong>مبلغ باقیمانده:</strong> {formatPrice(saleData.remainingAmount)}</p>
          <p><strong>وضعیت کلی:</strong> <span className={`px-2 py-0.5 text-xs rounded-full ${getPaymentStatusColor(saleData.overallStatus === 'معوق' ? 'دیرکرد' : saleData.overallStatus === 'تکمیل شده' ? 'پرداخت شده' : 'پرداخت نشده')}`}>{saleData.overallStatus}</span></p>
          {saleData.notes && <p className="md:col-span-2"><strong>یادداشت:</strong> {saleData.notes}</p>}
        </div>
      </div>

      {/* Checks Information */}
      {saleData.checks && saleData.checks.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-3 border-b pb-2">اطلاعات چک‌ها</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">شماره چک</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">بانک</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">تاریخ سررسید</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">مبلغ</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">وضعیت</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">عملیات</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {saleData.checks.map(check => (
                  <tr key={check.id}>
                    <td className="px-3 py-2 whitespace-nowrap">{check.checkNumber}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{check.bankName}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatDate(check.dueDate)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatPrice(check.amount)}</td>
                    <td className="px-3 py-2 whitespace-nowrap"><span className={`px-2 py-0.5 text-xs rounded-full ${getCheckStatusColor(check.status)}`}>{check.status}</span></td>
                    <td className="px-3 py-2"><button onClick={() => openEditCheckModal(check)} className="text-xs text-blue-600 hover:text-blue-800">ویرایش</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {isEditCheckModalOpen && editingCheck && (
          <Modal title={`ویرایش چک شماره ${editingCheck.checkNumber}`} onClose={() => setIsEditCheckModalOpen(false)}>
              <div className="space-y-3 p-1 text-sm">
                  <div><label className="block text-xs font-medium text-gray-700">شماره چک:</label> <input type="text" value={editingCheck.checkNumber} disabled className="mt-1 w-full p-1.5 border bg-gray-100 border-gray-300 rounded"/></div>
                  <div><label className="block text-xs font-medium text-gray-700">بانک:</label> <input type="text" value={editingCheck.bankName} disabled className="mt-1 w-full p-1.5 border bg-gray-100 border-gray-300 rounded"/></div>
                  <div><label className="block text-xs font-medium text-gray-700">مبلغ:</label> <input type="text" value={formatPrice(editingCheck.amount)} disabled className="mt-1 w-full p-1.5 border bg-gray-100 border-gray-300 rounded"/></div>
                  
                  <div>
                    <label htmlFor="checkStatus" className="block text-xs font-medium text-gray-700">وضعیت چک:</label>
                    <select id="checkStatus" name="status" value={editingCheck.status} onChange={handleEditCheckChange} className="mt-1 w-full p-1.5 border bg-white border-gray-300 rounded shadow-sm">
                        {CHECK_STATUSES_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="flex justify-end pt-2">
                      <button onClick={() => setIsEditCheckModalOpen(false)} className="ml-2 px-3 py-1.5 text-xs bg-gray-200 rounded hover:bg-gray-300">انصراف</button>
                      <button onClick={handleSaveCheckChanges} className="px-3 py-1.5 bg-blue-500 text-white text-xs rounded hover:bg-blue-600">ذخیره تغییرات چک</button>
                  </div>
              </div>
          </Modal>
      )}

      {/* Installment Payments */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-3 border-b pb-2">جدول پرداخت اقساط</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-right font-medium text-gray-500">#</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500">تاریخ سررسید</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500">مبلغ قسط</th>
                <th className="px-3 py-2 text-center font-medium text-gray-500">وضعیت</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500">تاریخ پرداخت</th>
                <th className="px-3 py-2 text-center font-medium text-gray-500">پرداخت شد</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {saleData.payments.map((payment, index) => (
                <tr key={payment.id || index} className={`${getPaymentStatusColor(payment.status, payment.dueDate).includes('red') ? 'bg-red-50' : ''}`}>
                  <td className="px-3 py-2 whitespace-nowrap">{payment.installmentNumber.toLocaleString('fa-IR')}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatDate(payment.dueDate)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatPrice(payment.amountDue)}</td>
                  <td className="px-3 py-2 text-center whitespace-nowrap">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${getPaymentStatusColor(payment.status, payment.dueDate)}`}>
                      {payment.status}
                      {payment.status === 'پرداخت نشده' && payment.dueDate && moment(payment.dueDate, 'YYYY/MM/DD').isBefore(moment(), 'day') ? ' (معوق)' : ''}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{payment.paymentDate ? formatDate(payment.paymentDate) : '-'}</td>
                  <td className="px-3 py-2 text-center">
                    <input 
                      type="checkbox"
                      className="form-checkbox h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
                      checked={payment.status === 'پرداخت شده'}
                      onChange={(e) => payment.id && handlePaymentStatusChange(payment.id, e.target.checked)}
                      disabled={!payment.id}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
       <div className="bg-white p-6 rounded-lg shadow">
           <h3 className="text-lg font-semibold mb-3 border-b pb-2">اعلان‌های مربوط به این فروش</h3>
           {saleData.payments.filter(p=> p.status === 'پرداخت نشده' && p.dueDate && moment(p.dueDate, 'YYYY/MM/DD').isSameOrAfter(moment(), 'day') ).slice(0,1).map(p => (
             <div key={`noti-${p.id}`} className="p-3 bg-yellow-50 border-r-4 border-yellow-400 text-yellow-700 text-sm">
               <i className="fas fa-bell ml-2"></i>
               قسط شماره {p.installmentNumber.toLocaleString('fa-IR')} به مبلغ {formatPrice(p.amountDue)} در تاریخ {formatDate(p.dueDate)} سررسید می‌شود.
            </div>
           ))}
           {saleData.payments.filter(p=> p.status === 'پرداخت نشده' && p.dueDate && moment(p.dueDate, 'YYYY/MM/DD').isBefore(moment(), 'day') ).slice(0,1).map(p => (
             <div key={`overdue-noti-${p.id}`} className="p-3 bg-red-50 border-r-4 border-red-400 text-red-700 text-sm">
               <i className="fas fa-exclamation-triangle ml-2"></i>
               قسط شماره {p.installmentNumber.toLocaleString('fa-IR')} به مبلغ {formatPrice(p.amountDue)} با تاریخ سررسید {formatDate(p.dueDate)} معوق شده است.
            </div>
           ))}
           {saleData.payments.filter(p=> p.status === 'پرداخت نشده').length === 0 && <p className="text-sm text-gray-500">در حال حاضر اعلان خاصی برای این فروش وجود ندارد.</p>}
       </div>
    </div>
  );
};

export default InstallmentSaleDetailPage;
