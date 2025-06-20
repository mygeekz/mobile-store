
import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import moment from 'jalali-moment';

import { 
    NewInstallmentSaleData, 
    InstallmentCheckInfo,
    Customer, 
    PhoneEntry, 
    NotificationMessage,
    InstallmentSalePayload 
} from '../types';
import Notification from '../components/Notification';
import ShamsiDatePicker from '../components/ShamsiDatePicker';
import Modal from '../components/Modal';

const AddInstallmentSalePage: React.FC = () => {
  const navigate = useNavigate();
  const initialFormState: NewInstallmentSaleData = {
    customerId: null,
    phoneId: null,
    actualSalePrice: '',
    downPayment: '',
    numberOfInstallments: '',
    installmentAmount: '',
    installmentsStartDate: moment().locale('fa').format('YYYY/MM/DD'),
    checks: [],
    notes: '',
  };

  const [formData, setFormData] = useState<NewInstallmentSaleData>(initialFormState);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [availablePhones, setAvailablePhones] = useState<PhoneEntry[]>([]);
  
  const [selectedPhoneDetails, setSelectedPhoneDetails] = useState<PhoneEntry | null>(null);
  const [installmentsStartDatePicker, setInstallmentsStartDatePicker] = useState<Date | null>(new Date());
  
  // For new check modal
  const [isCheckModalOpen, setIsCheckModalOpen] = useState(false);
  const initialCheckState: Omit<InstallmentCheckInfo, 'id' | 'status'> = { checkNumber: '', bankName: '', dueDate: moment().locale('fa').format('YYYY/MM/DD'), amount: 0 };
  const [currentCheck, setCurrentCheck] = useState(initialCheckState);
  const [currentCheckDueDate, setCurrentCheckDueDate] = useState<Date | null>(new Date());


  const [isLoading, setIsLoading] = useState(false); // General loading for form submission
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [isLoadingPhones, setIsLoadingPhones] = useState(true);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof NewInstallmentSaleData | 'checks', string>>>({});

  const fetchCustomers = async () => {
    setIsLoadingCustomers(true);
    try {
      const response = await fetch('/api/customers');
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'خطا در دریافت لیست مشتریان');
      }
      setCustomers(result.data || []);
    } catch (error: any) {
      setNotification({ type: 'error', text: error.message });
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  const fetchAvailablePhones = async () => {
    setIsLoadingPhones(true);
    try {
      const response = await fetch('/api/phones?status=موجود%20در%20انبار'); // URL encoded "موجود در انبار"
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'خطا در دریافت لیست گوشی‌های موجود');
      }
      setAvailablePhones(result.data || []);
    } catch (error: any) {
      setNotification({ type: 'error', text: error.message });
    } finally {
      setIsLoadingPhones(false);
    }
  };


  useEffect(() => {
    fetchCustomers();
    fetchAvailablePhones();
  }, []);

  useEffect(() => {
    if (installmentsStartDatePicker) {
      setFormData(prev => ({ ...prev, installmentsStartDate: moment(installmentsStartDatePicker).locale('fa').format('YYYY/MM/DD') }));
    }
  }, [installmentsStartDatePicker]);

  useEffect(() => {
    if (currentCheckDueDate){
        setCurrentCheck(prev => ({...prev, dueDate: moment(currentCheckDueDate).locale('fa').format('YYYY/MM/DD')}))
    }
  }, [currentCheckDueDate]);


  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const numericFields = ['actualSalePrice', 'downPayment', 'numberOfInstallments', 'installmentAmount'];
    
    setFormData(prev => ({
      ...prev,
      [name]: numericFields.includes(name) ? (value === '' ? '' : Number(value)) : value,
    }));

    if (name === 'phoneId') {
        const phone = availablePhones.find(p => p.id === Number(value));
        setSelectedPhoneDetails(phone || null);
        if (phone && phone.salePrice) {
            setFormData(prev => ({...prev, actualSalePrice: phone.salePrice || ''}));
        } else {
            setFormData(prev => ({...prev, actualSalePrice: ''}));
        }
    }
     if (formErrors[name as keyof NewInstallmentSaleData]) {
        setFormErrors(prev => ({ ...prev, [name]: undefined }));
     }
  };

  const handleCheckInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCurrentCheck(prev => ({...prev, [name]: name === 'amount' ? Number(value) : value }));
  };

  const addCheckToList = () => {
    // Basic validation for check
    if (!currentCheck.checkNumber.trim() || !currentCheck.bankName.trim() || currentCheck.amount <= 0) {
        setNotification({ type: 'error', text: "اطلاعات چک ناقص یا نامعتبر است." });
        return;
    }
    setFormData(prev => ({...prev, checks: [...prev.checks, {...currentCheck, dueDate: moment(currentCheckDueDate).locale('fa').format('YYYY/MM/DD')} ]}));
    setCurrentCheck(initialCheckState);
    setCurrentCheckDueDate(new Date());
    setIsCheckModalOpen(false);
  };
  
  const removeCheck = (index: number) => {
    setFormData(prev => ({...prev, checks: prev.checks.filter((_, i) => i !== index)}));
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof NewInstallmentSaleData | 'checks', string>> = {};
    if (!formData.customerId) errors.customerId = "انتخاب مشتری الزامی است.";
    if (!formData.phoneId) errors.phoneId = "انتخاب موبایل الزامی است.";
    if (Number(formData.actualSalePrice) <= 0) errors.actualSalePrice = "قیمت فروش نهایی باید مثبت باشد.";
    if (Number(formData.downPayment) < 0 || Number(formData.downPayment) > Number(formData.actualSalePrice) ) errors.downPayment = "پیش پرداخت نامعتبر است.";
    if (Number(formData.numberOfInstallments) <= 0 || !Number.isInteger(Number(formData.numberOfInstallments))) errors.numberOfInstallments = "تعداد اقساط باید عدد صحیح مثبت باشد.";
    if (Number(formData.installmentAmount) <= 0) errors.installmentAmount = "مبلغ هر قسط باید مثبت باشد.";
    
    const totalInstallmentValue = (Number(formData.numberOfInstallments) || 0) * (Number(formData.installmentAmount) || 0);
    const totalDebt = (Number(formData.actualSalePrice) || 0) - (Number(formData.downPayment) || 0);

    if (Math.abs(totalInstallmentValue - totalDebt) > 0.01) { // Allow for small floating point discrepancies
        errors.installmentAmount = `مجموع اقساط (${totalInstallmentValue.toLocaleString('fa-IR')}) با مبلغ باقیمانده پس از پیش پرداخت (${totalDebt.toLocaleString('fa-IR')}) همخوانی ندارد.`;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsLoading(true);
    setNotification(null);

    // Construct payload for API
    const payload: InstallmentSalePayload = {
      ...formData,
      customerId: Number(formData.customerId),
      phoneId: Number(formData.phoneId),
      actualSalePrice: Number(formData.actualSalePrice),
      downPayment: Number(formData.downPayment),
      numberOfInstallments: Number(formData.numberOfInstallments),
      installmentAmount: Number(formData.installmentAmount),
      checks: formData.checks.map(chk => ({...chk, status: 'نزد مشتری' as const})) // Add default status
    };

    try {
      const response = await fetch('/api/installment-sales', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload) 
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'خطا در ثبت فروش اقساطی');
      
      setNotification({ type: 'success', text: 'فروش اقساطی با موفقیت ثبت شد!' });
      setTimeout(() => navigate('/installment-sales'), 1500);

    } catch (error: any) {
      setNotification({ type: 'error', text: error.message || 'یک خطای ناشناخته رخ داد.' });
    } finally {
      setIsLoading(false);
    }
  };
  
  const inputClass = (fieldName?: keyof NewInstallmentSaleData | keyof InstallmentCheckInfo, isSelect = false) =>
    `w-full p-2.5 border rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-right ${isSelect ? 'bg-white ' : ''}${fieldName && formErrors[fieldName as keyof NewInstallmentSaleData] ? 'border-red-500 ring-red-300' : 'border-gray-300'}`;
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";
  const calculatedTotalInstallmentAmount = (Number(formData.numberOfInstallments) || 0) * (Number(formData.installmentAmount) || 0);
  const calculatedTotalSaleAmount = calculatedTotalInstallmentAmount + (Number(formData.downPayment) || 0);
  const remainingAfterDownPayment = (Number(formData.actualSalePrice) || 0) - (Number(formData.downPayment) || 0);


  return (
    <div className="space-y-6 text-right" dir="rtl">
      <Notification message={notification} onClose={() => setNotification(null)} />

      <form onSubmit={handleSubmit}>
        {/* Customer and Phone Selection */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-3">اطلاعات پایه فروش اقساطی</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="customerId" className={labelClass}>انتخاب مشتری <span className="text-red-500">*</span></label>
              <select id="customerId" name="customerId" value={formData.customerId || ''} onChange={handleInputChange} className={inputClass('customerId', true)} disabled={isLoadingCustomers}>
                <option value="">-- انتخاب کنید --</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.fullName} ({c.phoneNumber || 'بی‌نام'})</option>)}
              </select>
              {isLoadingCustomers && <p className="text-xs text-gray-500 mt-1">درحال بارگذاری مشتریان...</p>}
              {formErrors.customerId && <p className="mt-1 text-xs text-red-600">{formErrors.customerId}</p>}
            </div>
            <div>
              <label htmlFor="phoneId" className={labelClass}>انتخاب موبایل <span className="text-red-500">*</span></label>
              <select id="phoneId" name="phoneId" value={formData.phoneId || ''} onChange={handleInputChange} className={inputClass('phoneId', true)} disabled={isLoadingPhones}>
                <option value="">-- انتخاب کنید --</option>
                {availablePhones.map(p => <option key={p.id} value={p.id}>{p.model} (IMEI: {p.imei}) - قیمت: {Number(p.salePrice).toLocaleString('fa-IR')} تومان</option>)}
              </select>
              {isLoadingPhones && <p className="text-xs text-gray-500 mt-1">درحال بارگذاری موبایل‌ها...</p>}
              {selectedPhoneDetails && <p className="mt-1 text-xs text-gray-500">مشخصات: {selectedPhoneDetails.storage}/{selectedPhoneDetails.ram} - وضعیت: {selectedPhoneDetails.condition}</p>}
              {formErrors.phoneId && <p className="mt-1 text-xs text-red-600">{formErrors.phoneId}</p>}
            </div>
          </div>
        </div>

        {/* Pricing and Installment Details */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-3">جزئیات قیمت و اقساط</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
            <div>
              <label htmlFor="actualSalePrice" className={labelClass}>قیمت فروش نهایی (تومان) <span className="text-red-500">*</span></label>
              <input type="number" id="actualSalePrice" name="actualSalePrice" value={formData.actualSalePrice} onChange={handleInputChange} className={inputClass('actualSalePrice')} placeholder="مثال: ۵۵۰۰۰۰۰۰" />
              {formErrors.actualSalePrice && <p className="mt-1 text-xs text-red-600">{formErrors.actualSalePrice}</p>}
            </div>
            <div>
              <label htmlFor="downPayment" className={labelClass}>پیش پرداخت (تومان)</label>
              <input type="number" id="downPayment" name="downPayment" value={formData.downPayment} onChange={handleInputChange} className={inputClass('downPayment')} placeholder="مثال: ۱۵۰۰۰۰۰۰" />
              {formErrors.downPayment && <p className="mt-1 text-xs text-red-600">{formErrors.downPayment}</p>}
            </div>
             <div>
              <label htmlFor="numberOfInstallments" className={labelClass}>تعداد اقساط <span className="text-red-500">*</span></label>
              <input type="number" id="numberOfInstallments" name="numberOfInstallments" value={formData.numberOfInstallments} onChange={handleInputChange} className={inputClass('numberOfInstallments')} placeholder="مثال: ۱۰" />
              {formErrors.numberOfInstallments && <p className="mt-1 text-xs text-red-600">{formErrors.numberOfInstallments}</p>}
            </div>
            <div>
              <label htmlFor="installmentAmount" className={labelClass}>مبلغ هر قسط (تومان) <span className="text-red-500">*</span></label>
              <input type="number" id="installmentAmount" name="installmentAmount" value={formData.installmentAmount} onChange={handleInputChange} className={inputClass('installmentAmount')} placeholder="مثال: ۴۰۰۰۰۰۰" />
              {formErrors.installmentAmount && <p className="mt-1 text-xs text-red-600">{formErrors.installmentAmount}</p>}
            </div>
            <div>
              <label htmlFor="installmentsStartDatePicker" className={labelClass}>تاریخ شروع اقساط <span className="text-red-500">*</span></label>
              <ShamsiDatePicker 
                id="installmentsStartDatePicker"
                selectedDate={installmentsStartDatePicker}
                onDateChange={setInstallmentsStartDatePicker}
                inputClassName={inputClass()}
              />
            </div>
            <div className="lg:col-span-3 bg-indigo-50 p-3 rounded-lg space-y-1 text-sm">
                <p><strong>مبلغ باقیمانده پس از پیش پرداخت:</strong> {remainingAfterDownPayment.toLocaleString('fa-IR')} تومان</p>
                <p><strong>مجموع مبالغ اقساط (بدون پیش پرداخت):</strong> {calculatedTotalInstallmentAmount.toLocaleString('fa-IR')} تومان</p>
                <p className="font-bold"><strong>مبلغ کل پرداختی مشتری (با احتساب پیش پرداخت و اقساط):</strong> {calculatedTotalSaleAmount.toLocaleString('fa-IR')} تومان</p>
            </div>
          </div>
        </div>
        
        {/* Check Details */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
             <div className="flex justify-between items-center mb-4 border-b pb-3">
                <h2 className="text-xl font-semibold text-gray-800">چک‌های دریافتی (اختیاری)</h2>
                <button type="button" onClick={() => {setCurrentCheck(initialCheckState); setCurrentCheckDueDate(new Date()); setIsCheckModalOpen(true);}} className="px-4 py-1.5 bg-sky-500 text-white text-xs rounded-md hover:bg-sky-600">
                    <i className="fas fa-plus ml-1"></i> افزودن چک
                </button>
             </div>
             {formData.checks.length === 0 ? <p className="text-sm text-gray-500">چکی اضافه نشده است.</p> : (
                 <div className="space-y-2">
                     {formData.checks.map((chk, index) => (
                         <div key={index} className="p-2 border rounded-md bg-gray-50 text-xs grid grid-cols-4 gap-2 items-center">
                            <span>شماره: {chk.checkNumber}</span>
                            <span>بانک: {chk.bankName}</span>
                            <span>تاریخ: {chk.dueDate}</span>
                            <span>مبلغ: {chk.amount.toLocaleString('fa-IR')} تومان</span>
                            <button type="button" onClick={() => removeCheck(index)} className="text-red-500 hover:text-red-700 text-base justify-self-end px-1">×</button>
                         </div>
                     ))}
                 </div>
             )}
        </div>

        {isCheckModalOpen && (
            <Modal title="افزودن اطلاعات چک" onClose={() => setIsCheckModalOpen(false)} widthClass="max-w-lg">
                <div className="space-y-3 p-1">
                    <div>
                        <label htmlFor="checkNumber" className={labelClass}>شماره چک</label>
                        <input type="text" name="checkNumber" id="checkNumber" value={currentCheck.checkNumber} onChange={handleCheckInputChange} className={inputClass()} />
                    </div>
                    <div>
                        <label htmlFor="bankName" className={labelClass}>نام بانک</label>
                        <input type="text" name="bankName" id="bankName" value={currentCheck.bankName} onChange={handleCheckInputChange} className={inputClass()} />
                    </div>
                     <div>
                        <label htmlFor="checkDueDate" className={labelClass}>تاریخ سررسید چک</label>
                        <ShamsiDatePicker id="checkDueDate" selectedDate={currentCheckDueDate} onDateChange={setCurrentCheckDueDate} inputClassName={inputClass()} />
                    </div>
                    <div>
                        <label htmlFor="checkAmount" className={labelClass}>مبلغ چک (تومان)</label>
                        <input type="number" name="amount" id="checkAmount" value={currentCheck.amount || ''} onChange={handleCheckInputChange} className={inputClass()} />
                    </div>
                    <div className="flex justify-end pt-2">
                        <button type="button" onClick={() => setIsCheckModalOpen(false)} className="ml-2 px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200">انصراف</button>
                        <button type="button" onClick={addCheckToList} className="px-3 py-1.5 bg-sky-500 text-white text-sm rounded hover:bg-sky-600">افزودن چک</button>
                    </div>
                </div>
            </Modal>
        )}


        {/* Notes and Submit */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="mb-4">
            <label htmlFor="notes" className={labelClass}>یادداشت‌ها (اختیاری)</label>
            <textarea id="notes" name="notes" value={formData.notes} onChange={handleInputChange} rows={3} className={inputClass('notes')}></textarea>
          </div>
          <button
            type="submit"
            disabled={isLoading || isLoadingCustomers || isLoadingPhones}
            className="w-full sm:w-auto px-8 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-gray-400 transition-colors"
          >
            {isLoading ? (<><i className="fas fa-spinner fa-spin ml-2"></i>در حال ثبت...</>) : 'ثبت نهایی فروش اقساطی'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddInstallmentSalePage;
