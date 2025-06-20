import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { Product, NewProduct, Category, NotificationMessage, Partner } from '../types';
import Notification from '../components/Notification';
import Modal from '../components/Modal'; 
import { useSearchParams } from 'react-router-dom';

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allPartners, setAllPartners] = useState<Partner[]>([]); 
  const [suppliers, setSuppliers] = useState<Partner[]>([]);


  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');

  const [newProduct, setNewProduct] = useState<NewProduct>({ 
    name: '', 
    purchasePrice: 0, 
    sellingPrice: 0, 
    stock_quantity: 0,
    categoryId: '',
    supplierId: '' 
  });

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSupplierName, setNewSupplierName] = useState('');
  
  const [formErrors, setFormErrors] = useState<{ name?: string; purchasePrice?: string; sellingPrice?: string; stock_quantity?: string; categoryId?: string; supplierId?: string }>({});
  const [categoryFormError, setCategoryFormError] = useState<string | null>(null);
  const [supplierFormError, setSupplierFormError] = useState<string | null>(null);

  const [isLoadingProduct, setIsLoadingProduct] = useState(false);
  const [isFetchingProducts, setIsFetchingProducts] = useState(true);
  const [isLoadingCategory, setIsLoadingCategory] = useState(false);
  const [isFetchingCategories, setIsFetchingCategories] = useState(true);
  const [isLoadingSupplier, setIsLoadingSupplier] = useState(false);
  const [isFetchingPartners, setIsFetchingPartners] = useState(true); 
  
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  // State for Modals
  const [editingItem, setEditingItem] = useState<{id: number, name: string, type: 'category' | 'supplier'} | null>(null);
  const [deletingItem, setDeletingItem] = useState<{id: number, name: string, type: 'category' | 'supplier'} | null>(null);
  const [editItemName, setEditItemName] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);


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
      const response = await fetch('/api/partners'); 
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'خطا در دریافت لیست همکاران');
      }
      setAllPartners(result.data);
      setSuppliers(result.data.filter((p: Partner) => p.partnerType === 'Supplier'));
    } catch (error) {
      console.error(error);
      setNotification({ type: 'error', text: (error as Error).message || 'یک خطای ناشناخته هنگام دریافت همکاران رخ داد.' });
    } finally {
      setIsFetchingPartners(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchPartners(); 
  }, []);
  
  useEffect(() => {
    const currentSearchQuery = searchParams.get('search') || '';
    setSearchTerm(currentSearchQuery);
  }, [searchParams]);

  useEffect(() => {
    const lowerSearchTerm = searchTerm.toLowerCase().trim();
    if (!lowerSearchTerm) {
      setFilteredProducts(products);
      return;
    }
    const filtered = products.filter(p =>
      p.name.toLowerCase().includes(lowerSearchTerm) ||
      (p.categoryName && p.categoryName.toLowerCase().includes(lowerSearchTerm)) ||
      (p.supplierName && p.supplierName.toLowerCase().includes(lowerSearchTerm)) ||
      String(p.id).includes(lowerSearchTerm)
    );
    setFilteredProducts(filtered);
  }, [searchTerm, products]);


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
        setNewProduct(prev => ({ ...prev, [name]: 0 }));
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
      supplierId: newProduct.supplierId ? parseInt(String(newProduct.supplierId), 10) : null, 
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
      await fetchProducts(); 
    } catch (error) {
      console.error(error);
      const errorMessage = (error as Error).message || 'یک خطای ناشناخته هنگام افزودن دسته‌بندی رخ داد.';
      setNotification({ type: 'error', text: errorMessage });
      if(errorMessage.includes('تکراری')) {
        setCategoryFormError(errorMessage);
      }
    } finally {
      setIsLoadingCategory(false);
    }
  };

  const handleSupplierInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewSupplierName(e.target.value);
    if (supplierFormError) setSupplierFormError(null);
  };

  const handleSupplierSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newSupplierName.trim()) {
      setSupplierFormError('نام تامین‌کننده نمی‌تواند خالی باشد.');
      return;
    }
    setIsLoadingSupplier(true);
    setNotification(null);
    try {
      const response = await fetch('/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partnerName: newSupplierName.trim(), partnerType: 'Supplier' }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'خطا در افزودن تامین‌کننده');
      }
      setNewSupplierName('');
      setSupplierFormError(null);
      setNotification({ type: 'success', text: 'تامین‌کننده با موفقیت اضافه شد!' });
      await fetchPartners(); 
      await fetchProducts();
    } catch (error) {
      console.error(error);
      const errorMessage = (error as Error).message || 'یک خطای ناشناخته هنگام افزودن تامین‌کننده رخ داد.';
      setNotification({ type: 'error', text: errorMessage });
      if (errorMessage.includes('تکراری') || errorMessage.toLowerCase().includes('unique constraint')) {
        setSupplierFormError('این نام تامین‌کننده یا شماره تماس (در صورت وارد شدن در آینده) قبلا ثبت شده است.');
      } else {
        setSupplierFormError(errorMessage);
      }
    } finally {
      setIsLoadingSupplier(false);
    }
  };

  const openEditModal = (item: Category | Partner, type: 'category' | 'supplier') => {
    setEditingItem({ id: item.id, name: type === 'category' ? (item as Category).name : (item as Partner).partnerName, type });
    setEditItemName(type === 'category' ? (item as Category).name : (item as Partner).partnerName);
  };

  const closeEditModal = () => {
    setEditingItem(null);
    setEditItemName('');
  };

  const handleSaveEdit = async () => {
    if (!editingItem || !editItemName.trim()) {
      setNotification({type: 'error', text: 'نام نمی‌تواند خالی باشد.'});
      return;
    }
    setIsSubmittingEdit(true);
    setNotification(null);
    try {
      let response;
      if (editingItem.type === 'category') {
        response = await fetch(`/api/categories/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: editItemName.trim() }),
        });
      } else { // supplier
        const originalSupplier = allPartners.find(p => p.id === editingItem.id);
        if (!originalSupplier) throw new Error("تامین کننده اصلی یافت نشد.");
        const payload = { ...originalSupplier, partnerName: editItemName.trim() }; // Send full object
        response = await fetch(`/api/partners/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || `خطا در ویرایش ${editingItem.type === 'category' ? 'دسته‌بندی' : 'تامین‌کننده'}`);
      }
      setNotification({ type: 'success', text: `${editingItem.type === 'category' ? 'دسته‌بندی' : 'تامین‌کننده'} با موفقیت ویرایش شد.` });
      closeEditModal();
      await fetchCategories();
      await fetchPartners();
      await fetchProducts();
    } catch (error) {
      setNotification({ type: 'error', text: (error as Error).message });
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const openDeleteModal = (item: Category | Partner, type: 'category' | 'supplier') => {
    setDeletingItem({ id: item.id, name: type === 'category' ? (item as Category).name : (item as Partner).partnerName, type });
  };

  const closeDeleteModal = () => {
    setDeletingItem(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    setIsSubmittingDelete(true);
    setNotification(null);
    try {
      let response;
      if (deletingItem.type === 'category') {
        response = await fetch(`/api/categories/${deletingItem.id}`, { method: 'DELETE' });
      } else { // supplier
        response = await fetch(`/api/partners/${deletingItem.id}`, { method: 'DELETE' });
      }
      const result = await response.json(); // Attempt to parse JSON even for DELETE
      if (!response.ok || (result && result.success === false)) { // Check for explicit failure in JSON
        throw new Error(result.message || `خطا در حذف ${deletingItem.type === 'category' ? 'دسته‌بندی' : 'تامین‌کننده'}`);
      }
      setNotification({ type: 'success', text: `${deletingItem.type === 'category' ? 'دسته‌بندی' : 'تامین‌کننده'} با موفقیت حذف شد.` });
      closeDeleteModal();
      await fetchCategories();
      await fetchPartners();
      await fetchProducts();
    } catch (error) {
      setNotification({ type: 'error', text: (error as Error).message });
    } finally {
      setIsSubmittingDelete(false);
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
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Category Management */}
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
            {isFetchingCategories && categories.length === 0 && <p className="text-sm text-gray-500 mt-4">در حال بارگذاری دسته‌بندی‌ها...</p>}
            {!isFetchingCategories && categories.length === 0 && <p className="text-sm text-gray-500 mt-4">هنوز دسته‌بندی ثبت نشده است.</p>}
            {!isFetchingCategories && categories.length > 0 && (
            <div className="mt-6 max-h-60 overflow-y-auto border rounded-lg">
                <ul className="divide-y divide-gray-200 text-sm text-gray-700">
                {categories.map(cat => (
                    <li key={cat.id} className="flex justify-between items-center p-3 hover:bg-gray-50 transition-colors">
                        <span>{cat.name}</span>
                        <div className="space-x-2 space-x-reverse">
                            <button onClick={() => openEditModal(cat, 'category')} className="text-blue-500 hover:text-blue-700 text-sm px-2 py-1 rounded hover:bg-blue-50" title="ویرایش"><i className="fas fa-pen"></i></button>
                            <button onClick={() => openDeleteModal(cat, 'category')} className="text-red-500 hover:text-red-700 text-sm px-2 py-1 rounded hover:bg-red-50" title="حذف"><i className="fas fa-trash"></i></button>
                        </div>
                    </li>
                ))}
                </ul>
            </div>
            )}
        </div>

        {/* Supplier Management */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-6 border-b pb-4">مدیریت تامین‌کنندگان</h2>
          <form onSubmit={handleSupplierSubmit} className="space-y-4 sm:flex sm:items-end sm:space-y-0 sm:space-x-3 sm:space-x-reverse">
            <div className="flex-grow">
              <label htmlFor="supplierName" className="block text-sm font-medium text-gray-700 mb-1">نام تامین‌کننده جدید</label>
              <input
                type="text" id="supplierName" name="supplierName" value={newSupplierName} onChange={handleSupplierInputChange}
                placeholder="مثال: شرکت آواژنگ"
                className={`w-full p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-right ${supplierFormError ? 'border-red-500 ring-red-300' : 'border-gray-300'}`}
                aria-invalid={!!supplierFormError}
              />
              {supplierFormError && <p className="mt-1.5 text-xs text-red-600">{supplierFormError}</p>}
            </div>
            <button
              type="submit" disabled={isLoadingSupplier || isFetchingPartners}
              className="w-full sm:w-auto px-6 py-3 bg-sky-600 text-white font-medium rounded-lg hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:bg-sky-400 transition-colors"
            >
              {isLoadingSupplier ? (<><i className="fas fa-spinner fa-spin ml-2"></i>در حال افزودن...</>) : 'افزودن تامین‌کننده'}
            </button>
          </form>
           {isFetchingPartners && suppliers.length === 0 && <p className="text-sm text-gray-500 mt-4">در حال بارگذاری تامین‌کنندگان...</p>}
           {!isFetchingPartners && suppliers.length === 0 && <p className="text-sm text-gray-500 mt-4">هنوز تامین‌کننده‌ای (با نوع Supplier) ثبت نشده است.</p>}
            {!isFetchingPartners && suppliers.length > 0 && (
            <div className="mt-6 max-h-60 overflow-y-auto border rounded-lg">
                <ul className="divide-y divide-gray-200 text-sm text-gray-700">
                {suppliers.map(sup => (
                    <li key={sup.id} className="flex justify-between items-center p-3 hover:bg-gray-50 transition-colors">
                        <span>{sup.partnerName}</span>
                         <div className="space-x-2 space-x-reverse">
                            <button onClick={() => openEditModal(sup, 'supplier')} className="text-blue-500 hover:text-blue-700 text-sm px-2 py-1 rounded hover:bg-blue-50" title="ویرایش"><i className="fas fa-pen"></i></button>
                            <button onClick={() => openDeleteModal(sup, 'supplier')} className="text-red-500 hover:text-red-700 text-sm px-2 py-1 rounded hover:bg-red-50" title="حذف"><i className="fas fa-trash"></i></button>
                        </div>
                    </li>
                ))}
                </ul>
            </div>
            )}
        </div>
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
              {isFetchingCategories && <p className="text-xs text-gray-500 mt-1">در حال بارگذاری دسته‌بندی‌ها...</p>}
              {formErrors.categoryId && <p className="mt-1.5 text-xs text-red-600">{formErrors.categoryId}</p>}
            </div>
            <div>
              <label htmlFor="supplierId" className="block text-sm font-medium text-gray-700 mb-1">تامین‌کننده</label>
              <select
                id="supplierId" name="supplierId"
                value={newProduct.supplierId || ''}
                onChange={handleProductInputChange}
                disabled={isFetchingPartners}
                className={`w-full p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-right bg-white ${formErrors.supplierId ? 'border-red-500 ring-red-300' : 'border-gray-300'}`}
              >
                <option value="">بدون تامین‌کننده</option>
                {suppliers.map(partner => ( 
                  <option key={partner.id} value={partner.id}>{partner.partnerName}</option>
                ))}
              </select>
              {isFetchingPartners && <p className="text-xs text-gray-500 mt-1">در حال بارگذاری تامین‌کنندگان...</p>}
              {formErrors.supplierId && <p id="supplierId-error" className="mt-1.5 text-xs text-red-600">{formErrors.supplierId}</p>}
            </div>
          </div>
          <button
            type="submit" disabled={isLoadingProduct || isFetchingProducts || isFetchingCategories || isFetchingPartners}
            className="w-full md:w-auto px-8 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-indigo-400 transition-colors"
          >
            {isLoadingProduct ? 'در حال افزودن...' : 'افزودن محصول'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-lg">
        <div className="flex flex-col sm:flex-row items-center justify-between p-6 border-b border-gray-200 gap-4">
          <h3 className="text-lg font-semibold text-gray-800">لیست محصولات (کالاهای انبار)</h3>
           <div className="relative w-full sm:w-64 md:w-80">
            <input
              type="text"
              placeholder="جستجو بر اساس نام، دسته، تامین کننده..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm outline-none text-right"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <i className="fa-solid fa-search text-gray-400"></i>
            </div>
          </div>
          <button onClick={() => { fetchProducts(); fetchCategories(); fetchPartners(); }} disabled={isFetchingProducts || isLoadingProduct || isFetchingCategories || isFetchingPartners || isLoadingSupplier} className="text-sm text-indigo-600 font-medium hover:text-indigo-800 disabled:text-gray-400 transition-colors whitespace-nowrap">
            <i className={`fas fa-sync-alt ml-2 ${(isFetchingProducts || isFetchingCategories || isFetchingPartners) ? 'fa-spin' : ''}`}></i>
            به‌روزرسانی لیست‌ها
          </button>
        </div>
        <div className="overflow-x-auto">
          {isFetchingProducts && products.length === 0 ? (
            <div className="p-10 text-center text-gray-500"><i className="fas fa-spinner fa-spin text-3xl mb-3"></i><p>در حال بارگذاری محصولات...</p></div>
          ) : !isFetchingProducts && products.length === 0 ? (
            <div className="p-10 text-center text-gray-500"><i className="fas fa-box-open text-3xl text-gray-400 mb-3"></i><p>محصولی برای نمایش وجود ندارد.</p></div>
          ) : !isFetchingProducts && filteredProducts.length === 0 && searchTerm ? (
             <div className="p-10 text-center text-gray-500"><i className="fas fa-search-minus text-3xl text-gray-400 mb-3"></i><p>محصولی با عبارت جستجو شده یافت نشد.</p></div>
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
                {filteredProducts.map((product) => (
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

      {/* Edit Modal */}
      {editingItem && (
        <Modal title={`ویرایش ${editingItem.type === 'category' ? 'دسته‌بندی' : 'تامین‌کننده'}: ${editingItem.name}`} onClose={closeEditModal}>
          <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }} className="space-y-4 p-1">
            <div>
              <label htmlFor="editItemName" className="block text-sm font-medium text-gray-700 mb-1">نام جدید</label>
              <input
                type="text" id="editItemName" value={editItemName} onChange={(e) => setEditItemName(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div className="flex justify-end pt-3 space-x-3 space-x-reverse">
              <button type="button" onClick={closeEditModal} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">انصراف</button>
              <button type="submit" disabled={isSubmittingEdit} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400">
                {isSubmittingEdit ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Modal */}
      {deletingItem && (
        <Modal title={`حذف ${deletingItem.type === 'category' ? 'دسته‌بندی' : 'تامین‌کننده'}`} onClose={closeDeleteModal}>
          <div className="p-1">
            <p className="text-sm text-gray-700 mb-4">
              آیا از حذف "{deletingItem.name}" مطمئن هستید؟ این عمل غیرقابل بازگشت است.
              {deletingItem.type === 'category' && <span className="block text-xs text-orange-600 mt-1">توجه: محصولاتی که به این دسته‌بندی مرتبط بوده‌اند، بدون دسته‌بندی خواهند شد.</span>}
              {deletingItem.type === 'supplier' && <span className="block text-xs text-orange-600 mt-1">توجه: محصولاتی که از این تامین‌کننده بوده‌اند، بدون تامین‌کننده خواهند شد. همچنین سوابق مالی این تامین‌کننده (دفتر حساب) حذف خواهد شد.</span>}
            </p>
            <div className="flex justify-end pt-3 space-x-3 space-x-reverse">
              <button onClick={closeDeleteModal} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">انصراف</button>
              <button onClick={handleConfirmDelete} disabled={isSubmittingDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-400">
                {isSubmittingDelete ? 'در حال حذف...' : 'تایید و حذف'}
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};

export default Products;