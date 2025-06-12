
import React, { useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Area } from 'recharts';
import StatCard from '../components/StatCard';
import { DASHBOARD_STATS_DATA, RECENT_TRANSACTIONS_DATA, SALES_CHART_DATA_WEEKLY, SALES_CHART_DATA_MONTHLY, SALES_CHART_DATA_YEARLY, CHART_TIMEFRAMES } from '../constants';
import { Transaction, SalesDataPoint, ChartTimeframe, TransactionStatus } from '../types';

const getStatusBadgeClasses = (status: TransactionStatus): string => {
  switch (status) {
    case 'تکمیل شده':
      return 'bg-green-100 text-green-800';
    case 'در حال پردازش':
      return 'bg-blue-100 text-blue-800';
    case 'در انتظار':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const Dashboard: React.FC = () => {
  const [activeTimeframe, setActiveTimeframe] = useState<ChartTimeframe['key']>('weekly');

  const getChartData = (): SalesDataPoint[] => {
    switch (activeTimeframe) {
      case 'monthly':
        return SALES_CHART_DATA_MONTHLY;
      case 'yearly':
        return SALES_CHART_DATA_YEARLY;
      case 'weekly':
      default:
        return SALES_CHART_DATA_WEEKLY;
    }
  };
  
  const currentChartData = getChartData();

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {DASHBOARD_STATS_DATA.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>
      
      {/* Sales Chart */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 text-right">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 sm:mb-0">نمای کلی فروش</h3>
          <div className="flex space-x-2 space-x-reverse"> {/* Use space-x-reverse for RTL button spacing */}
            {CHART_TIMEFRAMES.map((timeframe) => (
              <button
                key={timeframe.key}
                onClick={() => setActiveTimeframe(timeframe.key)}
                className={`px-3 py-1.5 text-xs sm:text-sm rounded-lg font-medium transition-colors ${
                  activeTimeframe === timeframe.key
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {timeframe.label}
              </button>
            ))}
          </div>
        </div>
        <div className="w-full h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={currentChartData} margin={{ top: 5, right: -20, left: 20, bottom: 5 }}> {/* Adjusted margins for RTL */}
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" vertical={false}/>
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={{ stroke: '#e0e0e0' }} tickLine={{ stroke: '#e0e0e0' }} />
              <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} orientation="right" /> {/* Added orientation="right" for YAxis in RTL */}
              <Tooltip
                contentStyle={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)', direction: 'rtl' }}
                itemStyle={{ color: '#4F46E5' }}
                labelStyle={{ color: '#374151', fontWeight: 'bold' }}
              />
              <Legend wrapperStyle={{fontSize: "14px", direction: "rtl"}}/>
              <Area type="monotone" dataKey="sales" stroke="#4F46E5" fillOpacity={1} fill="url(#salesGradient)" strokeWidth={2} activeDot={{ r: 6 }} name="فروش"/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Recent Transactions */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 text-right">
          <h3 className="text-lg font-semibold text-gray-800">تراکنش‌های اخیر</h3>
          <button className="text-sm text-indigo-600 font-medium hover:text-indigo-800 transition-colors">مشاهده همه</button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-right"> {/* Added text-right */}
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">مشتری</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">محصول</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">مبلغ</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">تاریخ</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">وضعیت</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">عملیات</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {RECENT_TRANSACTIONS_DATA.map((transaction: Transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{transaction.customer}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{transaction.product}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{transaction.amount}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{transaction.date}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClasses(transaction.status)}`}>
                      {transaction.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex space-x-3 space-x-reverse justify-end"> {/* Added space-x-reverse and justify-end */}
                      <button className="text-indigo-600 hover:text-indigo-900 transition-colors" title="مشاهده جزئیات">
                        <i className="fa-solid fa-eye"></i>
                      </button>
                      <button className="text-gray-500 hover:text-gray-700 transition-colors" title="چاپ فاکتور">
                        <i className="fa-solid fa-print"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
