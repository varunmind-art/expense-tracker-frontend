import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTheme } from '../../context/ThemeContext';
import { formatIndianCurrency } from '../../utils/helpers';
import { buildExpenseTrend, compactINR, describeTrend } from '../../utils/expenseTrend';

/**
 * Hoisted to module scope on purpose: a component created inside the render body
 * is a new component type on every render, which remounts the tooltip.
 */
const TrendTooltip = ({ active, payload, colors }) => {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  return (
    <div
      className="rounded-lg shadow-lg px-3 py-2 text-sm"
      style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text }}
    >
      <p className="font-semibold mb-1">{point.tooltip}</p>
      <p style={{ color: colors.muted }}>
        Expenses:{' '}
        <span style={{ color: colors.text, fontWeight: 600 }}>{formatIndianCurrency(point.amount)}</span>
      </p>
      <p style={{ color: colors.muted }}>
        Transactions:{' '}
        <span style={{ color: colors.text, fontWeight: 600 }}>{point.count}</span>
      </p>
    </div>
  );
};

const Stat = ({ label, value, hint, tone = '' }) => (
  <div>
    <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
    <p className={`text-lg font-bold ${tone || 'text-gray-800 dark:text-white'}`}>{value}</p>
    {hint ? <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{hint}</p> : null}
  </div>
);

/**
 * Expense Trend for the currently filtered transactions.
 *
 * It receives the same filtered rows the table renders, keeps only EXPENSE rows,
 * and groups them according to the selected Month/Year filters.
 */
const ExpenseTrendChart = ({ expenses = [], month = '', year = '', typeTab = 'ALL' }) => {
  const { darkMode } = useTheme();

  const trend = useMemo(() => buildExpenseTrend(expenses, { month, year }), [expenses, month, year]);
  const subtitle = useMemo(() => describeTrend(trend, { month, year }), [trend, month, year]);

  // Recharts needs concrete colours rather than Tailwind classes.
  const lineColor = darkMode ? '#60a5fa' : '#2563eb';
  const gridColor = darkMode ? '#374151' : '#e5e7eb';
  const axisColor = darkMode ? '#9ca3af' : '#6b7280';
  const tooltipColors = {
    bg: darkMode ? '#1f2937' : '#ffffff',
    border: darkMode ? '#374151' : '#e5e7eb',
    text: darkMode ? '#f3f4f6' : '#111827',
    muted: darkMode ? '#9ca3af' : '#6b7280',
  };

  // Keep roughly ten labels whatever the range, so 31 daily points stay readable.
  const xInterval = Math.max(0, Math.ceil(trend.points.length / 10) - 1);


  const averageUnit = trend.averageLabel === 'daily' ? 'day' : 'month';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 mb-6">
      <div className="flex flex-wrap justify-between items-start gap-2 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Expense Trend</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">Expenses only · savings excluded</span>
      </div>

      {trend.isEmpty ? (
        <div className="py-12 text-center">
          <p className="text-gray-600 dark:text-gray-300 font-medium">No expenses in the selected view</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {typeTab === 'SAVINGS'
              ? 'Savings are not plotted as expenses. Switch to All or Expenses to see spending.'
              : 'Try clearing the filters or choosing a different month or year.'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <Stat
              label="Filtered expenses"
              value={formatIndianCurrency(trend.total)}
              hint={`${trend.count} transaction${trend.count === 1 ? '' : 's'}`}
            />
            <Stat
              label={`Average spending (per ${averageUnit})`}
              value={formatIndianCurrency(trend.average)}
              hint={`across ${trend.points.length} ${averageUnit}${trend.points.length === 1 ? '' : 's'}`}
            />
            <Stat
              label="Highest spending period"
              value={trend.highest ? formatIndianCurrency(trend.highest.amount) : '—'}
              hint={trend.highest ? trend.highest.label : 'no spending in this view'}
              tone="text-blue-700 dark:text-blue-300"
            />
          </div>

          <div className="w-full" style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend.points} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="expenseTrendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={lineColor} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={lineColor} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: axisColor, fontSize: 12 }}
                  tickMargin={8}
                  interval={xInterval}
                  minTickGap={12}
                  tickLine={false}
                  axisLine={{ stroke: gridColor }}
                />
                <YAxis
                  tick={{ fill: axisColor, fontSize: 12 }}
                  tickFormatter={compactINR}
                  width={56}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<TrendTooltip colors={tooltipColors} />} cursor={{ stroke: gridColor, strokeWidth: 1 }} />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke={lineColor}
                  strokeWidth={2}
                  fill="url(#expenseTrendFill)"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
};

export default ExpenseTrendChart;
