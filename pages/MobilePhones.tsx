
import React, { useState, useEffect, FormEvent } from 'react';
import moment from 'jalali-moment';

import { PhoneEntry, NewPhoneEntryData, NotificationMessage, PhoneStatus, Partner, PhoneEntryPayload } from '../types';
import Notification from '../components/Notification';
import ShamsiDatePicker from '../components/ShamsiDatePicker';
import { PHONE_RAM_OPTIONS, PHONE_STORAGE_OPTIONS } from '../constants';

const PHONE_CONDITIONS = ["نو (آکبند)", "در حد نو", "کارکرده", "معیوب"];
const PHONE_STATUSES: PhoneStatus[] = ["موجود در انبار", "فروخته شده", "مرجوعی"];

// Converts Date object from DatePicker to ISO YYYY-MM-DD string
const fromDatePickerToISO = (date: Date | null): string | undefined => {
  if (!date) return undefined;
  return moment(date).format('YYYY-MM-DD'); // Store as Gregorian ISO date
};

const MobilePhonesPage: React.FC = () => {
  const [phones, setPhones] = useState<PhoneEntry[]>([]);
  const [filteredPhones, setFilteredPhones] = useState<PhoneEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [partners, setPartners] = useState<Partner[]>([]);

  const initialNewPhoneState: NewPhoneEntryData = {
    model: '',
    color: '',
    storage: PHONE_STORAGE_OPTIONS[0],
    ram: PHONE_RAM_OPTIONS[0],
    imei: '',
    batteryHealth: '',
    condition: PHONE_CONDITIONS[0],
    purchasePrice: '',
    salePrice: '',
    status: PHONE_STATUSES[0],
    notes: '',
    supplierId: ''
  };
  const [newPhone, setNewPhone] = useState<NewPhoneEntryData>(initialNewPhoneState);

  const [purchaseDateSelected, setPurchaseDateSelected] = useState<Date | null>(null);
  const [saleDateSelected, setSaleDateSelected] = useState<Date | null>(null);

  const [formErrors, setFormErrors] = useState<Partial<Record<keyof NewPhoneEntryData | 'purchaseDate' | 'saleDate', string>>>({});

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isFetchingPartners, setIsFetchingPartners] = useState(true);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  const fetchPhones = async () => {
    setIsFetching(true);
    setNotification(null);
    try {
      const response = await fetch('/api/phones');
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'خطا در دریافت لیست گوشی‌ها');
      }
      setPhones(result.data);
      setFilteredPhones(result.data);
    } catch (error: any) {
      setNotification({ type: 'error', text: error.message || 'یک خطای ناشناخته هنگام دریافت گوشی‌ها رخ داد.' });
    } finally {
      setIsFetching(false);
    }
  };

  const fetchPartners = async () => {
    setIsFetchingPartners(true);
    try {
      const response = await fetch('/api/partners?partnerType=Supplier');
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'خطا در دریافت لیست تامین‌کنندگان');
      }
      setPartners(result.data.filter((p: Partner) => p.partnerType === 'Supplier'));
    } catch (error: any) {
      setNotification({ type: 'error', text: error.message || 'یک خطای ناشناخته هنگام دریافت تامین‌کنندگان رخ داد.' });
    } finally {
      setIsFetchingPartners(false);
    }
  };

  useEffect(() => {
    fetchPhones();
    fetchPartners();
  }, []);

  useEffect(() => {
    const lowerSearchTerm = searchTerm.toLowerCase().trim();
    if (!lowerSearchTerm) {
      setFilteredPhones(phones);
      return;
    }
    const filtered = phones.filter(p =>
      p.model.toLowerCase().includes(lowerSearchTerm) ||
      p.imei.toLowerCase().includes(lowerSearchTerm) ||
      (p.color && p.color.toLowerCase().includes(lowerSearchTerm)) ||
      (p.status && p.status.toLowerCase().includes(lowerSearchTerm)) ||
      (p.supplierName && p.supplierName.toLowerCase().includes(lowerSearchTerm))
    );
    setFilteredPhones(filtered);
  }, [searchTerm, phones]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewPhone(prev => ({ ...prev, [name]: value }));
    if (formErrors[name as keyof NewPhoneEntryData]) {
      setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof NewPhoneEntryData | 'purchaseDate' | 'saleDate', string>> = {};
    if (!newPhone.model.trim()) errors.model = 'مدل الزامی است.';
    if (!newPhone.imei.trim()) errors.imei = 'IMEI الزامی است.';
    else if (!/^\d{15,16}$/.test(newPhone.imei.trim())) errors.imei = 'IMEI باید ۱۵ یا ۱۶ رقم باشد.';

    if (!String(newPhone.purchasePrice).trim() || isNaN(parseFloat(String(newPhone.purchasePrice))) || parseFloat(String(newPhone.purchasePrice)) < 0) {
      errors.purchasePrice = 'قیمت خرید باید عددی غیرمنفی باشد.';
    } else if (parseFloat(String(newPhone.purchasePrice)) > 0 && !newPhone.supplierId) {
        errors.supplierId = 'برای ثبت قیمت خرید، انتخاب تامین‌کننده الزامی است.';
    }

    if (newPhone.salePrice && (isNaN(parseFloat(String(newPhone.salePrice))) || parseFloat(String(newPhone.salePrice)) < 0)) {
      errors.salePrice = 'قیمت فروش (در صورت وجود) باید عددی غیرمنفی باشد.';
    }
    if (newPhone.batteryHealth && (isNaN(parseInt(String(newPhone.batteryHealth), 10)) || parseInt(String(newPhone.batteryHealth), 10) < 0 || parseInt(String(newPhone.batteryHealth), 10) > 100)) {
      errors.batteryHealth = 'سلامت باتری باید عددی بین ۰ تا ۱۰۰ باشد.';
    }
    if (!newPhone.status) errors.status = 'وضعیت الزامی است.';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setNotification(null);

    const dataToSubmit: PhoneEntryPayload = {
      model: newPhone.model,
      color: newPhone.color || undefined,
      storage: newPhone.storage || undefined,
      ram: newPhone.ram || undefined,
      imei: newPhone.imei,
      batteryHealth: newPhone.batteryHealth ? parseInt(String(newPhone.batteryHealth), 10) : undefined,
      condition: newPhone.condition || undefined,
      purchasePrice: parseFloat(String(newPhone.purchasePrice)),
      salePrice: newPhone.salePrice ? parseFloat(String(newPhone.salePrice)) : undefined,
      sellerName: newPhone.sellerName || undefined,
      purchaseDate: fromDatePickerToISO(purchaseDateSelected),
      saleDate: fromDatePickerToISO(saleDateSelected),
      status: newPhone.status || PHONE_STATUSES[0],
      notes: newPhone.notes || undefined,
      supplierId: newPhone.supplierId ? parseInt(String(newPhone.supplierId), 10) : null,
      registerDate: new Date().toISOString() // Set on backend as well, but good to have
    };

    try {
      const response = await fetch('/api/phones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSubmit),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'خطا در افزودن گوشی');
      }
      setNewPhone(initialNewPhoneState);
      setPurchaseDateSelected(null);
      setSaleDateSelected(null);
      setFormErrors({});
      setNotification({ type: 'success', text: 'گوشی با موفقیت اضافه شد!' });
      await fetchPhones();
    } catch (error: any) {
      const errorMessage = error.message || 'یک خطای ناشناخته هنگام افزودن گوشی رخ داد.';
      setNotification({ type: 'error', text: errorMessage });
      if (errorMessage.includes('IMEI تکراری')) {
        setFormErrors(prev => ({ ...prev, imei: 'این شماره IMEI قبلا ثبت شده است.' }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateForDisplay = (isoDate: string | undefined | null, includeTime = false) => {
    if (!isoDate) return 'نامشخص';
    const format = includeTime ? 'YYYY/MM/DD HH:mm' : 'YYYY/MM/DD';
    const momentDate = moment(isoDate); 
    if (!momentDate.isValid()) return isoDate; 
    return momentDate.locale('fa').format(format);
  };


  const formatPrice = (price: number | undefined | null) => {
    if (price === undefined || price === null) return '-';
    return price.toLocaleString('fa-IR') + ' تومان';
  };

  const getStatusColor = (status: PhoneStatus): string => {
    switch (status) {
      case "موجود در انبار": return "bg-green-100 text-green-800";
      case "فروخته شده": return "bg-red-100 text-red-800";
      case "مرجوعی": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const inputClass = (fieldName?: keyof NewPhoneEntryData | 'purchaseDate' | 'saleDate', isSelect = false) =>
    `w-full p-2.5 border rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-right ${isSelect ? 'bg-white ' : ''}${fieldName && formErrors[fieldName] ? 'border-red-500 ring-red-300' : 'border-gray-300'}`;

  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <Notification message={notification} onClose={() => setNotification(null)} />

      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-6 border-b pb-4">افزودن گوشی موبایل جدید</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label htmlFor="model" className={labelClass}>مدل <span className="text-red-500">*</span></label>
              <input type="text" id="model" name="model" value={newPhone.model} onChange={handleInputChange} className={inputClass('model')} placeholder="مثال: iPhone 15 Pro"/>
              {formErrors.model && <p className="mt-1 text-xs text-red-600">{formErrors.model}</p>}
            </div>
            <div>
              <label htmlFor="imei" className={labelClass}>IMEI <span className="text-red-500">*</span></label>
              <input type="text" id="imei" name="imei" value={newPhone.imei} onChange={handleInputChange} className={inputClass('imei')} placeholder="۱۵ یا ۱۶ رقم سریال"/>
              {formErrors.imei && <p className="mt-1 text-xs text-red-600">{formErrors.imei}</p>}
            </div>
             <div>
              <label htmlFor="condition" className={labelClass}>وضعیت ظاهری</label>
              <select id="condition" name="condition" value={newPhone.condition} onChange={handleInputChange} className={inputClass('condition', true)}>
                {PHONE_CONDITIONS.map(cond => <option key={cond} value={cond}>{cond}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="color" className={labelClass}>رنگ</label>
              <input type="text" id="color" name="color" value={newPhone.color || ''} onChange={handleInputChange} className={inputClass('color')} placeholder="مثال: آبی تیتانیوم"/>
            </div>
            <div>
              <label htmlFor="storage" className={labelClass}>حافظه داخلی</label>
              <select id="storage" name="storage" value={newPhone.storage} onChange={handleInputChange} className={inputClass('storage', true)}>
                {PHONE_STORAGE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="ram" className={labelClass}>رَم</label>
              <select id="ram" name="ram" value={newPhone.ram} onChange={handleInputChange} className={inputClass('ram', true)}>
                {PHONE_RAM_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="purchasePrice" className={labelClass}>قیمت خرید (تومان) <span className="text-red-500">*</span></label>
              <input type="number" id="purchasePrice" name="purchasePrice" value={newPhone.purchasePrice} onChange={handleInputChange} className={inputClass('purchasePrice')} placeholder="مثال: ۳۵۰۰۰۰۰۰" min="0"/>
              {formErrors.purchasePrice && <p className="mt-1 text-xs text-red-600">{formErrors.purchasePrice}</p>}
            </div>
            <div>
              <label htmlFor="supplierId" className={labelClass}>تامین‌کننده</label>
              <select
                id="supplierId" name="supplierId" value={newPhone.supplierId || ''}
                onChange={handleInputChange} className={inputClass('supplierId', true)}
                disabled={isFetchingPartners}
              >
                <option value="">-- انتخاب تامین‌کننده --</option>
                {partners.map(p => <option key={p.id} value={p.id}>{p.partnerName}</option>)}
              </select>
              {isFetchingPartners && <p className="text-xs text-gray-500 mt-1">درحال بارگذاری تامین‌کنندگان...</p>}
              {formErrors.supplierId && <p className="mt-1 text-xs text-red-600">{formErrors.supplierId}</p>}
            </div>
             <div>
              <label htmlFor="batteryHealth" className={labelClass}>سلامت باتری (٪)</label>
              <input type="number" id="batteryHealth" name="batteryHealth" value={newPhone.batteryHealth} onChange={handleInputChange} className={inputClass('batteryHealth')} placeholder="مثال: ۹۵" min="0" max="100"/>
               {formErrors.batteryHealth && <p className="mt-1 text-xs text-red-600">{formErrors.batteryHealth}</p>}
            </div>
             <div>
              <label htmlFor="purchaseDatePicker" className={labelClass}>تاریخ خرید</label>
              <ShamsiDatePicker
                id="purchaseDatePicker"
                selectedDate={purchaseDateSelected}
                onDateChange={setPurchaseDateSelected}
                inputClassName={inputClass(formErrors.purchaseDate ? 'purchaseDate' : undefined)}
              />
              {formErrors.purchaseDate && <p className="mt-1 text-xs text-red-600">{formErrors.purchaseDate}</p>}
            </div>
             <div>
              <label htmlFor="salePrice" className={labelClass}>قیمت فروش (تومان)</label>
              <input type="number" id="salePrice" name="salePrice" value={newPhone.salePrice || ''} onChange={handleInputChange} className={inputClass('salePrice')} placeholder="مثال: ۳۸۵۰۰۰۰۰" min="0"/>
              {formErrors.salePrice && <p className="mt-1 text-xs text-red-600">{formErrors.salePrice}</p>}
            </div>
             <div>
              <label htmlFor="saleDatePicker" className={labelClass}>تاریخ فروش</label>
               <ShamsiDatePicker
                id="saleDatePicker"
                selectedDate={saleDateSelected}
                onDateChange={setSaleDateSelected}
                inputClassName={inputClass(formErrors.saleDate ? 'saleDate' : undefined)}
              />
              {formErrors.saleDate && <p className="mt-1 text-xs text-red-600">{formErrors.saleDate}</p>}
            </div>
             <div>
              <label htmlFor="status" className={labelClass}>وضعیت <span className="text-red-500">*</span></label>
              <select id="status" name="status" value={newPhone.status} onChange={handleInputChange} className={inputClass('status', true)}>
                {PHONE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {formErrors.status && <p className="mt-1 text-xs text-red-600">{formErrors.status}</p>}
            </div>
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <label htmlFor="notes" className={labelClass}>یادداشت‌ها</label>
            <textarea id="notes" name="notes" value={newPhone.notes || ''} onChange={handleInputChange} rows={3} className={inputClass('notes')} placeholder="جزئیات بیشتر، لوازم همراه و ..."></textarea>
          </div>

          <button type="submit" disabled={isLoading || isFetching || isFetchingPartners}
            className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-indigo-400 transition-colors">
            {isLoading ? (<><i className="fas fa-spinner fa-spin ml-2"></i>در حال افزودن...</>) : 'افزودن گوشی'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-lg">
        <div className="flex flex-col sm:flex-row items-center justify-between p-4 sm:p-6 border-b border-gray-200 gap-3">
          <h3 className="text-lg font-semibold text-gray-800">لیست گوشی‌های ثبت شده</h3>
          <div className="relative w-full sm:w-64 md:w-80">
            <input
              type="text"
              placeholder="جستجو بر اساس مدل، IMEI، تامین‌کننده..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm outline-none text-right"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <i className="fa-solid fa-search text-gray-400"></i>
            </div>
          </div>
        </div>

        {isFetching ? (
          <div className="p-10 text-center text-gray-500"><i className="fas fa-spinner fa-spin text-3xl mb-3"></i><p>در حال بارگذاری گوشی‌ها...</p></div>
        ) : phones.length === 0 ? (
          <div className="p-10 text-center text-gray-500"><i className="fas fa-mobile-alt text-3xl text-gray-400 mb-3"></i><p>هنوز هیچ گوشی ثبت نشده است.</p></div>
        ) : filteredPhones.length === 0 && searchTerm ? (
          <div className="p-10 text-center text-gray-500"><i className="fas fa-search-minus text-3xl text-gray-400 mb-3"></i><p>موردی با عبارت جستجو شده یافت نشد.</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 p-4 sm:p-6">
            {filteredPhones.map((phone) => (
              <div key={phone.id} className="bg-gray-50 rounded-lg shadow-md p-4 border border-gray-200 hover:shadow-lg transition-shadow duration-200">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-md font-bold text-indigo-700">{phone.model}</h4>
                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusColor(phone.status)}`}>
                    {phone.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-2" dir="ltr">IMEI: {phone.imei}</p>

                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs mb-3">
                  <p><strong className="text-gray-600">رنگ:</strong> {phone.color || '-'}</p>
                  <p><strong className="text-gray-600">حافظه:</strong> {phone.storage || '-'}</p>
                  <p><strong className="text-gray-600">رم:</strong> {phone.ram || '-'}</p>
                  <p><strong className="text-gray-600">وضعیت:</strong> {phone.condition || '-'}</p>
                  {phone.batteryHealth !== null && <p><strong className="text-gray-600">باتری:</strong> {phone.batteryHealth}%</p>}
                  {phone.supplierName && <p><strong className="text-gray-600">تامین‌کننده:</strong> {phone.supplierName}</p>}
                </div>

                <div className="border-t pt-2 mt-2 text-xs space-y-1">
                  <p><strong className="text-gray-600">قیمت خرید:</strong> {formatPrice(phone.purchasePrice)}</p>
                  {phone.salePrice !== null && <p><strong className="text-gray-600">قیمت فروش:</strong> {formatPrice(phone.salePrice)}</p>}
                   <p><strong className="text-gray-600">تاریخ ثبت سیستمی:</strong> {formatDateForDisplay(phone.registerDate, true)}</p>
                  {phone.purchaseDate && <p><strong className="text-gray-600">تاریخ خرید:</strong> {formatDateForDisplay(phone.purchaseDate)}</p>}
                  {phone.saleDate && phone.status === "فروخته شده" && <p><strong className="text-gray-600">تاریخ فروش:</strong> {formatDateForDisplay(phone.saleDate)}</p>}
                </div>
                {phone.notes && (
                  <div className="border-t pt-2 mt-2">
                    <p className="text-xs text-gray-700"><strong className="text-gray-600">یادداشت:</strong> {phone.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MobilePhonesPage;
