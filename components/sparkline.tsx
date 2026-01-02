'use client';

import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface SparklineProps {
  data: (number | null)[];
  width?: number;
  height?: number;
  color?: string;
}

export function Sparkline({
  data,
  width = 60,
  height = 24,
  color = '#fec200' // Posterns yellow
}: SparklineProps) {
  // Filter out null values and create chart data
  const chartData = data.map((value, index) => ({
    index,
    value: value ?? 0
  }));

  // Don't render if all values are null or no data
  if (data.every(v => v == null) || data.length === 0) {
    return <div style={{ width, height }} className="flex items-center justify-center text-xs text-muted-foreground">N/A</div>;
  }

  return (
    <ResponsiveContainer width={width} height={height}>
      <LineChart data={chartData}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
