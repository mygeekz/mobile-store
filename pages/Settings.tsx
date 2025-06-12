import React, { useState, useEffect, FormEvent, ChangeEvent, useRef } from 'react';
import moment from 'jalali-moment';
import { BusinessInformationSettings, NotificationMessage, Role, UserForDisplay, NewUserFormData } from '../types';
import Notification from '../components/Notification';
import Modal from '../components/Modal';

const Settings: React.FC = () => {
  const [businessInfo, setBusinessInfo] = useState<BusinessInformationSettings>({});
  const [initialBusinessInfo, setInitialBusinessInfo] = useState<BusinessInformationSettings>({});
  const [isLoadingBusinessInfo, setIsLoadingBusinessInfo] = useState(true);
  const [isSavingBusinessInfo, setIsSavingBusinessInfo] = useState(false);
  
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  const [dbFile, setDbFile] = useState<File | null>(null);
  const [isRestoringDb, setIsRestoringDb] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const dbFileInputRef = useRef<HTMLInputElement>(null);

  const [users, setUsers] = useState<UserForDisplay[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUser, setNewUser] = useState<NewUserFormData>({ username: '', password: '', roleId: '' });
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [userFormErrors, setUserFormErrors] = useState<Partial<NewUserFormData>>({});


  const fetchBusinessInfo = async () => {
    setIsLoadingBusinessInfo(true);
    try {
      const response = await fetch('/api/settings');
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'خطا در دریافت اطلاعات فروشگاه');
      setBusinessInfo(result.data);
      setInitialBusinessInfo(result.data); // Keep a copy for reset/dirty check
      if (result.data.store_logo_path) {
        setLogoPreview(`/uploads/${result.data.store_logo_path}?t=${new Date().getTime()}`); // Add timestamp to break cache
      } else {
        setLogoPreview(null);
      }
    } catch (error) {
      setNotification({ type: 'error', text: (error as Error).message });
    } finally {
      setIsLoadingBusinessInfo(false);
    }
  };

  const fetchUsersAndRoles = async () => {
    setIsLoadingUsers(true);
    try {
      const [usersResponse, rolesResponse] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/roles')
      ]);
      const usersResult = await usersResponse.json();
      const rolesResult = await rolesResponse.json();

      if (!usersResponse.ok || !usersResult.success) throw new Error(usersResult.message || 'خطا در دریافت لیست کاربران');
      setUsers(usersResult.data);

      if (!rolesResponse.ok || !rolesResult.success) throw new Error(rolesResult.message || 'خطا در دریافت لیست نقش‌ها');
      setRoles(rolesResult.data);
      if (rolesResult.data.length > 0) {
        setNewUser(prev => ({ ...prev, roleId: rolesResult.data[0].id })); // Default to first role
      }

    } catch (error) {
      setNotification({ type: 'error', text: (error as Error).message });
    } finally {
      setIsLoadingUsers(false);
    }
  };


  useEffect(() => {
    fetchBusinessInfo();
    fetchUsersAndRoles();
  }, []);

  const handleBusinessInfoChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setBusinessInfo(prev => ({ ...prev, [name]: value }));
  };

  const handleBusinessInfoSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSavingBusinessInfo(true);
    setNotification(null);
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(businessInfo),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'خطا در ذخیره اطلاعات');
      setNotification({ type: 'success', text: 'اطلاعات فروشگاه با موفقیت ذخیره شد.' });
      setInitialBusinessInfo(businessInfo); // Update initial state after successful save
    } catch (error) {
      setNotification({ type: 'error', text: (error as Error).message });
    } finally {
      setIsSavingBusinessInfo(false);
    }
  };

  const handleLogoFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) { // 2MB
        setNotification({ type: 'error', text: 'حجم فایل لوگو نباید بیشتر از 2 مگابایت باشد.' });
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp'].includes(file.type)) {
        setNotification({ type: 'error', text: 'فرمت فایل لوگو نامعتبر است. (مجاز: JPG, PNG, GIF, SVG, WebP)' });
        return;
      }
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleLogoUpload = async () => {
    if (!logoFile) {
      setNotification({ type: 'warning', text: 'لطفا ابتدا یک فایل برای لوگو انتخاب کنید.' });
      return;
    }
    setIsUploadingLogo(true);
    setNotification(null);
    const formData = new FormData();
    formData.append('logo', logoFile);

    try {
      const response = await fetch('/api/settings/upload-logo', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'خطا در آپلود لوگو');
      setNotification({ type: 'success', text: 'لوگو با موفقیت آپلود و ذخیره شد.' });
      // Update businessInfo with new logo path from server and refresh preview from server path
      setBusinessInfo(prev => ({ ...prev, store_logo_path: result.data.filePath.replace('/uploads/', '') }));
      setLogoPreview(`${result.data.filePath}?t=${new Date().getTime()}`);
      setLogoFile(null); // Clear selected file
      if (logoInputRef.current) logoInputRef.current.value = ""; // Reset file input
    } catch (error) {
      setNotification({ type: 'error', text: (error as Error).message });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleBackup = async () => {
    setNotification({ type: 'info', text: 'در حال آماده‌سازی فایل پشتیبان...' });
    try {
      const response = await fetch('/api/settings/backup');
      if (!response.ok) {
        const errorResult = await response.json().catch(() => ({ message: 'خطای ناشناخته در سرور هنگام پشتیبان‌گیری' }));
        throw new Error(errorResult.message || 'خطا در دانلود فایل پشتیبان');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kourosh_dashboard_backup_${new Date().toISOString().split('T')[0]}.db`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setNotification({ type: 'success', text: 'فایل پشتیبان با موفقیت دانلود شد.' });
    } catch (error) {
      setNotification({ type: 'error', text: (error as Error).message });
    }
  };

  const handleDbFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.name.split('.').pop()?.toLowerCase() !== 'db') {
        setNotification({ type: 'error', text: 'فایل انتخاب شده باید با فرمت .db باشد.' });
        if (dbFileInputRef.current) dbFileInputRef.current.value = "";
        setDbFile(null);
        return;
      }
      setDbFile(file);
    } else {
      setDbFile(null);
    }
  };

  const handleRestore = async () => {
    if (!dbFile) {
      setNotification({ type: 'warning', text: 'لطفا ابتدا یک فایل پشتیبان .db را انتخاب کنید.' });
      return;
    }
    setIsRestoreModalOpen(false); // Close confirmation modal
    setIsRestoringDb(true);
    setNotification({ type: 'info', text: 'در حال بازیابی پایگاه داده... این عملیات ممکن است کمی طول بکشد.' });
    
    const formData = new FormData();
    formData.append('dbfile', dbFile);

    try {
      const response = await fetch('/api/settings/restore', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'خطا در بازیابی پایگاه داده');
      setNotification({ type: 'success', text: `${result.message} لطفاً صفحه را برای اعمال تغییرات رفرش کنید یا برنامه را مجددا راه‌اندازی نمایید.` });
      setDbFile(null);
      if (dbFileInputRef.current) dbFileInputRef.current.value = "";
      // Potentially force a page reload or guide user
    } catch (error) {
      setNotification({ type: 'error', text: (error as Error).message });
    } finally {
      setIsRestoringDb(false);
    }
  };

  const handleNewUserInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewUser(prev => ({ ...prev, [name]: value }));
    if (userFormErrors[name as keyof NewUserFormData]) {
        setUserFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validateNewUserForm = (): boolean => {
    const errors: Partial<NewUserFormData> = {};
    if (!newUser.username.trim()) errors.username = "نام کاربری الزامی است.";
    else if (newUser.username.trim().length < 3) errors.username = "نام کاربری باید حداقل ۳ کاراکتر باشد.";
    if (!newUser.password?.trim()) errors.password = "کلمه عبور الزامی است.";
    else if (newUser.password.trim().length < 6) errors.password = "کلمه عبور باید حداقل ۶ کاراکتر باشد.";
    if (!newUser.roleId) errors.roleId = "انتخاب نقش الزامی است.";
    setUserFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddUserSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateNewUserForm()) return;
    setIsSavingUser(true);
    setNotification(null);
    try {
        const payload = {
            ...newUser,
            roleId: Number(newUser.roleId)
        };
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || 'خطا در افزودن کاربر');
        setNotification({ type: 'success', text: `کاربر "${result.data.username}" با موفقیت اضافه شد.` });
        setIsAddUserModalOpen(false);
        setNewUser({ username: '', password: '', roleId: roles.length > 0 ? roles[0].id : '' });
        fetchUsersAndRoles(); // Refresh user list
    } catch (error) {
        setNotification({ type: 'error', text: (error as Error).message });
        if ((error as Error).message.includes('نام کاربری قبلا استفاده شده است')) {
            setUserFormErrors(prev => ({ ...prev, username: (error as Error).message }));
        }
    } finally {
        setIsSavingUser(false);
    }
  };
  
  const formatDate = (isoDate: string) => {
    if (!isoDate) return 'نامشخص';
    return moment(isoDate).locale('fa').format('YYYY/MM/DD HH:mm');
  };

  return (
    <div className="space-y-8 text-right" dir="rtl">
      <Notification message={notification} onClose={() => setNotification(null)} />

      {/* Business Information Section */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-6 border-b pb-4">اطلاعات فروشگاه</h2>
        {isLoadingBusinessInfo ? <p>در حال بارگذاری اطلاعات فروشگاه...</p> : (
          <form onSubmit={handleBusinessInfoSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="store_name" className="block text-sm font-medium text-gray-700 mb-1">نام فروشگاه</label>
                <input type="text" name="store_name" id="store_name" value={businessInfo.store_name || ''} onChange={handleBusinessInfoChange} className="w-full p-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
              <div>
                <label htmlFor="store_phone" className="block text-sm font-medium text-gray-700 mb-1">تلفن</label>
                <input type="text" name="store_phone" id="store_phone" value={businessInfo.store_phone || ''} onChange={handleBusinessInfoChange} className="w-full p-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
              <div>
                <label htmlFor="store_email" className="block text-sm font-medium text-gray-700 mb-1">ایمیل</label>
                <input type="email" name="store_email" id="store_email" value={businessInfo.store_email || ''} onChange={handleBusinessInfoChange} className="w-full p-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
              <div>
                <label htmlFor="store_address_line1" className="block text-sm font-medium text-gray-700 mb-1">آدرس (خط ۱)</label>
                <input type="text" name="store_address_line1" id="store_address_line1" value={businessInfo.store_address_line1 || ''} onChange={handleBusinessInfoChange} className="w-full p-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
              <div>
                <label htmlFor="store_address_line2" className="block text-sm font-medium text-gray-700 mb-1">آدرس (خط ۲ - اختیاری)</label>
                <input type="text" name="store_address_line2" id="store_address_line2" value={businessInfo.store_address_line2 || ''} onChange={handleBusinessInfoChange} className="w-full p-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
              <div>
                <label htmlFor="store_city_state_zip" className="block text-sm font-medium text-gray-700 mb-1">شهر، استان، کدپستی</label>
                <input type="text" name="store_city_state_zip" id="store_city_state_zip" value={businessInfo.store_city_state_zip || ''} onChange={handleBusinessInfoChange} className="w-full p-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
            </div>
            <div className="mt-6">
                <button type="submit" disabled={isSavingBusinessInfo} className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400">
                    {isSavingBusinessInfo ? 'در حال ذخیره...' : 'ذخیره اطلاعات فروشگاه'}
                </button>
            </div>
          </form>
        )}
         {/* Logo Upload Section */}
        <div className="mt-8 pt-6 border-t">
            <h3 className="text-md font-semibold text-gray-700 mb-3">لوگوی فروشگاه</h3>
            <div className="flex items-center gap-4">
                {logoPreview && <img src={logoPreview} alt="پیش‌نمایش لوگو" className="w-24 h-24 object-contain border rounded-md p-1" />}
                {!logoPreview && <div className="w-24 h-24 border rounded-md flex items-center justify-center text-gray-400 text-sm p-1">بدون لوگو</div>}
                <div className="flex-1">
                    <input type="file" accept="image/*" onChange={handleLogoFileChange} ref={logoInputRef} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
                    {logoFile && (
                        <button onClick={handleLogoUpload} disabled={isUploadingLogo} className="mt-2 px-4 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 disabled:bg-green-300">
                            {isUploadingLogo ? 'در حال آپلود...' : 'آپلود و ذخیره لوگو'}
                        </button>
                    )}
                </div>
            </div>
        </div>
      </div>

      {/* Data Management Section */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-6 border-b pb-4">مدیریت داده‌ها</h2>
        <div className="space-y-4">
            <div>
                <h3 className="text-md font-semibold text-gray-700 mb-1">پشتیبان‌گیری از پایگاه داده</h3>
                <p className="text-sm text-gray-600 mb-2">یک نسخه کامل از پایگاه داده فعلی خود را دانلود کنید.</p>
                <button onClick={handleBackup} className="px-4 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 text-sm">
                    <i className="fas fa-download ml-2"></i>دانلود فایل پشتیبان (.db)
                </button>
            </div>
            <div className="pt-4 border-t">
                <h3 className="text-md font-semibold text-gray-700 mb-1">بازیابی از فایل پشتیبان</h3>
                <p className="text-sm text-gray-600 mb-2">
                    <span className="font-bold text-red-600">هشدار بسیار مهم:</span> بازیابی از فایل پشتیبان، تمام داده‌های فعلی شما را با اطلاعات فایل پشتیبان <span className="font-bold">جایگزین خواهد کرد</span>. این عمل غیرقابل بازگشت است. لطفاً قبل از ادامه، از داده‌های فعلی خود پشتیبان تهیه کنید.
                </p>
                <input type="file" accept=".db" onChange={handleDbFileChange} ref={dbFileInputRef} className="block w-full max-w-sm text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 mb-3"/>
                <button onClick={() => { if(dbFile) setIsRestoreModalOpen(true); else setNotification({type: 'warning', text: 'ابتدا یک فایل پشتیبان .db انتخاب کنید.'})}} disabled={isRestoringDb || !dbFile} className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:bg-red-400 text-sm">
                    {isRestoringDb ? 'در حال بازیابی...' : 'بازیابی از فایل انتخاب شده'}
                </button>
            </div>
        </div>
      </div>
      {isRestoreModalOpen && (
        <Modal title="تایید نهایی عملیات بازیابی" onClose={() => setIsRestoreModalOpen(false)} widthClass="max-w-md">
            <div className="p-1">
                <p className="text-sm text-gray-700 mb-4">
                    آیا مطمئن هستید که می‌خواهید پایگاه داده را از فایل <strong className="text-indigo-700" dir="ltr">{dbFile?.name}</strong> بازیابی کنید؟
                </p>
                <p className="text-sm font-bold text-red-600 mb-4">این عملیات تمام داده‌های فعلی شما را پاک کرده و اطلاعات فایل پشتیبان را جایگزین می‌کند. این عمل غیرقابل بازگشت است.</p>
                <div className="flex justify-end pt-3 space-x-3 space-x-reverse">
                    <button onClick={() => setIsRestoreModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">انصراف</button>
                    <button onClick={handleRestore} className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700">تایید و بازیابی</button>
                </div>
            </div>
        </Modal>
      )}

      {/* User Management Section */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
            <h2 className="text-xl font-semibold text-gray-800">مدیریت کاربران <span className="text-xs text-orange-500">(ویژه مدیر سیستم)</span></h2>
            <button onClick={() => { setNewUser({ username: '', password: '', roleId: roles.length > 0 ? roles[0].id : '' }); setUserFormErrors({}); setIsAddUserModalOpen(true); }} className="px-4 py-2 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 text-sm">
                <i className="fas fa-user-plus ml-2"></i>افزودن کاربر جدید
            </button>
        </div>
        {isLoadingUsers ? <p>در حال بارگذاری لیست کاربران و نقش‌ها...</p> : (
            users.length === 0 ? <p className="text-gray-500">هیچ کاربری ثبت نشده است.</p> : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="px-4 py-2 text-right font-semibold text-gray-600">نام کاربری</th>
                                <th className="px-4 py-2 text-right font-semibold text-gray-600">نقش</th>
                                <th className="px-4 py-2 text-right font-semibold text-gray-600">تاریخ ثبت نام</th>
                                {/* Add actions column if needed in future */}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.map(user => (
                                <tr key={user.id}>
                                    <td className="px-4 py-2 whitespace-nowrap">{user.username}</td>
                                    <td className="px-4 py-2 whitespace-nowrap">{user.roleName}</td>
                                    <td className="px-4 py-2 whitespace-nowrap">{formatDate(user.dateAdded)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )
        )}
      </div>
      {isAddUserModalOpen && (
          <Modal title="افزودن کاربر جدید" onClose={() => setIsAddUserModalOpen(false)} widthClass="max-w-md">
              <form onSubmit={handleAddUserSubmit} className="space-y-4 p-1">
                  <div>
                      <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">نام کاربری <span className="text-red-500">*</span></label>
                      <input type="text" name="username" id="username" value={newUser.username} onChange={handleNewUserInputChange} className={`w-full p-2.5 border rounded-lg ${userFormErrors.username ? 'border-red-500' : 'border-gray-300'}`} />
                      {userFormErrors.username && <p className="text-xs text-red-500 mt-1">{userFormErrors.username}</p>}
                  </div>
                   <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">کلمه عبور <span className="text-red-500">*</span></label>
                      <input type="password" name="password" id="password" value={newUser.password || ''} onChange={handleNewUserInputChange} className={`w-full p-2.5 border rounded-lg ${userFormErrors.password ? 'border-red-500' : 'border-gray-300'}`} />
                      {userFormErrors.password && <p className="text-xs text-red-500 mt-1">{userFormErrors.password}</p>}
                  </div>
                  <div>
                      <label htmlFor="roleId" className="block text-sm font-medium text-gray-700 mb-1">نقش <span className="text-red-500">*</span></label>
                      <select name="roleId" id="roleId" value={newUser.roleId} onChange={handleNewUserInputChange} className={`w-full p-2.5 border bg-white rounded-lg ${userFormErrors.roleId ? 'border-red-500' : 'border-gray-300'}`} disabled={roles.length === 0}>
                          {roles.length === 0 && <option value="">نقشی یافت نشد</option>}
                          {roles.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}
                      </select>
                      {userFormErrors.roleId && <p className="text-xs text-red-500 mt-1">{userFormErrors.roleId}</p>}
                  </div>
                  <div className="flex justify-end pt-3 space-x-3 space-x-reverse">
                      <button type="button" onClick={() => setIsAddUserModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">انصراف</button>
                      <button type="submit" disabled={isSavingUser} className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:bg-green-400">
                          {isSavingUser ? 'در حال ذخیره...' : 'افزودن کاربر'}
                      </button>
                  </div>
              </form>
          </Modal>
      )}

    </div>
  );
};

export default Settings;