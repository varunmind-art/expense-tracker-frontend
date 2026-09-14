import React from 'react';
import { formatIndianCurrency } from '../../utils/helpers';

const SavingsRateRing = ({ summary }) => {
  const income = summary?.income || 0;
  const saved = summary?.saved || 0;
  const rate = income > 0 ? Math.min(100, Math.max(0, summary?.savingsRate || 0)) : 0;

  // Color logic
  let color = '#EF4444'; // red < 20
  if (rate >= 20 && rate < 40) color = '#F59E0B'; // amber
  else if (rate >= 40) color = '#10B981'; // green

  // SVG ring math
  const size = 160;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (rate / 100) * circumference;

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow flex flex-col items-center justify-center">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 self-start">
        Savings Rate
      </h3>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            className="text-gray-200 dark:text-gray-700"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-gray-800 dark:text-white">
            {income > 0 ? `${rate.toFixed(1)}%` : '—'}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            of {formatIndianCurrency(income)}
          </span>
        </div>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 text-center">
        You saved <span className="font-semibold text-gray-800 dark:text-white">{formatIndianCurrency(saved)}</span> this month
      </p>
    </div>
  );
};

export default SavingsRateRing;