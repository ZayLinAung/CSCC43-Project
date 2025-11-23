import { useState } from "react";

export default function AutoUpdateButton({ symbol }: { symbol: string }) {
  const [msg, setMsg] = useState("");

  async function updateFromAPI() {
    setMsg("Updating...");

    try {
      const res = await fetch(
        `http://localhost:8000/stocks/update/${symbol}`,
        { method: "POST" }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);

      setMsg("Successfully updated from API!");
    } catch (err: any) {
      setMsg("Error: " + err.message);
    }
  }

  return (
    <div className="mt-6 p-4 bg-white shadow rounded-xl">
      <h2 className="text-xl font-semibold mb-4">Auto Update from Market API</h2>

      <button
        onClick={updateFromAPI}
        className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
      >
        Fetch Latest Prices
      </button>

      {msg && (
        <p className="mt-3 text-center text-gray-700 text-sm">{msg}</p>
      )}
    </div>
  );
}
