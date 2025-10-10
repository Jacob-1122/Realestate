import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { FMRData } from '../types';
import { transformFMRToChartData } from '../utils/dataTransformers';
import { formatCurrency } from '../utils/apiHelpers';

interface FMRChartProps {
  data: FMRData | null;
}

export function FMRChart({ data }: FMRChartProps) {
  if (!data) return null;

  const chartData = transformFMRToChartData(data);

  if (chartData.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <p className="text-gray-500 dark:text-gray-400 text-center">
          No chart data available
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        Fair Market Rent by Bedroom Size
      </h3>
      
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
          <XAxis 
            dataKey="name" 
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: '#1f2937',
              border: 'none',
              borderRadius: '8px',
              color: '#fff'
            }}
            formatter={(value: number) => [formatCurrency(value), 'Monthly Rent']}
          />
          <Bar dataKey="value" radius={[8, 8, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        Data source: HUD Fair Market Rent API • FY {data.year}
      </div>
    </div>
  );
}

