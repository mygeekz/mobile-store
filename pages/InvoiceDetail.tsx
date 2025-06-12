
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import moment from 'jalali-moment';

import { InvoiceData, NotificationMessage, InvoiceLineItem } from '../types';
import Notification from '../components/Notification';

const InvoiceDetailPage: React.FC = () => {
  const { saleId } = useParams<{ saleId: string }>();
  const navigate = useNavigate();
  const invoicePrintRef = useRef<HTMLDivElement>(null);

  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  useEffect(() => {
    if (!saleId) {
      navigate('/invoices');
      return;
    }

    const fetchInvoiceData = async () => {
      setIsLoading(true);
      setNotification(null);
      try {
        const response = await fetch(`/api/invoice-data/${saleId}`);
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.message || 'خطا در دریافت اطلاعات فاکتور');
        }
        setInvoiceData(result.data);
      } catch (error) {
        setNotification({ type: 'error', text: (error as Error).message });
        if ((error as Error).message.includes('یافت نشد')) {
          setTimeout(() => navigate('/invoices'), 3000);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvoiceData();
  }, [saleId, navigate]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!invoicePrintRef.current || !invoiceData) return;
    setNotification({type: 'success', text: 'در حال آماده‌سازی PDF... لطفاً کمی صبر کنید.'})

    try {
        const canvas = await html2canvas(invoicePrintRef.current, {
            scale: 2, // Improve quality
            useCORS: true,
            logging: false, 
        });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'p', // portrait
            unit: 'mm', // millimeters
            format: 'a4', // A4 page size
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgProps = pdf.getImageProperties(imgData);
        const imgWidth = imgProps.width;
        const imgHeight = imgProps.height;
        
        // Calculate the aspect ratio
        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
        
        // Calculate the new dimensions of the image to fit within the PDF page
        const newImgWidth = imgWidth * ratio;
        const newImgHeight = imgHeight * ratio;

        // Calculate position to center the image (optional)
        const xPos = (pdfWidth - newImgWidth) / 2;
        const yPos = (pdfHeight - newImgHeight) / 2;
        
        // pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, newImgHeight); // Stretch to width, maintain aspect ratio
        pdf.addImage(imgData, 'PNG', xPos > 0 ? xPos : 0, yPos > 0 ? yPos : 0, newImgWidth, newImgHeight);


        pdf.save(`فاکتور-${invoiceData.invoiceMetadata.invoiceNumber}.pdf`);
        setNotification({type: 'success', text: 'فاکتور PDF با موفقیت دانلود شد.'})
    } catch (error) {
        console.error("Error generating PDF:", error);
        setNotification({type: 'error', text: 'خطا در تولید PDF. لطفاً دوباره امتحان کنید.'})
    }
  };

  const formatPrice = (price: number | undefined | null) => {
    if (price === undefined || price === null) return '۰';
    return price.toLocaleString('fa-IR');
  };
  
  const formatDate = (shamsiDate: string) => {
     return moment(shamsiDate, 'YYYY/MM/DD', 'fa').format('dddd، D MMMM YYYY');
  };


  if (isLoading) {
    return <div className="p-10 text-center text-gray-500"><i className="fas fa-spinner fa-spin text-3xl mb-3"></i><p>در حال بارگذاری اطلاعات فاکتور...</p></div>;
  }

  if (!invoiceData) {
    return (
      <div className="p-10 text-center text-red-500">
        <i className="fas fa-exclamation-circle text-3xl mb-3"></i>
        <p>اطلاعات فاکتور یافت نشد یا خطایی در بارگذاری رخ داده است.</p>
        <button onClick={() => navigate('/invoices')} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            بازگشت به لیست فاکتورها
        </button>
      </div>
    );
  }

  const { businessDetails, customerDetails, invoiceMetadata, lineItems, financialSummary, notes } = invoiceData;

  return (
    <div className="text-right" dir="rtl">
      <Notification message={notification} onClose={() => setNotification(null)} />
      
      <div className="mb-6 p-4 bg-white rounded-lg shadow-md flex items-center justify-end space-x-3 space-x-reverse print:hidden">
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors text-sm"
        >
          <i className="fas fa-print ml-2"></i>چاپ فاکتور
        </button>
        <button
          onClick={handleDownloadPDF}
          className="px-4 py-2 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 transition-colors text-sm"
        >
          <i className="fas fa-file-pdf ml-2"></i>دانلود PDF
        </button>
      </div>

      {/* Invoice Content - A4 like structure */}
      <div ref={invoicePrintRef} id="invoice-content" className="bg-white p-8 md:p-12 shadow-lg rounded-md max-w-4xl mx-auto border border-gray-200 print:shadow-none print:border-none print:m-0 print:p-0">
        <style>
          {`
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              #invoice-content { width: 210mm; min-height: 290mm; /* A4 approx */ }
            }
          `}
        </style>
        {/* Header */}
        <header className="flex justify-between items-start pb-6 border-b-2 border-gray-800">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">{businessDetails.name}</h1>
            <p className="text-sm text-gray-600">{businessDetails.addressLine1}</p>
            {businessDetails.addressLine2 && <p className="text-sm text-gray-600">{businessDetails.addressLine2}</p>}
            <p className="text-sm text-gray-600">{businessDetails.cityStateZip}</p>
            {businessDetails.phone && <p className="text-sm text-gray-600">تلفن: <span dir="ltr">{businessDetails.phone}</span></p>}
            {businessDetails.email && <p className="text-sm text-gray-600">ایمیل: <span dir="ltr">{businessDetails.email}</span></p>}
          </div>
          <div className="text-left">
            <h2 className="text-2xl font-semibold text-indigo-700">فاکتور فروش</h2>
            <p className="text-sm text-gray-600">شماره فاکتور: <span className="font-medium">{Number(invoiceMetadata.invoiceNumber).toLocaleString('fa-IR')}</span></p>
            <p className="text-sm text-gray-600">تاریخ: <span className="font-medium">{formatDate(invoiceMetadata.transactionDate)}</span></p>
          </div>
        </header>

        {/* Customer Details */}
        <section className="my-8 flex justify-between">
          <div className="w-1/2 pr-4">
             {customerDetails && (
                <>
                    <h3 className="font-semibold text-gray-700 mb-1">مشخصات خریدار:</h3>
                    <p className="text-sm text-gray-600">{customerDetails.fullName}</p>
                    {customerDetails.phoneNumber && <p className="text-sm text-gray-600">تلفن: <span dir="ltr">{customerDetails.phoneNumber}</span></p>}
                    {customerDetails.address && <p className="text-sm text-gray-600">آدرس: {customerDetails.address}</p>}
                </>
             )}
             {!customerDetails && (
                 <p className="text-sm text-gray-600 font-medium">فروش به مشتری مهمان</p>
             )}
          </div>
           {/* Optionally, shipping details if different */}
        </section>

        {/* Line Items Table */}
        <section className="my-8">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 print:bg-gray-100">
              <tr>
                <th className="p-2 border border-gray-300 text-right font-semibold text-gray-700">شرح کالا/خدمات</th>
                <th className="p-2 border border-gray-300 text-center font-semibold text-gray-700 w-20">تعداد</th>
                <th className="p-2 border border-gray-300 text-center font-semibold text-gray-700 w-32">قیمت واحد (تومان)</th>
                <th className="p-2 border border-gray-300 text-center font-semibold text-gray-700 w-32">مبلغ کل (تومان)</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item) => (
                <tr key={item.id}>
                  <td className="p-2 border border-gray-300">{item.description}</td>
                  <td className="p-2 border border-gray-300 text-center">{item.quantity.toLocaleString('fa-IR')}</td>
                  <td className="p-2 border border-gray-300 text-center">{formatPrice(item.unitPrice)}</td>
                  <td className="p-2 border border-gray-300 text-center">{formatPrice(item.totalPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Financial Summary */}
        <section className="my-8 flex justify-end">
          <div className="w-full sm:w-1/2 lg:w-1/3">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between p-2 bg-gray-50 rounded">
                <span className="font-medium text-gray-700">جمع کل موارد:</span>
                <span className="text-gray-800">{formatPrice(financialSummary.subtotal)} تومان</span>
              </div>
              {financialSummary.discountAmount > 0 && (
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="font-medium text-gray-700">تخفیف:</span>
                  <span className="text-red-600">({formatPrice(financialSummary.discountAmount)}) تومان</span>
                </div>
              )}
              <div className="flex justify-between p-3 bg-gray-700 text-white rounded-md print:bg-gray-700 print:text-white">
                <span className="font-bold text-base">مبلغ نهایی قابل پرداخت:</span>
                <span className="font-bold text-base">{formatPrice(financialSummary.grandTotal)} تومان</span>
              </div>
            </div>
          </div>
        </section>

        {/* Notes */}
        {notes && (
          <section className="my-8 pt-4 border-t border-gray-200">
            <h4 className="font-semibold text-gray-700 mb-1 text-sm">یادداشت‌ها:</h4>
            <p className="text-sm text-gray-600 whitespace-pre-line">{notes}</p>
          </section>
        )}

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t-2 border-gray-800 text-center">
          <p className="text-sm text-gray-600">از خرید شما متشکریم!</p>
          <p className="text-xs text-gray-500 mt-1">{businessDetails.name} - {businessDetails.cityStateZip}</p>
        </footer>
      </div>
    </div>
  );
};

export default InvoiceDetailPage;
