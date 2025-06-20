import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import moment from 'jalali-moment';

import { 
  PartnerDetailsPageData, 
  NotificationMessage, 
  NewPartnerData, 
  PartnerLedgerEntry,
  NewLedgerEntryData,
  PurchasedItemFromPartner,
  PartnerType
} from '../types';
import Notification from '../components/Notification';
import Modal from '../components/Modal';
import ShamsiDatePicker from '../components/ShamsiDatePicker'; // New

const PARTNER_TYPES_DETAIL: PartnerType[] = ["Supplier", "Service Provider", "Other"];

const toShamsiForDisplay = (isoDateString?: string | null, format = 'YYYY/MM/DD HH:mm'): string => {
  if (!isoDateString) return 'نامشخص';
  try {
    return moment(isoDateString).locale('fa').format(format);
  } catch (e) {
    console.warn("Date conversion to Shamsi failed for:", isoDateString, e);
    return isoDateString; 
  }
};

const fromDatePickerToShamsiString = (date: Date | null): string | undefined => {
  if (!date) return undefined;
  return moment(date).locale('fa').format('YYYY/MM/DD');
};

// Converts Shamsi YYYY/MM/DD string to ISO YYYY-MM-DD string for backend ledger
const fromShamsiStringToISO = (shamsiDateString?: string): string | undefined => {
  if (!shamsiDateString) return undefined;
  return moment(shamsiDateString, 'jYYYY/jMM/jDD').isValid() ? moment(shamsiDateString, 'jYYYY/jMM/jDD').format('YYYY-MM-DD') : undefined;
};


const formatPartnerLedgerCurrency = (amount?: number, type?: 'debit' | 'credit' | 'balance') => {
  if (amount === undefined || amount === null) return <span className="text-gray-700">۰ تومان</span>;
  
  let amountStr = Math.abs(amount).toLocaleString('fa-IR') + ' تومان';
  let color = 'text-gray-700';

  if (type === 'balance') {
    if (amount > 0) {
      color = 'text-red-600 font-semibold';
      amountStr += ' (بدهی شما به همکار)';
    } else if (amount < 0) {
      color = 'text-green-700 font-semibold';
      amountStr = Math.abs(amount).toLocaleString('fa-IR') + ' تومان (طلب شما از همکار)';
    } else {
        amountStr += ' (تسویه شده)';
    }
  } else if (type === 'debit' && amount > 0) {
    color = 'text-green-600';
  } else if (type === 'credit' && amount > 0) {
    color = 'text-red-500';
  }
  
  return <span className={color}>{amountStr}</span>;
};

const PartnerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [partnerData, setPartnerData] = useState<PartnerDetailsPageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partial<NewPartnerData>>({});
  const [editFormErrors, setEditFormErrors] = useState<Partial<NewPartnerData>>({});
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const initialLedgerEntry: NewLedgerEntryData = { 
    description: '', 
    debit: 0, 
    credit: 0, 
    transactionDate: fromDatePickerToShamsiString(new Date()) 
  };
  const [newLedgerEntry, setNewLedgerEntry] = useState<NewLedgerEntryData>(initialLedgerEntry);
  const [ledgerDateSelected, setLedgerDateSelected] = useState<Date|null>(new Date());
  const [ledgerFormErrors, setLedgerFormErrors] = useState<Partial<NewLedgerEntryData & { amount?: string }>>({});
  const [isSubmittingLedger, setIsSubmittingLedger] = useState(false);
  

  const fetchPartnerDetails = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/partners/${id}`);
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'خطا در دریافت اطلاعات همکار');
      }
      setPartnerData(result.data);
    } catch (error) {
      setNotification({ type: 'error', text: (error as Error).message });
      if ((error as Error).message.includes('یافت نشد')) {
        setTimeout(() => navigate('/partners'), 2000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPartnerDetails();
  }, [id]);

  useEffect(() => {
    // Update newLedgerEntry's transactionDate when ledgerDateSelected changes
    setNewLedgerEntry(prev => ({ ...prev, transactionDate: fromDatePickerToShamsiString(ledgerDateSelected) }));
    if(ledgerFormErrors.transactionDate) setLedgerFormErrors(prev => ({...prev, transactionDate: undefined}));
  }, [ledgerDateSelected]);


  const openEditModal = () => {
    if (partnerData?.profile) {
      setEditingPartner({
        partnerName: partnerData.profile.partnerName,
        partnerType: partnerData.profile.partnerType,
        contactPerson: partnerData.profile.contactPerson || '',
        phoneNumber: partnerData.profile.phoneNumber || '',
        email: partnerData.profile.email || '',
        address: partnerData.profile.address || '',
        notes: partnerData.profile.notes || '',
      });
      setEditFormErrors({});
      setIsEditModalOpen(true);
    }
  };

  const handleEditInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditingPartner(prev => ({ ...prev, [name]: value }));
    if (editFormErrors[name as keyof NewPartnerData]) {
      setEditFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validateEditForm = (): boolean => {
    const errors: Partial<NewPartnerData> = {};
    if (!editingPartner.partnerName?.trim()) errors.partnerName = 'نام همکار الزامی است.';
    if (!editingPartner.partnerType?.trim()) errors.partnerType = 'نوع همکار الزامی است.';
     if (editingPartner.phoneNumber && !/^\d{10,15}$/.test(editingPartner.phoneNumber.trim())) {
        errors.phoneNumber = 'شماره تماس نامعتبر است (باید ۱۰ تا ۱۵ رقم باشد).';
    }
    if (editingPartner.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editingPartner.email.trim())) {
        errors.email = 'ایمیل نامعتبر است.';
    }
    setEditFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateEditForm() || !id) return;
    setIsSubmittingEdit(true);
    setNotification(null);
    try {
      const response = await fetch(`/api/partners/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingPartner),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'خطا در به‌روزرسانی اطلاعات همکار');
      }
      setNotification({ type: 'success', text: 'اطلاعات همکار با موفقیت به‌روزرسانی شد!' });
      setIsEditModalOpen(false);
      fetchPartnerDetails();
    } catch (error) {
      setNotification({ type: 'error', text: (error as Error).message });
      if((error as Error).message.toLowerCase().includes('تکراری') || (error as Error).message.toLowerCase().includes('unique constraint')){
         setEditFormErrors(prev => ({...prev, phoneNumber: 'این شماره تماس قبلا برای همکار دیگری ثبت شده است.'}));
       }
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const openLedgerModal = () => {
    setNewLedgerEntry({ ...initialLedgerEntry, debit: 0 }); // Default to payment (debit for partner ledger)
    setLedgerDateSelected(new Date()); // Reset date picker to today
    setLedgerFormErrors({});
    setIsLedgerModalOpen(true);
  };

  const handleLedgerInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
     if (name === 'amount') {
        const amountValue = parseFloat(value);
        setNewLedgerEntry(prev => ({ ...prev, debit: isNaN(amountValue) ? 0 : amountValue, credit: 0 }));
    } else {
        setNewLedgerEntry(prev => ({ ...prev, [name]: value }));
    }
    if (ledgerFormErrors[name as keyof NewLedgerEntryData] || ledgerFormErrors.amount) {
      setLedgerFormErrors(prev => ({ ...prev, [name]: undefined, amount: undefined }));
    }
  };
  
  const validateLedgerForm = (): boolean => {
    const errors: Partial<NewLedgerEntryData & { amount?: string }> = {};
    if (!newLedgerEntry.description?.trim()) errors.description = 'شرح تراکنش (پرداخت) الزامی است.';
    
    const amount = newLedgerEntry.debit; // For partner payments, it's a debit to their account from our PoV
    if (amount === undefined || amount === null || isNaN(Number(amount)) || Number(amount) <= 0) {
        errors.amount = 'مبلغ پرداخت باید عددی مثبت باشد.';
    }
    if (!newLedgerEntry.transactionDate?.trim() || !moment(newLedgerEntry.transactionDate.trim(), 'YYYY/MM/DD', true).isValid()) {
        errors.transactionDate = "تاریخ پرداخت شمسی معتبر (مثال: ۱۴۰۳/۰۵/۲۴) الزامی است.";
    }
    setLedgerFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLedgerSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateLedgerForm() || !id) return;
    setIsSubmittingLedger(true);
    setNotification(null);
    
    const payload: NewLedgerEntryData = {
        description: newLedgerEntry.description,
        debit: Number(newLedgerEntry.debit), // We are paying them, so it's a debit from our perspective to their account
        credit: 0,
        transactionDate: fromShamsiStringToISO(newLedgerEntry.transactionDate) // Convert to ISO for backend
    };

    try {
      const response = await fetch(`/api/partners/${id}/ledger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'خطا در ثبت پرداخت به همکار');
      }
      setNotification({ type: 'success', text: 'پرداخت با موفقیت ثبت شد!' });
      setIsLedgerModalOpen(false);
      fetchPartnerDetails();
    } catch (error) {
      setNotification({ type: 'error', text: (error as Error).message });
    } finally {
      setIsSubmittingLedger(false);
    }
  };
  
  const formatPrice = (price: number | undefined | null) => {
    if (price === undefined || price === null) return '-';
    return price.toLocaleString('fa-IR') + ' تومان';
  };
  
  const inputClass = (hasError: boolean, isTextarea = false, isSelect = false) => 
    `w-full p-2.5 border rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-right ${isSelect ? 'bg-white ' : ''}${isTextarea ? '' : ''}${hasError ? 'border-red-500 ring-red-300' : 'border-gray-300'}`;
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  if (isLoading) {
    return <div className="p-10 text-center text-gray-500"><i className="fas fa-spinner fa-spin text-3xl mb-3"></i><p>در حال بارگذاری اطلاعات همکار...</p></div>;
  }

  if (!partnerData) {
    return <div className="p-10 text-center text-red-500"><i className="fas fa-exclamation-circle text-3xl mb-3"></i><p>اطلاعات همکار یافت نشد یا خطایی رخ داده است.</p></div>;
  }

  const { profile, ledger, purchaseHistory } = partnerData;

  return (
    <div className="space-y-8 text-right" dir="rtl">
      <Notification message={notification} onClose={() => setNotification(null)} />

      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-4 border-b pb-4">
          <h2 className="text-2xl font-semibold text-gray-800">
            پروفایل همکار: {profile.partnerName} ({profile.partnerType})
          </h2>
          <button 
            onClick={openEditModal}
            className="px-4 py-2 bg-sky-500 text-white font-medium rounded-lg hover:bg-sky-600 transition-colors text-sm"
          >
            <i className="fas fa-edit ml-2"></i>ویرایش پروفایل
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <p><strong>شناسه همکار:</strong> {profile.id.toLocaleString('fa-IR')}</p>
          <p><strong>تاریخ ثبت:</strong> {toShamsiForDisplay(profile.dateAdded, 'YYYY/MM/DD')}</p>
          <p><strong>فرد رابط:</strong> {profile.contactPerson || '-'}</p>
          <p><strong>شماره تماس:</strong> <span dir="ltr">{profile.phoneNumber || '-'}</span></p>
          <p><strong>ایمیل:</strong> {profile.email || '-'}</p>
          <p className="md:col-span-2"><strong>آدرس:</strong> {profile.address || '-'}</p>
          <p className="md:col-span-2"><strong>یادداشت‌ها:</strong> {profile.notes || '-'}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-4 border-b pb-4">
          <h2 className="text-xl font-semibold text-gray-800">دفتر حساب همکار</h2>
           <button 
            onClick={openLedgerModal}
            className="px-4 py-2 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 transition-colors text-sm"
          >
            <i className="fas fa-money-bill-wave ml-2"></i>ثبت پرداخت به همکار
          </button>
        </div>
        <div className="mb-4 p-4 bg-teal-50 rounded-lg">
          <p className="text-lg font-bold text-teal-700">
            موجودی نهایی حساب: {formatPartnerLedgerCurrency(profile.currentBalance, 'balance')}
          </p>
        </div>
        {ledger.length === 0 ? (
          <p className="text-gray-500">هیچ تراکنشی در دفتر حساب این همکار ثبت نشده است.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-right font-semibold text-gray-600">تاریخ</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-600">شرح</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-600">پرداختی شما (بدهکار)</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-600">دریافتی شما/ارزش کالا (بستانکار)</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-600">مانده</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ledger.map(entry => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 whitespace-nowrap">{toShamsiForDisplay(entry.transactionDate)}</td>
                    <td className="px-4 py-2">{entry.description}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{formatPartnerLedgerCurrency(entry.debit, 'debit')}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{formatPartnerLedgerCurrency(entry.credit, 'credit')}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{formatPartnerLedgerCurrency(entry.balance, 'balance')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-4">تاریخچه خرید از این همکار</h2>
        {purchaseHistory.length === 0 ? (
          <p className="text-gray-500">هنوز کالایی از این همکار خریداری نشده است.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-right font-semibold text-gray-600">تاریخ خرید/ثبت</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-600">نوع کالا</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-600">نام/مدل کالا</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-600">شناسه (IMEI)</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-600">تعداد خریداری شده</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-600">قیمت خرید واحد</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {purchaseHistory.map(item => (
                  <tr key={`${item.type}-${item.id}`} className="hover:bg-gray-50">
                    <td className="px-4 py-2 whitespace-nowrap">{toShamsiForDisplay(item.purchaseDate, 'YYYY/MM/DD')}</td>
                    <td className="px-4 py-2">{item.type === 'product' ? 'کالای انبار' : 'گوشی موبایل'}</td>
                    <td className="px-4 py-2">{item.name}</td>
                    <td className="px-4 py-2">{item.identifier || '-'}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{item.quantityPurchased ? item.quantityPurchased.toLocaleString('fa-IR') : (item.type === 'phone' ? '۱' : '-')}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{formatPrice(item.purchasePrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isEditModalOpen && (
        <Modal title="ویرایش اطلاعات همکار" onClose={() => setIsEditModalOpen(false)} widthClass="max-w-lg">
          <form onSubmit={handleEditSubmit} className="space-y-4 p-1">
            <div>
              <label htmlFor="editPartnerName" className={labelClass}>نام همکار <span className="text-red-500">*</span></label>
              <input type="text" id="editPartnerName" name="partnerName" value={editingPartner.partnerName || ''} onChange={handleEditInputChange} className={inputClass(!!editFormErrors.partnerName)} required />
              {editFormErrors.partnerName && <p className="mt-1 text-xs text-red-600">{editFormErrors.partnerName}</p>}
            </div>
            <div>
              <label htmlFor="editPartnerType" className={labelClass}>نوع همکار <span className="text-red-500">*</span></label>
              <select id="editPartnerType" name="partnerType" value={editingPartner.partnerType || ''} onChange={handleEditInputChange} className={inputClass(!!editFormErrors.partnerType, false, true)} required>
                {PARTNER_TYPES_DETAIL.map(type => <option key={type} value={type}>{type}</option>)}
              </select>
              {editFormErrors.partnerType && <p className="mt-1 text-xs text-red-600">{editFormErrors.partnerType}</p>}
            </div>
            <div>
              <label htmlFor="editContactPerson" className={labelClass}>فرد رابط</label>
              <input type="text" id="editContactPerson" name="contactPerson" value={editingPartner.contactPerson || ''} onChange={handleEditInputChange} className={inputClass(!!editFormErrors.contactPerson)} />
            </div>
            <div>
              <label htmlFor="editPhoneNumber" className={labelClass}>شماره تماس</label>
              <input type="tel" id="editPhoneNumber" name="phoneNumber" value={editingPartner.phoneNumber || ''} onChange={handleEditInputChange} className={inputClass(!!editFormErrors.phoneNumber)} placeholder="مثال: 09123456789" />
              {editFormErrors.phoneNumber && <p className="mt-1 text-xs text-red-600">{editFormErrors.phoneNumber}</p>}
            </div>
             <div>
              <label htmlFor="editEmail" className={labelClass}>ایمیل</label>
              <input type="email" id="editEmail" name="email" value={editingPartner.email || ''} onChange={handleEditInputChange} className={inputClass(!!editFormErrors.email)} />
              {editFormErrors.email && <p className="mt-1 text-xs text-red-600">{editFormErrors.email}</p>}
            </div>
            <div>
              <label htmlFor="editAddress" className={labelClass}>آدرس</label>
              <textarea id="editAddress" name="address" value={editingPartner.address || ''} onChange={handleEditInputChange} rows={2} className={inputClass(!!editFormErrors.address, true)}></textarea>
            </div>
            <div>
              <label htmlFor="editNotes" className={labelClass}>یادداشت</label>
              <textarea id="editNotes" name="notes" value={editingPartner.notes || ''} onChange={handleEditInputChange} rows={2} className={inputClass(!!editFormErrors.notes, true)}></textarea>
            </div>
            <div className="flex justify-end pt-3">
              <button type="button" onClick={() => setIsEditModalOpen(false)} className="ml-3 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                انصراف
              </button>
              <button type="submit" disabled={isSubmittingEdit} className="px-4 py-2 bg-sky-600 text-white font-medium rounded-lg hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:bg-sky-400 transition-colors">
                {isSubmittingEdit ? (<><i className="fas fa-spinner fa-spin mr-2"></i>در حال ذخیره...</>) : 'ذخیره تغییرات'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {isLedgerModalOpen && (
        <Modal title={`ثبت پرداخت به ${profile.partnerName}`} onClose={() => setIsLedgerModalOpen(false)} widthClass="max-w-lg">
          <form onSubmit={handleLedgerSubmit} className="space-y-4 p-1">
            <div>
              <label htmlFor="ledgerAmount" className={labelClass}>مبلغ پرداختی (تومان) <span className="text-red-500">*</span></label>
              <input 
                type="number" 
                id="ledgerAmount" 
                name="amount" // Consistent name with handler
                value={newLedgerEntry.debit || ''} // Partner payment is a debit on their account for us
                onChange={handleLedgerInputChange} 
                className={inputClass(!!ledgerFormErrors.amount)} 
                min="0.01" 
                step="any"
                placeholder="مثال: ۵۰۰۰۰"
                required 
              />
              {ledgerFormErrors.amount && <p className="mt-1 text-xs text-red-600">{ledgerFormErrors.amount}</p>}
            </div>
            <div>
              <label htmlFor="ledgerDescription" className={labelClass}>شرح پرداخت <span className="text-red-500">*</span></label>
              <textarea id="ledgerDescription" name="description" value={newLedgerEntry.description} onChange={handleLedgerInputChange} rows={2} className={inputClass(!!ledgerFormErrors.description, true)} required placeholder="مثال: پرداخت بابت فاکتور ۱۲۳"/>
              {ledgerFormErrors.description && <p className="mt-1 text-xs text-red-600">{ledgerFormErrors.description}</p>}
            </div>
            <div>
              <label htmlFor="ledgerTransactionDate" className={labelClass}>تاریخ پرداخت <span className="text-red-500">*</span></label>
               <ShamsiDatePicker
                id="ledgerTransactionDate"
                selectedDate={ledgerDateSelected}
                onDateChange={(date) => setLedgerDateSelected(date)}
                inputClassName={inputClass(!!ledgerFormErrors.transactionDate)}
              />
              {ledgerFormErrors.transactionDate && <p className="mt-1 text-xs text-red-600">{ledgerFormErrors.transactionDate}</p>}
            </div>
            <div className="flex justify-end pt-3">
              <button type="button" onClick={() => setIsLedgerModalOpen(false)} className="ml-3 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                انصراف
              </button>
              <button type="submit" disabled={isSubmittingLedger} className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-green-400 transition-colors">
                {isSubmittingLedger ? (<><i className="fas fa-spinner fa-spin mr-2"></i>در حال ثبت...</>) : 'ثبت پرداخت'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default PartnerDetailPage;