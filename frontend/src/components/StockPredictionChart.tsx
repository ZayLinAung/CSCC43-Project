"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

interface Props {
  prediction: { date: string; predicted_close: number }[];
}

export default function StockPredictionChart({ prediction }: Props) {
  // Merge history + prediction into 1 timeline
  const data = [
    ...prediction.map((p) => ({
      date: p.date,
      historical: null,
      predicted: p.predicted_close
    })),
  ];

  return (
    <LineChart width={900} height={450} data={data}>
      <CartesianGrid strokeDasharray="3 3" />

      <XAxis dataKey="date" minTickGap={30} />
      <YAxis />

      <Tooltip />
      <Legend />

      {/* Predicted future prices */}
      <Line
        type="monotone"
        dataKey="predicted"
        stroke="#F43F5E"
        name="Predicted Price"
        dot={true}
      />
    </LineChart>
  );
}
