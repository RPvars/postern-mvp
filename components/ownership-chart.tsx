'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useTheme } from 'next-themes';

interface Owner {
  name: string;
  sharePercentage: number;
}

interface OwnershipChartProps {
  owners: Owner[];
  otherLabel?: string;
}

const MAX_SLICES = 5;
const OTHER_COLOR_LIGHT = '#d1d5db';
const OTHER_COLOR_DARK = '#4b5563';

// Posterns Yellow with varying opacity for visual distinction
const POSTERNS_YELLOW_RGB = { r: 254, g: 194, b: 0 };

const getColorWithOpacity = (index: number, total: number): string => {
  if (total === 1) return `rgba(${POSTERNS_YELLOW_RGB.r}, ${POSTERNS_YELLOW_RGB.g}, ${POSTERNS_YELLOW_RGB.b}, 1.0)`;
  const opacity = 1.0 - (index / (total - 1)) * 0.6;
  return `rgba(${POSTERNS_YELLOW_RGB.r}, ${POSTERNS_YELLOW_RGB.g}, ${POSTERNS_YELLOW_RGB.b}, ${opacity})`;
};

export function OwnershipChart({ owners, otherLabel = 'Other' }: OwnershipChartProps) {
  const { theme } = useTheme();
  const otherColor = theme === 'dark' ? OTHER_COLOR_DARK : OTHER_COLOR_LIGHT;
  let chartData: { name: string; value: number; isOther?: boolean }[];

  if (owners.length <= MAX_SLICES + 1) {
    chartData = owners.map((o) => ({ name: o.name, value: o.sharePercentage }));
  } else {
    const top = owners.slice(0, MAX_SLICES);
    const rest = owners.slice(MAX_SLICES);
    const restSum = rest.reduce((sum, o) => sum + o.sharePercentage, 0);
    chartData = [
      ...top.map((o) => ({ name: o.name, value: o.sharePercentage })),
      { name: `${otherLabel} (${rest.length})`, value: Math.round(restSum * 100) / 100, isOther: true },
    ];
  }

  const namedSlices = chartData.filter((d) => !d.isOther).length;

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.isOther ? otherColor : getColorWithOpacity(index, namedSlices)}
              />
            ))}
          </Pie>
          <Tooltip formatter={(value) => `${value}%`} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
