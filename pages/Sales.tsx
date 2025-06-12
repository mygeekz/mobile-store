import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import moment from 'jalali-moment';

import { 
  SellableItemsResponse, 
  SellableItem, 
  SellablePhoneItem, 
  SellableInventoryItem, 
  NewSaleData, 
  SalesTransactionEntry,
  NotificationMessage,
  Customer
} from '../types';
import Notification from '../components/Notification';
import ShamsiDatePicker from '../components/ShamsiDatePicker'; // New

// Helper to convert a standard Date object (from DatePicker) to Shamsi YYYY/MM/DD string for backend
const fromDatePickerToShamsiString = (date: Date | null): string => {
  if (!date) return moment().locale('fa').format('YYYY/MM/DD'); // Default to today if null
  return moment(date).locale('fa').format('YYYY/MM/DD');
};

const Sales: React.FC = () => {
  const [sellableItems, setSellableItems] = useState<SellableItemsResponse>({ phones: [], inventory: [] });
  const [selectedItemDetails, setSelectedItemDetails] = useState<SellableItem | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  const [transactionDateSelected, setTransactionDateSelected] = useState<Date | null>(new Date());

  const initialFormData: NewSaleData = {
    itemType: 'phone', 
    itemId: 0,
    quantity: 1,
    transactionDate: fromDatePickerToShamsiString(new Date()),
    notes: '',
    discount: 0,
    customerId: null,
  };
  const [formData, setFormData] = useState<NewSaleData>(initialFormData);
  const [salesHistory, setSalesHistory] = useState<SalesTransactionEntry[]>([]);
  
  const [isLoadingSellable, setIsLoadingSellable] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [isSubmittingSale, setIsSubmittingSale] = useState(false);
  
  const [notification, setNotification] = useState<NotificationMessage | null>(null);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof NewSaleData | 'selectedItem' | 'discount', string>>>({});

  const fetchSellableItems = async () => {
    setIsLoadingSellable(true);
    try {
      const response = await fetch('/api/sellable-items');
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'خطا در دریافت لیست کالاهای قابل فروش');
      }
      setSellableItems(result.data);
    } catch (error) {
      console.error(error);
      setNotification({ type: 'error', text: (error as Error).message });
    } finally {
      setIsLoadingSellable(false);
    }
  };

  const fetchSalesHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch('/api/sales');
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'خطا در دریافت تاریخچه فروش');
      }
      setSalesHistory(result.data);
    } catch (error) {
      console.error(error);
      setNotification({ type: 'error', text: (error as Error).message });
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const fetchCustomers = async () => {
    setIsLoadingCustomers(true);
    try {
      const response = await fetch('/api/customers');
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'خطا در دریافت لیست مشتریان');
      }
      setCustomers(result.data);
    } catch (error) {
      console.error(error);
      setNotification({ type: 'error', text: (error as Error).message });
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  useEffect(() => {
    fetchSellableItems();
    fetchSalesHistory();
    fetchCustomers();
  }, []);
  
  useEffect(() => {
    // Update formData's transactionDate when transactionDateSelected changes
    setFormData(prev => ({ ...prev, transactionDate: fromDatePickerToShamsiString(transactionDateSelected) }));
    if(formErrors.transactionDate) setFormErrors(prev => ({...prev, transactionDate: undefined}));
  }, [transactionDateSelected]);


  const handleItemSelectionChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (!value) {
      setSelectedItemDetails(null);
      setFormData(prev => ({ ...prev, itemId: 0, itemType: 'phone', quantity: 1, discount: 0 }));
      setFormErrors(prev => ({ ...prev, selectedItem: undefined, discount: undefined }));
      return;
    }

    const [type, idStr] = value.split('-');
    const id = parseInt(idStr, 10);
    let item: SellableItem | undefined;

    if (type === 'phone') {
      item = sellableItems.phones.find(p => p.id === id);
    } else if (type === 'inventory') {
      item = sellableItems.inventory.find(p => p.id === id);
    }
    
    setSelectedItemDetails(item || null);
    if (item) {
      setFormData(prev => ({
        ...prev,
        itemId: item.id,
        itemType: item.type,
        quantity: item.type === 'phone' ? 1 : (prev.quantity > 0 && prev.itemId === item.id ? prev.quantity : 1),
        discount: 0,
      }));
       setFormErrors(prev => ({ ...prev, selectedItem: undefined, quantity: undefined, discount: undefined }));
    }
  };

  const handleFormInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === "quantity" && selectedItemDetails?.type === 'inventory') {
        const numValue = parseInt(value, 10);
        if (isNaN(numValue) || numValue <= 0) {
            setFormData(prev => ({ ...prev, quantity: value === '' ? 0 : (isNaN(numValue) ? 0 : numValue) }));
        } else if (numValue > (selectedItemDetails as SellableInventoryItem).stock) {
            setFormData(prev => ({ ...prev, quantity: (selectedItemDetails as SellableInventoryItem).stock }));
            setFormErrors(prev => ({ ...prev, quantity: `تعداد موجودی کافی نیست (موجود: ${(selectedItemDetails as SellableInventoryItem).stock.toLocaleString('fa-IR')})`}))
        } else {
             setFormData(prev => ({ ...prev, quantity: numValue }));
             setFormErrors(prev => ({ ...prev, quantity: undefined }));
        }
    } else if (name === "discount") {
        const numValue = parseFloat(value);
        setFormData(prev => ({ ...prev, discount: isNaN(numValue) || value === '' ? 0 : numValue }));
        setFormErrors(prev => ({ ...prev, discount: undefined }));
    } else if (name === "customerId") {
        setFormData(prev => ({ ...prev, customerId: value ? parseInt(value, 10) : null }));
    }
     else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }

    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validateSaleForm = (): boolean => {
    const errors: Partial<Record<keyof NewSaleData | 'selectedItem' | 'discount', string>> = {};
    if (!selectedItemDetails || formData.itemId === 0) {
        errors.selectedItem = "لطفاً یک کالا برای فروش انتخاب کنید.";
    }
    if (!formData.transactionDate.trim() || !moment(formData.transactionDate.trim(), 'YYYY/MM/DD', true).isValid()) {
        errors.transactionDate = "تاریخ فروش شمسی معتبر (مثال: ۱۴۰۳/۰۵/۲۴) الزامی است.";
    }
    if (selectedItemDetails?.type === 'inventory') {
        if (formData.quantity <= 0) {
            errors.quantity = "تعداد باید بیشتر از صفر باشد.";
        } else if (formData.quantity > (selectedItemDetails as SellableInventoryItem).stock) {
            errors.quantity = `تعداد موجودی کافی نیست (موجود: ${(selectedItemDetails as SellableInventoryItem).stock.toLocaleString('fa-IR')}).`;
        }
    }
    const currentDiscount = typeof formData.discount === 'number' ? formData.discount : 0;
    if (currentDiscount < 0) {
        errors.discount = "مبلغ تخفیف نمی‌تواند منفی باشد.";
    }
    const subTotal = selectedItemDetails ? selectedItemDetails.price * (selectedItemDetails.type === 'phone' ? 1 : formData.quantity || 0) : 0;
    if (currentDiscount > subTotal) {
        errors.discount = "مبلغ تخفیف نمی‌تواند بیشتر از قیمت کل اولیه باشد.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateSaleForm()) return;

    setIsSubmittingSale(true);
    setNotification(null);

    const salePayload: NewSaleData = {
      itemType: formData.itemType,
      itemId: formData.itemId,
      quantity: selectedItemDetails?.type === 'phone' ? 1 : formData.quantity,
      transactionDate: formData.transactionDate.trim(), 
      notes: formData.notes?.trim() || undefined,
      discount: typeof formData.discount === 'number' ? formData.discount : 0,
      customerId: formData.customerId,
    };

    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(salePayload),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'خطا در ثبت فروش');
      }
      setNotification({ type: 'success', text: 'فروش با موفقیت ثبت شد!' });
      setFormData(initialFormData);
      setTransactionDateSelected(new Date()); // Reset date picker to today
      setSelectedItemDetails(null);
      setFormErrors({});
      await fetchSellableItems();
      await fetchSalesHistory();
    } catch (error) {
      console.error(error);
      setNotification({ type: 'error', text: (error as Error).message });
    } finally {
      setIsSubmittingSale(false);
    }
  };
  
  const subTotal = selectedItemDetails 
    ? selectedItemDetails.price * (selectedItemDetails.type === 'phone' ? 1 : formData.quantity || 0)
    : 0;
  const currentDiscount = typeof formData.discount === 'number' ? formData.discount : 0;
  const calculatedTotalPrice = subTotal - currentDiscount;

  const formatDateForDisplay = (shamsiDate: string | undefined | null) => {
    if (!shamsiDate) return 'نامشخص';
    return moment(shamsiDate, 'YYYY/MM/DD', 'fa').format('YYYY/MM/DD');
  };

  const formatPrice = (price: number | undefined | null) => {
    if (price === undefined || price === null) return '-';
    return price.toLocaleString('fa-IR') + ' تومان';
  };

  const inputClass = (hasError: boolean, isSelect = false) => 
    `w-full p-2.5 border rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-right ${isSelect ? 'bg-white ' : ''}${hasError ? 'border-red-500 ring-red-300' : 'border-gray-300'}`;
  
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="space-y-8 text-right" dir="rtl">
      <Notification message={notification} onClose={() => setNotification(null)} />

      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-6 border-b pb-4">ثبت فروش جدید</h2>
        {isLoadingSellable || isLoadingCustomers ? (
          <p className="text-gray-500">در حال بارگذاری اطلاعات مورد نیاز...</p>
        ) : (
          <form onSubmit={handleSaleSubmit} className="space-y-4">
            <div>
              <label htmlFor="selectedItem" className={labelClass}>انتخاب کالا برای فروش <span className="text-red-500">*</span></label>
              <select
                id="selectedItem"
                name="selectedItem"
                value={selectedItemDetails ? `${selectedItemDetails.type}-${selectedItemDetails.id}` : ""}
                onChange={handleItemSelectionChange}
                className={inputClass(!!formErrors.selectedItem, true)}
              >
                <option value="">-- انتخاب کنید --</option>
                <optgroup label="گوشی‌های موبایل">
                  {sellableItems.phones.map(phone => (
                    <option key={`phone-${phone.id}`} value={`phone-${phone.id}`}>
                      {phone.name} - {formatPrice(phone.price)}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="کالاهای انبار">
                  {sellableItems.inventory.map(item => (
                    <option key={`inventory-${item.id}`} value={`inventory-${item.id}`}>
                      {item.name} (موجودی: {item.stock.toLocaleString('fa-IR')}) - {formatPrice(item.price)}
                    </option>
                  ))}
                </optgroup>
              </select>
              {formErrors.selectedItem && <p className="mt-1 text-xs text-red-600">{formErrors.selectedItem}</p>}
            </div>

            {selectedItemDetails && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="transactionDatePicker" className={labelClass}>تاریخ فروش <span className="text-red-500">*</span></label>
                    <ShamsiDatePicker
                      id="transactionDatePicker"
                      selectedDate={transactionDateSelected}
                      onDateChange={(date) => setTransactionDateSelected(date)}
                      inputClassName={inputClass(!!formErrors.transactionDate)}
                    />
                    {formErrors.transactionDate && <p className="mt-1 text-xs text-red-600">{formErrors.transactionDate}</p>}
                  </div>

                  {selectedItemDetails.type === 'inventory' && (
                    <div>
                      <label htmlFor="quantity" className={labelClass}>تعداد <span className="text-red-500">*</span></label>
                      <input
                        type="number"
                        id="quantity"
                        name="quantity"
                        value={formData.quantity}
                        onChange={handleFormInputChange}
                        min="1"
                        max={(selectedItemDetails as SellableInventoryItem).stock}
                        className={inputClass(!!formErrors.quantity)}
                      />
                      {formErrors.quantity && <p className="mt-1 text-xs text-red-600">{formErrors.quantity}</p>}
                    </div>
                  )}
                   {selectedItemDetails.type === 'phone' && (
                     <div>
                        <label htmlFor="quantityFixed" className={labelClass}>تعداد</label>
                        <input type="number" id="quantityFixed" value="1" disabled className={`${inputClass(false)} bg-gray-100`} />
                     </div>
                   )}
                   <div>
                    <label htmlFor="discount" className={labelClass}>مبلغ تخفیف (تومان)</label>
                    <input
                        type="number"
                        id="discount"
                        name="discount"
                        value={formData.discount === 0 && !formErrors.discount ? '' : formData.discount}
                        onChange={handleFormInputChange}
                        min="0"
                        className={inputClass(!!formErrors.discount)}
                        placeholder="مثال: ۱۰۰۰۰"
                    />
                    {formErrors.discount && <p className="mt-1 text-xs text-red-600">{formErrors.discount}</p>}
                   </div>
                </div>
                
                <div className="p-3 bg-indigo-50 rounded-lg text-indigo-800 text-sm space-y-1">
                    <p><strong>کالای انتخاب شده:</strong> {selectedItemDetails.name}</p>
                    <p><strong>قیمت واحد:</strong> {formatPrice(selectedItemDetails.price)}</p>
                    <p><strong>تعداد:</strong> {(selectedItemDetails.type === 'phone' ? 1 : formData.quantity || 0).toLocaleString('fa-IR')}</p>
                    { (typeof formData.discount === 'number' && formData.discount > 0) && 
                        <p><strong>تخفیف:</strong> {formatPrice(formData.discount)}</p>
                    }
                    <p className="font-bold text-base"><strong>مبلغ کل نهایی:</strong> {formatPrice(calculatedTotalPrice)}</p>
                </div>

                <div>
                  <label htmlFor="customerId" className={labelClass}>مشتری (اختیاری)</label>
                  <select
                    id="customerId"
                    name="customerId"
                    value={formData.customerId || ''}
                    onChange={handleFormInputChange}
                    className={inputClass(!!formErrors.customerId, true)}
                    disabled={isLoadingCustomers}
                  >
                    <option value="">-- انتخاب مشتری (یا فروش به عنوان مهمان) --</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {customer.fullName} ({customer.phoneNumber || 'بدون شماره'})
                      </option>
                    ))}
                  </select>
                  {isLoadingCustomers && <p className="text-xs text-gray-500 mt-1">درحال بارگذاری مشتریان...</p>}
                  {formErrors.customerId && <p className="mt-1 text-xs text-red-600">{formErrors.customerId}</p>}
                </div>


                <div>
                  <label htmlFor="notes" className={labelClass}>یادداشت</label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    value={formData.notes}
                    onChange={handleFormInputChange}
                    className={inputClass(!!formErrors.notes)}
                  ></textarea>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={isSubmittingSale || !selectedItemDetails || isLoadingCustomers}
              className="w-full sm:w-auto px-6 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-gray-400 transition-colors"
            >
              {isSubmittingSale ? (<><i className="fas fa-spinner fa-spin ml-2"></i>در حال ثبت...</>) : 'ثبت فروش'}
            </button>
          </form>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-lg">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">تاریخچه فروش</h3>
          <button 
            onClick={fetchSalesHistory} 
            disabled={isLoadingHistory || isSubmittingSale}
            className="text-sm text-indigo-600 font-medium hover:text-indigo-800 disabled:text-gray-400 transition-colors"
          >
             <i className={`fas fa-sync-alt ml-2 ${isLoadingHistory ? 'fa-spin' : ''}`}></i>
            به‌روزرسانی تاریخچه
          </button>
        </div>
        {isLoadingHistory ? (
          <div className="p-10 text-center text-gray-500"><i className="fas fa-spinner fa-spin text-3xl mb-3"></i><p>در حال بارگذاری تاریخچه فروش...</p></div>
        ) : salesHistory.length === 0 ? (
          <div className="p-10 text-center text-gray-500"><i className="fas fa-history text-3xl text-gray-400 mb-3"></i><p>هنوز هیچ فروشی ثبت نشده است.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-right">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">تاریخ</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">نام کالا</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">نوع</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">تعداد</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">قیمت واحد</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">تخفیف</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">مبلغ کل نهایی</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">مشتری</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">یادداشت</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {salesHistory.map(sale => (
                  <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatDateForDisplay(sale.transactionDate)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{sale.itemName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{sale.itemType === 'phone' ? 'گوشی موبایل' : 'کالای انبار'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{sale.quantity.toLocaleString('fa-IR')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{formatPrice(sale.pricePerItem)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{formatPrice(sale.discount)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-indigo-700">{formatPrice(sale.totalPrice)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{sale.customerFullName || (sale.customerId ? 'مشتری حذف شده' : 'مهمان')}</td>
                    <td className="px-6 py-4 whitespace-pre-wrap text-xs text-gray-500 max-w-xs truncate hover:whitespace-normal hover:max-w-none" title={sale.notes || ''}>{sale.notes || '-'}</td>
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

export default Sales;