'use client';

import { useState } from "react";

export default function ManualUpdateForm({ symbol }: { symbol: string }) {
  const [timestamp, setTimestamp] = useState("");
  const [open, setOpen] = useState("");
  const [high, setHigh] = useState("");
  const [low, setLow] = useState("");
  const [close, setClose] = useState("");
  const [volume, setVolume] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    try {
      const res = await fetch("http://localhost:8000/stocks/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timestamp,
          open: parseFloat(open),
          high: parseFloat(high),
          low: parseFloat(low),
          close: parseFloat(close),
          volume: parseInt(volume),
          symbol,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);

      setMessage("Stock updated successfully");
    } catch (err: any) {
      setMessage("Error: " + err.message);
    }
  }

  return (
    <div className="p-4 mt-10 bg-white shadow rounded-xl">
      <h2 className="text-xl font-semibold mb-4">Manual Stock Update</h2>

      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
        <input
          type="date"
          className="p-2 border rounded"
          value={timestamp}
          onChange={(e) => setTimestamp(e.target.value)}
          required
        />
        <input
          type="number"
          className="p-2 border rounded"
          placeholder="Open"
          value={open}
          onChange={(e) => setOpen(e.target.value)}
          required
        />
        <input
          type="number"
          className="p-2 border rounded"
          placeholder="High"
          value={high}
          onChange={(e) => setHigh(e.target.value)}
          required
        />
        <input
          type="number"
          className="p-2 border rounded"
          placeholder="Low"
          value={low}
          onChange={(e) => setLow(e.target.value)}
          required
        />
        <input
          type="number"
          className="p-2 border rounded"
          placeholder="Close"
          value={close}
          onChange={(e) => setClose(e.target.value)}
          required
        />
        <input
          type="number"
          className="p-2 border rounded"
          placeholder="Volume"
          value={volume}
          onChange={(e) => setVolume(e.target.value)}
          required
        />

        <button
          className="col-span-2 bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700"
          type="submit"
        >
          Submit Manual Update
        </button>
      </form>

      {message && (
        <p className="mt-3 text-sm text-center text-gray-700">{message}</p>
      )}
    </div>
  );
}
