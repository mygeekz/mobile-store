import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Area } from 'recharts';
import moment from 'jalali-moment';
import StatCard from '../components/StatCard';
import { CHART_TIMEFRAMES } from '../constants';
import { SalesDataPoint, ChartTimeframe, ActivityItem, DashboardAPIData, StatCardData, NotificationMessage } from '../types';
import Notification from '../components/Notification';

const formatPriceForStats = (value: number): string => {
  return value.toLocaleString('fa-IR') + ' تومان';
};
const formatNumberForStats = (value: number): string => {
  return value.toLocaleString('fa-IR');
};

const Dashboard: React.FC = () => {
  const [activeTimeframe, setActiveTimeframe] = useState<ChartTimeframe['key']>('monthly');
  const [dashboardData, setDashboardData] = useState<DashboardAPIData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);
  const [statCards, setStatCards] = useState<StatCardData[]>([]);

  const fetchDashboardData = async (period: ChartTimeframe['key'] = 'monthly') => {
    setIsLoading(true);
    setNotification(null);
    try {
      const response = await fetch(`/api/dashboard/summary?period=${period}`);
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'خطا در دریافت اطلاعات داشبورد');
      }
      setDashboardData(result.data);

      // Update stat cards based on fetched KPIs
      const kpis = result.data.kpis;
      setStatCards([
        {
          title: 'فروش کل ماه جاری',
          value: formatPriceForStats(kpis.totalSalesMonth),
          icon: 'fa-solid fa-dollar-sign',
          iconBgColor: 'bg-indigo-100',
          iconTextColor: 'text-indigo-600',
          trendText: 'در ماه شمسی جاری',
        },
        {
          title: "درآمد امروز",
          value: formatPriceForStats(kpis.revenueToday),
          icon: 'fa-solid fa-sack-dollar',
          iconBgColor: 'bg-green-100',
          iconTextColor: 'text-green-600',
          trendText: 'برای امروز شمسی',
        },
        {
          title: 'محصولات و گوشی‌های فعال',
          value: formatNumberForStats(kpis.activeProductsCount),
          icon: 'fa-solid fa-box-open',
          iconBgColor: 'bg-blue-100',
          iconTextColor: 'text-blue-600',
          trendText: 'مجموع کالاهای موجود در انبار و گوشی‌ها',
        },
        {
          title: 'مجموع مشتریان',
          value: formatNumberForStats(kpis.totalCustomersCount),
          icon: 'fa-solid fa-users',
          iconBgColor: 'bg-purple-100',
          iconTextColor: 'text-purple-600',
          trendText: 'تعداد کل مشتریان ثبت شده',
        },
      ]);

    } catch (error: any) {
      setNotification({ type: 'error', text: error.message });
      setDashboardData(null); // Clear data on error
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchDashboardData(activeTimeframe);
  }, [activeTimeframe]);

  const handleTimeframeChange = (timeframeKey: ChartTimeframe['key']) => {
    setActiveTimeframe(timeframeKey);
    // Data will be re-fetched by the useEffect listening to activeTimeframe
  };
  
  const formatActivityTimestamp = (isoTimestamp: string) => {
    return moment(isoTimestamp).locale('fa').fromNow();
  };


  return (
    <div className="space-y-6">
      <Notification message={notification} onClose={() => setNotification(null)} />
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading && statCards.length === 0 ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-300 rounded w-1/2 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
            </div>
          ))
        ) : (
          statCards.map((stat) => (
            <StatCard key={stat.title} {...stat} />
          ))
        )}
      </div>
      
      {/* Sales Chart */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 text-right">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 sm:mb-0">نمای کلی فروش</h3>
          <div className="flex space-x-2 space-x-reverse">
            {CHART_TIMEFRAMES.map((timeframe) => (
              <button
                key={timeframe.key}
                onClick={() => handleTimeframeChange(timeframe.key)}
                disabled={isLoading}
                className={`px-3 py-1.5 text-xs sm:text-sm rounded-lg font-medium transition-colors ${
                  activeTimeframe === timeframe.key
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:bg-gray-200'
                }`}
              >
                {timeframe.label}
              </button>
            ))}
          </div>
        </div>
        <div className="w-full h-80">
          {isLoading && !dashboardData?.salesChartData ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <i className="fas fa-spinner fa-spin text-2xl mr-2"></i> در حال بارگذاری نمودار...
            </div>
          ) : dashboardData?.salesChartData && dashboardData.salesChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dashboardData.salesChartData} margin={{ top: 5, right: 0, left: 20, bottom: 5 }}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" vertical={false}/>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={{ stroke: '#e0e0e0' }} tickLine={{ stroke: '#e0e0e0' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} orientation="right" tickFormatter={(value) => value.toLocaleString('fa-IR')} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)', direction: 'rtl' }}
                  itemStyle={{ color: '#4F46E5' }}
                  labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                  formatter={(value: number) => [formatPriceForStats(value), 'فروش']}
                />
                <Legend wrapperStyle={{fontSize: "14px", direction: "rtl"}}/>
                <Area type="monotone" dataKey="sales" stroke="#4F46E5" fillOpacity={1} fill="url(#salesGradient)" strokeWidth={2} activeDot={{ r: 6 }} name="فروش"/>
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
                داده‌ای برای نمایش در نمودار برای بازه انتخاب شده وجود ندارد.
            </div>
          )}
        </div>
      </div>
      
      {/* Recent Activities */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 text-right">
          <h3 className="text-lg font-semibold text-gray-800">فعالیت‌های اخیر</h3>
          {/* Optional: <button className="text-sm text-indigo-600 font-medium hover:text-indigo-800 transition-colors">مشاهده همه</button> */}
        </div>
        {isLoading && !dashboardData?.recentActivities ? (
            <div className="p-6 text-center text-gray-500">
              <i className="fas fa-spinner fa-spin text-xl mr-2"></i> در حال بارگذاری فعالیت‌ها...
            </div>
        ) : dashboardData?.recentActivities && dashboardData.recentActivities.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {dashboardData.recentActivities.map((activity: ActivityItem) => (
              <li key={activity.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-3 space-x-reverse">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${activity.color || 'bg-gray-200'}`}>
                    <i className={`${activity.icon} text-white text-lg`}></i>
                  </div>
                  <div className="flex-1 min-w-0 text-right">
                    <p className="text-sm font-medium text-gray-900">{activity.typeDescription}</p>
                    <p className="text-sm text-gray-500 truncate">{activity.details}</p>
                  </div>
                  <div className="text-xs text-gray-400 whitespace-nowrap">
                    {formatActivityTimestamp(activity.timestamp)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
             <div className="p-6 text-center text-gray-500">فعالیت اخیری برای نمایش وجود ندارد.</div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
