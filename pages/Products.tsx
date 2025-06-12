
import React, { useState, useEffect, FormEvent } from 'react';
import { Product, NewProduct, Category, NotificationMessage, Partner } from '../types'; // Added Partner
import Notification from '../components/Notification';

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]); // State for partners/suppliers

  const [newProduct, setNewProduct] = useState<NewProduct>({ 
    name: '', 
    purchasePrice: 0, 
    sellingPrice: 0, 
    stock_quantity: 0,
    categoryId: '',
    supplierId: '' // Added supplierId
  });
  const [newCategoryName, setNewCategoryName] = useState('');
  
  const [formErrors, setFormErrors] = useState<{ name?: string; purchasePrice?: string; sellingPrice?: string; stock_quantity?: string; categoryId?: string; supplierId?: string }>({});
  const [categoryFormError, setCategoryFormError] = useState<string | null>(null);

  const [isLoadingProduct, setIsLoadingProduct] = useState(false);
  const [isFetchingProducts, setIsFetchingProducts] = useState(true);
  const [isLoadingCategory, setIsLoadingCategory] = useState(false);
  const [isFetchingCategories, setIsFetchingCategories] = useState(true);
  const [isFetchingPartners, setIsFetchingPartners] = useState(true); // Loading state for partners
  
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  const fetchProducts = async () => {
    setIsFetchingProducts(true);
    try {
      const response = await fetch('/api/products');
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'خطا در دریافت لیست محصولات');
      }
      setProducts(result.data);
    } catch (error) {
      console.error(error);
      setNotification({ type: 'error', text: (error as Error).message || 'یک خطای ناشناخته هنگام دریافت محصولات رخ داد.' });
    } finally {
      setIsFetchingProducts(false);
    }
  };

  const fetchCategories = async () => {
    setIsFetchingCategories(true);
    try {
      const response = await fetch('/api/categories');
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'خطا در دریافت لیست دسته‌بندی‌ها');
      }
      setCategories(result.data);
    } catch (error) {
      console.error(error);
      setNotification({ type: 'error', text: (error as Error).message || 'یک خطای ناشناخته هنگام دریافت دسته‌بندی‌ها رخ داد.' });
    } finally {
      setIsFetchingCategories(false);
    }
  };

  const fetchPartners = async () => {
    setIsFetchingPartners(true);
    try {
      const response = await fetch('/api/partners?partnerType=Supplier'); // Fetch only suppliers ideally
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'خطا در دریافت لیست تامین‌کنندگان');
      }
      // Filter for suppliers if backend doesn't do it, or adjust API
      setPartners(result.data.filter((p: Partner) => p.partnerType === 'Supplier'));
    } catch (error) {
      console.error(error);
      setNotification({ type: 'error', text: (error as Error).message || 'یک خطای ناشناخته هنگام دریافت تامین‌کنندگان رخ داد.' });
    } finally {
      setIsFetchingPartners(false);
    }
  };


  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchPartners(); // Fetch partners
  }, []);

  const handleProductInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const isNumericField = name === 'purchasePrice' || name === 'sellingPrice' || name === 'stock_quantity';
    
    setNewProduct(prev => ({
      ...prev,
      [name]: isNumericField ? (value === '' ? '' : parseFloat(value)) : value,
    }));

    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };
  
  const handleProductInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numericFields = ['purchasePrice', 'sellingPrice', 'stock_quantity'];
     if (numericFields.includes(name) && value === '') {
        setNewProduct(prev => ({
            ...prev,
            [name]: 0 
        }));
    }
  }

  const validateProductForm = (): boolean => {
    const errors: typeof formErrors = {};
    if (!newProduct.name.trim()) errors.name = 'نام محصول نمی‌تواند خالی باشد.';
    if (typeof newProduct.purchasePrice !== 'number' || newProduct.purchasePrice < 0) errors.purchasePrice = 'قیمت خرید باید عددی غیرمنفی باشد.';
    if (newProduct.purchasePrice > 0 && !newProduct.supplierId) errors.supplierId = 'برای ثبت قیمت خرید، انتخاب تامین‌کننده الزامی است.';
    if (typeof newProduct.sellingPrice !== 'number' || newProduct.sellingPrice <= 0) errors.sellingPrice = 'قیمت فروش باید عددی بزرگتر از صفر باشد.';
    if (typeof newProduct.stock_quantity !== 'number' || newProduct.stock_quantity < 0 || !Number.isInteger(newProduct.stock_quantity)) errors.stock_quantity = 'تعداد موجودی باید یک عدد صحیح و غیرمنفی باشد.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProductSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateProductForm()) return;
    
    setIsLoadingProduct(true);
    setNotification(null);

    const productDataToSubmit: NewProduct = {
      ...newProduct,
      categoryId: newProduct.categoryId ? parseInt(String(newProduct.categoryId), 10) : null,
      supplierId: newProduct.supplierId ? parseInt(String(newProduct.supplierId), 10) : null, // Parse supplierId
    };

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productDataToSubmit),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'خطا در افزودن محصول');
      }
      setNewProduct({ name: '', purchasePrice: 0, sellingPrice: 0, stock_quantity: 0, categoryId: '', supplierId: '' }); 
      setFormErrors({});
      setNotification({ type: 'success', text: 'محصول با موفقیت اضافه شد!' });
      await fetchProducts(); 
    } catch (error) {
      console.error(error);
      setNotification({ type: 'error', text: (error as Error).message || 'یک خطای ناشناخته در هنگام افزودن محصول رخ داد.' });
    } finally {
      setIsLoadingProduct(false);
    }
  };

  const handleCategoryInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewCategoryName(e.target.value);
    if (categoryFormError) setCategoryFormError(null);
  };

  const handleCategorySubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      setCategoryFormError('نام دسته‌بندی نمی‌تواند خالی باشد.');
      return;
    }
    setIsLoadingCategory(true);
    setNotification(null);
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'خطا در افزودن دسته‌بندی');
      }
      setNewCategoryName('');
      setCategoryFormError(null);
      setNotification({ type: 'success', text: 'دسته‌بندی با موفقیت اضافه شد!' });
      await fetchCategories(); 
    } catch (error) {
      console.error(error);
      setNotification({ type: 'error', text: (error as Error).message || 'یک خطای ناشناخته هنگام افزودن دسته‌بندی رخ داد.' });
      if((error as Error).message.includes('تکراری')) {
        setCategoryFormError((error as Error).message);
      }
    } finally {
      setIsLoadingCategory(false);
    }
  };
  
  const formatDate = (isoDate: string) => {
    if (!isoDate) return 'نامشخص';
    try {
      return new Date(isoDate).toLocaleDateString('fa-IR-u-nu-latn', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Tehran'
      });
    } catch (e) { return isoDate; }
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('fa-IR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' تومان';
  };

  return (
    <div className="space-y-8 text-right" dir="rtl">
      <Notification message={notification} onClose={() => setNotification(null)} />
      
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-6 border-b pb-4">مدیریت دسته‌بندی‌ها</h2>
        <form onSubmit={handleCategorySubmit} className="space-y-4 sm:flex sm:items-end sm:space-y-0 sm:space-x-3 sm:space-x-reverse">
          <div className="flex-grow">
            <label htmlFor="categoryName" className="block text-sm font-medium text-gray-700 mb-1">نام دسته‌بندی جدید</label>
            <input
              type="text" id="categoryName" name="categoryName" value={newCategoryName} onChange={handleCategoryInputChange}
              placeholder="مثال: لوازم جانبی"
              className={`w-full p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-right ${categoryFormError ? 'border-red-500 ring-red-300' : 'border-gray-300'}`}
              aria-invalid={!!categoryFormError} aria-describedby={categoryFormError ? "category-name-error" : undefined}
            />
            {categoryFormError && <p id="category-name-error" className="mt-1.5 text-xs text-red-600">{categoryFormError}</p>}
          </div>
          <button
            type="submit" disabled={isLoadingCategory || isFetchingCategories}
            className="w-full sm:w-auto px-6 py-3 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:bg-teal-400 transition-colors"
          >
            {isLoadingCategory ? (<><i className="fas fa-spinner fa-spin ml-2"></i>در حال افزودن...</>) : 'افزودن دسته‌بندی'}
          </button>
        </form>
        {isFetchingCategories && <p className="text-sm text-gray-500 mt-3">در حال بارگذاری دسته‌بندی‌ها...</p>}
        {!isFetchingCategories && categories.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-600">دسته‌بندی‌های موجود:</h3>
            <ul className="list-disc list-inside pr-5 mt-1 text-sm text-gray-500">
              {categories.map(cat => <li key={cat.id}>{cat.name}</li>)}
            </ul>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-6 border-b pb-4">افزودن محصول جدید (کالای انبار)</h2>
        <form onSubmit={handleProductSubmit} className="space-y-5">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">نام محصول</label>
            <input
              type="text" id="name" name="name" value={newProduct.name} onChange={handleProductInputChange}
              className={`w-full p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-right ${formErrors.name ? 'border-red-500 ring-red-300' : 'border-gray-300'}`}
              aria-invalid={!!formErrors.name} aria-describedby={formErrors.name ? "product-name-error" : undefined}
            />
            {formErrors.name && <p id="product-name-error" className="mt-1.5 text-xs text-red-600">{formErrors.name}</p>}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5">
            <div>
              <label htmlFor="purchasePrice" className="block text-sm font-medium text-gray-700 mb-1">قیمت خرید (تومان)</label>
              <input
                type="number" id="purchasePrice" name="purchasePrice" 
                value={newProduct.purchasePrice === 0 && !formErrors.purchasePrice && String(newProduct.purchasePrice).startsWith('0') ? '' : newProduct.purchasePrice}
                onChange={handleProductInputChange} onBlur={handleProductInputBlur}
                min="0" step="any" placeholder="مثال: ۱۰۰۰۰۰"
                className={`w-full p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-right ${formErrors.purchasePrice ? 'border-red-500 ring-red-300' : 'border-gray-300'}`}
                aria-invalid={!!formErrors.purchasePrice} aria-describedby={formErrors.purchasePrice ? "purchasePrice-error" : undefined}
              />
              {formErrors.purchasePrice && <p id="purchasePrice-error" className="mt-1.5 text-xs text-red-600">{formErrors.purchasePrice}</p>}
            </div>
            <div>
              <label htmlFor="sellingPrice" className="block text-sm font-medium text-gray-700 mb-1">قیمت فروش (تومان)</label>
              <input
                type="number" id="sellingPrice" name="sellingPrice"
                value={newProduct.sellingPrice === 0 && !formErrors.sellingPrice && String(newProduct.sellingPrice).startsWith('0') ? '' : newProduct.sellingPrice}
                onChange={handleProductInputChange} onBlur={handleProductInputBlur}
                min="0.01" step="any" placeholder="مثال: ۱۲۰۰۰۰"
                className={`w-full p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-right ${formErrors.sellingPrice ? 'border-red-500 ring-red-300' : 'border-gray-300'}`}
                aria-invalid={!!formErrors.sellingPrice} aria-describedby={formErrors.sellingPrice ? "sellingPrice-error" : undefined}
              />
              {formErrors.sellingPrice && <p id="sellingPrice-error" className="mt-1.5 text-xs text-red-600">{formErrors.sellingPrice}</p>}
            </div>
            <div>
              <label htmlFor="stock_quantity" className="block text-sm font-medium text-gray-700 mb-1">تعداد موجودی اولیه</label>
              <input
                type="number" id="stock_quantity" name="stock_quantity"
                value={newProduct.stock_quantity === 0 && !formErrors.stock_quantity && String(newProduct.stock_quantity).startsWith('0') ? '' : newProduct.stock_quantity}
                onChange={handleProductInputChange} onBlur={handleProductInputBlur}
                min="0" step="1" placeholder="مثال: ۵۰"
                className={`w-full p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-right ${formErrors.stock_quantity ? 'border-red-500 ring-red-300' : 'border-gray-300'}`}
                aria-invalid={!!formErrors.stock_quantity} aria-describedby={formErrors.stock_quantity ? "stock_quantity-error" : undefined}
              />
              {formErrors.stock_quantity && <p id="stock_quantity-error" className="mt-1.5 text-xs text-red-600">{formErrors.stock_quantity}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            <div>
              <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 mb-1">دسته‌بندی</label>
              <select
                id="categoryId" name="categoryId" 
                value={newProduct.categoryId || ''} 
                onChange={handleProductInputChange}
                disabled={isFetchingCategories}
                className={`w-full p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-right bg-white ${formErrors.categoryId ? 'border-red-500 ring-red-300' : 'border-gray-300'}`}
              >
                <option value="">بدون دسته‌بندی</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              {isFetchingCategories && <p className="text-xs text-gray-500 mt-1">درحال بارگذاری دسته‌بندی‌ها...</p>}
              {formErrors.categoryId && <p className="mt-1.5 text-xs text-red-600">{formErrors.categoryId}</p>}
            </div>
            <div>
              <label htmlFor="supplierId" className="block text-sm font-medium text-gray-700 mb-1">تامین‌کننده (اختیاری)</label>
              <select
                id="supplierId" name="supplierId"
                value={newProduct.supplierId || ''}
                onChange={handleProductInputChange}
                disabled={isFetchingPartners}
                className={`w-full p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-right bg-white ${formErrors.supplierId ? 'border-red-500 ring-red-300' : 'border-gray-300'}`}
              >
                <option value="">بدون تامین‌کننده</option>
                {partners.map(partner => (
                  <option key={partner.id} value={partner.id}>{partner.partnerName}</option>
                ))}
              </select>
              {isFetchingPartners && <p className="text-xs text-gray-500 mt-1">درحال بارگذاری تامین‌کنندگان...</p>}
              {formErrors.supplierId && <p id="supplierId-error" className="mt-1.5 text-xs text-red-600">{formErrors.supplierId}</p>}
            </div>
          </div>
          <button
            type="submit" disabled={isLoadingProduct || isFetchingProducts || isFetchingCategories || isFetchingPartners}
            className="w-full md:w-auto px-8 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-indigo-400 transition-colors"
          >
            {isLoadingProduct ? (<><i className="fas fa-spinner fa-spin ml-2"></i>در حال افزودن...</>) : 'افزودن محصول'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-lg">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">لیست محصولات (کالاهای انبار)</h3>
          <button onClick={() => { fetchProducts(); fetchCategories(); fetchPartners(); }} disabled={isFetchingProducts || isLoadingProduct || isFetchingCategories || isFetchingPartners} className="text-sm text-indigo-600 font-medium hover:text-indigo-800 disabled:text-gray-400 transition-colors">
            <i className={`fas fa-sync-alt ml-2 ${(isFetchingProducts || isFetchingCategories || isFetchingPartners) ? 'fa-spin' : ''}`}></i>
            به‌روزرسانی لیست‌ها
          </button>
        </div>
        <div className="overflow-x-auto">
          {isFetchingProducts && products.length === 0 ? (
            <div className="p-10 text-center text-gray-500"><i className="fas fa-spinner fa-spin text-3xl mb-3"></i><p>در حال بارگذاری محصولات...</p></div>
          ) : !isFetchingProducts && products.length === 0 ? (
            <div className="p-10 text-center text-gray-500"><i className="fas fa-box-open text-3xl text-gray-400 mb-3"></i><p>محصولی برای نمایش وجود ندارد.</p></div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 text-right">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">نام محصول</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">دسته‌بندی</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">تامین‌کننده</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">قیمت خرید</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">قیمت فروش</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">موجودی</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">تاریخ افزودن</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-gray-900">{product.name}</div></td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{product.categoryName || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{product.supplierName || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{formatPrice(product.purchasePrice)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{formatPrice(product.sellingPrice)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{product.stock_quantity.toLocaleString('fa-IR')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(product.date_added)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Products;