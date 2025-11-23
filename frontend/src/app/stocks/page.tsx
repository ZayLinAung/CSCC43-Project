"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface StockItem {
  symbol: string;
}

export default function StockListPage() {
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [filtered, setFiltered] = useState<StockItem[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStocks() {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch("http://localhost:8000/stocks", {
          credentials: "include",
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || "Failed to load stocks");
        }

        const data = await res.json();
        setStocks(data.result);
        setFiltered(data.result);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStocks();
  }, []);

  // Filter stocks when search changes
  useEffect(() => {
    const s = search.toLowerCase();
    setFiltered(stocks.filter((item) => item.symbol.toLowerCase().includes(s)));
  }, [search, stocks]);

  if (isLoading)
    return <p className="text-center mt-10 text-gray-600">Loading stocks...</p>;

  if (error)
    return <p className="text-center text-red-500 mt-10 text-lg">{error}</p>;

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-4xl font-extrabold mb-6 text-center">
          Market Stock List
        </h1>

        {/* Search */}
        <div className="mb-8 max-w-md mx-auto">
          <input
            type="text"
            placeholder="Search symbol..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Stock Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filtered.length > 0 ? (
            filtered.map((item) => (
              <Link
                href={`/stocks/${item.symbol}`}
                key={item.symbol}
                className="bg-white p-6 rounded-xl shadow hover:shadow-xl 
                   transition-shadow border border-gray-200
                   text-center font-semibold text-gray-800 tracking-wide
                   hover:bg-indigo-50 cursor-pointer"
              >
                {item.symbol}
              </Link>
            ))
          ) : (
            <p className="col-span-full text-center text-gray-500">
              No stocks match your search.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
