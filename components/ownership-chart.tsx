'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface Owner {
  name: string;
  sharePercentage: number;
}

interface OwnershipChartProps {
  owners: Owner[];
}

// Posterns Yellow RGB values
const POSTERNS_YELLOW_RGB = { r: 254, g: 194, b: 0 };

// Generate Posterns yellow with varying opacity based on index
// Largest shareholder (index 0) gets 100% opacity
// Smallest shareholder gets 40% opacity
const getColorWithOpacity = (index: number, total: number): string => {
  if (total === 1) return `rgba(${POSTERNS_YELLOW_RGB.r}, ${POSTERNS_YELLOW_RGB.g}, ${POSTERNS_YELLOW_RGB.b}, 1.0)`;

  // Calculate opacity: 100% for first owner, 40% for last owner
  const opacity = 1.0 - (index / (total - 1)) * 0.6;

  return `rgba(${POSTERNS_YELLOW_RGB.r}, ${POSTERNS_YELLOW_RGB.g}, ${POSTERNS_YELLOW_RGB.b}, ${opacity})`;
};

export function OwnershipChart({ owners }: OwnershipChartProps) {
  const chartData = owners.map((owner) => ({
    name: owner.name,
    value: owner.sharePercentage,
  }));

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
              <Cell key={`cell-${index}`} fill={getColorWithOpacity(index, chartData.length)} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => `${value}%`} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
