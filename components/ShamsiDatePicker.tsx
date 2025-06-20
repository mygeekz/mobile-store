
import React, { useState, useRef, useEffect } from 'react';
import { DayPicker, SelectSingleEventHandler, ClassNames, Formatters, DayPickerProps } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import moment from 'jalali-moment';
import type { Locale, DateLibOptions, Month as RDPMonth, Day as RDPDay } from 'react-day-picker';

interface ShamsiDatePickerProps {
  selectedDate: Date | null | undefined;
  onDateChange: (date: Date | null) => void;
  placeholderText?: string;
  inputClassName?: string;
  id?: string;
  disabled?: boolean;
}

const formatCaptionShamsi = (date: Date, options?: { locale?: Locale }): string => {
  const m = moment(date).locale('fa');
  const shamsiYearNumber = m.jYear();
  const monthName = moment.localeData('fa').jMonths()[m.jMonth()];
  
  let yearStringResult = shamsiYearNumber.toString();
  // Pad with leading zeros if the Shamsi year is less than 4 digits (e.g., 803 becomes "0803")
  // This matches the format seen in the user's screenshots like "آذر 0803".
  if (shamsiYearNumber >= 0 && shamsiYearNumber < 1000) {
     yearStringResult = shamsiYearNumber.toString().padStart(4, '0');
  }
  return `${monthName} ${yearStringResult}`;
};
  
const formatWeekdayNameShamsi = (date: Date, options?: { locale?: Locale }): string => {
    return moment(date).locale('fa').format('dd');
};
  
const formatDayShamsi = (date: Date, options?: { locale?: Locale }): string => {
    return moment(date).locale('fa').format('jD');
};

const shamsiFnsLocale: Locale = {
  code: 'fa-IR',
  formatDistance: (token, count, options) => {
    return `${count} ${token}`; 
  },
  formatRelative: (token, date, baseDate, options) => {
    return moment(date).locale('fa').from(moment(baseDate));
  },
  localize: {
    ordinalNumber: (n, options) => String(n),
    era: (era, options) => (era === 0 ? 'ق.م' : 'ه.ش'),
    quarter: (q, options) => {
      const quarters = ['سه‌ماهه اول', 'سه‌ماهه دوم', 'سه‌ماهه سوم', 'سه‌ماهه چهارم'];
      return quarters[q - 1];
    },
    month: (monthIndex, options): string => { 
      return moment.localeData('fa').jMonths()[monthIndex];
    },
    day: (dayIndex, options): string => { 
      const momentFaWeekdays = moment.localeData('fa').weekdays(); 
      const momentFaWeekdaysShort = moment.localeData('fa').weekdaysShort(); 
      const momentFaWeekdaysMin = moment.localeData('fa').weekdaysMin(); 

      if (options?.width === 'short') return momentFaWeekdaysShort[dayIndex];
      if (options?.width === 'narrow') return momentFaWeekdaysMin[dayIndex] || momentFaWeekdaysShort[dayIndex];
      return momentFaWeekdays[dayIndex];
    },
    dayPeriod: (period, options) => {
      if (options?.width === 'narrow') {
        return period === 'am' ? 'ق' : 'ب';
      }
      return period === 'am' ? 'ق.ظ' : 'ب.ظ';
    },
  },
  formatLong: { 
    date: () => 'jYYYY/jMM/jDD',
    time: () => 'HH:mm:ss',
    dateTime: () => 'jYYYY/jMM/jDD HH:mm:ss',
    // LLL: () => 'jD jMMMM jYYYY HH:mm', // Removed due to error
    LLLL: () => 'dddd، jD jMMMM jYYYY HH:mm', 
    l: () => 'jYYYY/jM/jD',      
    ll: () => 'jD jMMM jYYYY',   
    lll: () => 'jD jMMM jYYYY HH:mm',
    llll: () => 'ddd، jD jMMM jYYYY HH:mm',
  },
  match: { 
    ordinalNumber: (str) => ({ value: parseInt(str, 10), rest: '' }),
    era: (str) => (str === 'ه.ش' ? {value: 1, rest: ''} : (str === 'ق.م' ? {value: 0, rest: ''} : null)),
    quarter: (str) => {
        const num = parseInt(str.replace('سه‌ماهه ', ''), 10);
        return (num >= 1 && num <= 4) ? {value: num as 1|2|3|4, rest: ''} : null;
    },
    month: (str): ({ value: number; rest: string; }) | null => {
        const monthIndex = moment.localeData('fa').jMonths().indexOf(str);
        return monthIndex !== -1 ? {value: monthIndex as number, rest: ''} : null;
    },
    day: (str): ({ value: number; rest: string; }) | null => {
        const dayIndex = moment.localeData('fa').weekdays().indexOf(str);
        return dayIndex !== -1 ? {value: dayIndex as number, rest: ''} : null;
    },
    dayPeriod: (str) => {
        if (str === 'ق.ظ' || str === 'ق') return {value: 'am', rest: ''};
        if (str === 'ب.ظ' || str === 'ب') return {value: 'pm', rest: ''};
        return null;
    }
  },
  options: {
    weekStartsOn: 6, 
    firstWeekContainsDate: 1, 
  },
};

const shamsiFormatters: Formatters = {
    formatCaption: formatCaptionShamsi as (date: Date, options?: DateLibOptions) => string,
    formatDay: formatDayShamsi as (date: Date, options?: DateLibOptions) => string,
    formatWeekdayName: formatWeekdayNameShamsi as (date: Date, options?: DateLibOptions) => string,
    formatMonthCaption: (monthDate: Date) => moment(monthDate).locale('fa').format('jMMMM'),
    formatYearCaption: (yearDate: Date) => moment(yearDate).locale('fa').format('jYYYY'),
    formatMonthDropdown: (monthDate: Date) => moment(monthDate).locale('fa').format('jMMMM'),
    formatYearDropdown: (yearDate: Date) => moment(yearDate).locale('fa').format('jYYYY'),
    // formatWeekNumber: (weekNumber: number) => String(weekNumber), // Commented out due to error
    // formatWeekNumberHeader: (weekNumber: number) => `هفته ${weekNumber.toLocaleString('fa')}`, // Commented out due to error
};


const ShamsiDatePicker: React.FC<ShamsiDatePickerProps> = ({
  selectedDate,
  onDateChange,
  placeholderText = "انتخاب تاریخ شمسی",
  inputClassName = "w-full p-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-right",
  id,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedDate) {
      setInputValue(moment(selectedDate).locale('fa').format('jYYYY/jMM/jDD'));
    } else {
      setInputValue('');
    }
  }, [selectedDate]);

  const handleDaySelect: SelectSingleEventHandler = (date) => {
    onDateChange(date || null);
    setIsOpen(false);
    if(inputRef.current) inputRef.current.blur();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = () => {
    const mDate = moment(inputValue, 'jYYYY/jMM/jDD', true); 
    if (mDate.isValid()) {
        if (!selectedDate || mDate.toDate().getTime() !== selectedDate.getTime()) {
            onDateChange(mDate.toDate());
        }
    } else if (inputValue === '') {
        if (selectedDate) onDateChange(null);
    } else {
        if (selectedDate) {
            setInputValue(moment(selectedDate).locale('fa').format('jYYYY/jMM/jDD'));
        } else {
            setInputValue('');
        }
    }
    setTimeout(() => {
        if (pickerRef.current && inputRef.current && 
            !pickerRef.current.contains(document.activeElement) && 
            document.activeElement !== inputRef.current) {
             setIsOpen(false);
        }
    }, 150);
  };

  const handleInputFocus = () => {
    if (!disabled) setIsOpen(true);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node) && inputRef.current !== event.target) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const defaultMonthGregorian = selectedDate ? moment(selectedDate).toDate() : moment().toDate();

  const dayPickerClassNames: ClassNames = {
    caption_label: "text-sm font-medium text-indigo-700",
    button_previous: "absolute right-1.5 top-1.5 text-indigo-600 hover:text-indigo-800", 
    button_next: "absolute left-1.5 top-1.5 text-indigo-600 hover:text-indigo-800", 
    day: "h-9 w-9 p-0 text-sm hover:bg-indigo-100 rounded-md transition-colors",
    // day_today: "font-bold text-indigo-600", // Removed due to error
    day_selected: "bg-indigo-600 text-white hover:bg-indigo-700 focus:bg-indigo-700 rounded-md",
    day_outside: "text-gray-400 opacity-75",
    caption_dropdowns: "flex justify-center items-center space-x-1 space-x-reverse",
    dropdown: "rdp-dropdown bg-white border border-gray-300 rounded text-sm py-1 px-2 mx-0.5",
    dropdown_icon: "hidden", 
    dropdown_month: "rdp-dropdown_month mx-0.5",
    dropdown_year: "rdp-dropdown_year mx-0.5",
    months: "flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4",
    month: "space-y-4",
    table: "w-full border-collapse",
    head_row: "flex", 
    row: "flex w-full mt-2",
    day_disabled: "text-gray-300 cursor-not-allowed",
    nav_button: "h-6 w-6 flex items-center justify-center p-1 rounded-md hover:bg-gray-100",
    head: "rdp-head",
    tbody: "rdp-tbody",
    tfoot: "rdp-tfoot",
    nav: "rdp-nav",
    caption: "rdp-caption flex justify-between items-center p-2 relative",
  };

  return (
    <div className="relative" ref={pickerRef}>
      <input
        ref={inputRef}
        type="text"
        id={id}
        className={inputClassName}
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        placeholder={placeholderText}
        dir="rtl" 
        disabled={disabled}
        autoComplete="off"
      />
      {isOpen && !disabled && (
        <div
          className="absolute z-10 mt-1 bg-white border border-gray-300 rounded-md shadow-lg"
          style={document.dir === 'rtl' ? { right: 0, top: '100%' } : { left: 0, top: '100%' }}
        >
          <DayPicker
            mode="single"
            selected={selectedDate || undefined} 
            onSelect={handleDaySelect}
            locale={shamsiFnsLocale} 
            formatters={shamsiFormatters}
            dir="rtl" 
            showOutsideDays
            initialFocus={isOpen} 
            defaultMonth={defaultMonthGregorian} 
            captionLayout={"dropdown" as DayPickerProps['captionLayout']}
            fromYear={moment().jYear() - 100} 
            toYear={moment().jYear() + 20}   
            classNames={dayPickerClassNames}
          />
        </div>
      )}
    </div>
  );
};

export default ShamsiDatePicker;
