"use client";

import { Component, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ManualUpdateForm from "@/components/StockInfoManual";
import AutoUpdateButton from "@/components/StockInfoAuto";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

interface StockData {
  timestamp: string;
  symbol: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const INTERVALS = [
  { label: "1W", days: 7 },
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "1Y", days: 365 },
  { label: "5Y", days: 365 * 5 },
  { label: "ALL", days: Infinity },
];

export default function StockDetailPage() {
  const params = useParams();
  const symbol = params.symbol as string;

  const [data, setData] = useState<StockData[]>([]);
  const [filtered, setFiltered] = useState<StockData[]>([]);
  const [selectedInterval, setSelectedInterval] = useState("1M");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch stock data
  useEffect(() => {
    async function fetchStock() {
      try {
        setLoading(true);
        const res = await fetch(`http://localhost:8000/stocks/${symbol}`);
        if (!res.ok) throw new Error("Unable to fetch stock data");
        const payload = await res.json();
        setData(payload.result);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchStock();
  }, [symbol]);

  useEffect(() => {
    if (!data.length) return;

    const interval = INTERVALS.find((i) => i.label === selectedInterval);
    if (!interval) return;

    if (interval.days === Infinity) {
      setFiltered(data);
      return;
    }

    const now = new Date(data[data.length - 1].timestamp);

    const filteredData = data.filter((entry) => {
      const diff =
        (now.getTime() - new Date(entry.timestamp).getTime()) /
        (1000 * 60 * 60 * 24);
      return diff <= interval.days;
    });

    setFiltered(filteredData);
  }, [selectedInterval, data]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl px-6 py-10 mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-800">{symbol} Stock</h1>

          {/* Auto update button on the right */}
          <div>
            <AutoUpdateButton symbol={symbol} />
          </div>
        </div>

        {/* Interval Buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          {INTERVALS.map((int) => (
            <button
              key={int.label}
              onClick={() => setSelectedInterval(int.label)}
              className={`px-4 py-2 rounded-lg border transition
                ${
                  selectedInterval === int.label
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                }`}
            >
              {int.label}
            </button>
          ))}
        </div>

        {/* Graph */}
        <div className="w-full h-80 bg-white rounded-xl shadow p-4">
          {loading ? (
            <p className="text-center">Loading chart...</p>
          ) : error ? (
            <p className="text-center text-red-500">{error}</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filtered}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" hide={true} />
                <YAxis />
                <Tooltip
                  labelFormatter={(label) =>
                    new Date(label).toLocaleDateString()
                  }
                />
                <Line
                  type="monotone"
                  dataKey="close"
                  stroke="#8884d8"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
        <ManualUpdateForm symbol={symbol} />
      </div>
    </div>
  );
}
