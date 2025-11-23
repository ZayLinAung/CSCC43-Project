"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface PortfolioItem {
  presentmarketvalue: number;
  stock_symbol: string;
  shares: number;
  variance?: number;
  beta?: number;
}

export default function PortfolioDetailPage() {
  const params = useParams();
  const id = params.id;

  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [cash, setCash] = useState<number>(0);
  const [variance, setVariance] = useState<Record<string, number>>({});
  const [beta, setBeta] = useState<Record<string, number>>({});
  const [covarianceMatrix, setCovarianceMatrix] = useState<Record<string, Record<string, number>>>({});
  const [correlationMatrix, setCorrelationMatrix] = useState<Record<string, Record<string, number>>>({});

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newItemSymbol, setNewItemSymbol] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState("1");

  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);
  const [sellQuantity, setSellQuantity] = useState("1");
  const [sellError, setSellError] = useState("");

  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [cashAction, setCashAction] = useState<"deposit" | "withdraw">(
    "deposit"
  );
  const [cashAmount, setCashAmount] = useState("1");
  const [cashError, setCashError] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  // Fetch portfolio
  const fetchPortfolio = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [portfolioRes, varianceRes, betaRes, covCorrRes] = await Promise.all([
        fetch(`http://localhost:8000/portfolio/${id}`, {
          credentials: "include",
        }),
        fetch(`http://localhost:8000/portfolio/get-variance/${id}`, {
          credentials: "include",
        }),
        fetch(`http://localhost:8000/portfolio/get-beta/${id}`, {
          credentials: "include",
        }),
        fetch(`http://localhost:8000/portfolio/get-cov-corr/${id}`, {
            credentials: "include",
        }),
      ]);

      if (!portfolioRes.ok) {
        const err = await portfolioRes.json();
        throw new Error(err.detail || "Failed to fetch portfolio");
      }

      const portfolioData = await portfolioRes.json();
      const varianceData = varianceRes.ok ? await varianceRes.json() : {};
      const betaData = betaRes.ok ? await betaRes.json() : {};
      const covCorrData = covCorrRes.ok ? await covCorrRes.json() : { covariance_matrix: {}, correlation_matrix: {} };

      setCash(portfolioData.cash ?? 0);
      setPortfolio(portfolioData.results || []);
      setVariance(varianceData);
      setBeta(betaData);
      setCovarianceMatrix(covCorrData.covariance_matrix);
      setCorrelationMatrix(covCorrData.correlation_matrix);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Add stock
  // Buy stock (using /transcation)
  // Add stock (Buy)
  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(
        `http://localhost:8000/portfolio/${id}/transcation`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            cash: 0,
            type: "stock_buy",
            stock_symbol: newItemSymbol.toUpperCase(),
            shares: parseInt(newItemQuantity),
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        setToast(err.detail || "Failed to buy stock");
        setTimeout(() => setToast(null), 3500);
        return;
      }

      setNewItemSymbol("");
      setNewItemQuantity("1");
      fetchPortfolio();
    } catch (err: any) {
      setToast(err.message);
      setTimeout(() => setToast(null), 3500);
    }
  };

  const handleSell = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    const qty = parseInt(sellQuantity);
    if (qty <= 0) {
      setSellError("Invalid quantity");
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:8000/portfolio/${id}/transcation`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            cash: 0,
            type: "stock_sell",
            stock_symbol: selectedItem.stock_symbol,
            shares: qty,
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Failed to sell stock");
      }

      setIsSellModalOpen(false);
      setSelectedItem(null);
      fetchPortfolio();
    } catch (err: any) {
      setSellError(err.message);
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, []);

  if (isLoading) return <p className="text-center mt-8">Loading...</p>;
  if (error) return <p className="text-center text-red-500 mt-8">{error}</p>;

  return (
    <>
      {/* Sell Modal */}
      {isSellModalOpen && selectedItem && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setIsSellModalOpen(false)}
          />

          <div className="relative z-50 w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold text-center mb-3">
              Sell {selectedItem.stock_symbol}
            </h2>
            <p className="text-center text-gray-500 mb-4">
              You own {selectedItem.shares} shares
            </p>

            <form onSubmit={handleSell}>
              <input
                type="number"
                min="1"
                max={selectedItem.shares}
                value={sellQuantity}
                onChange={(e) => setSellQuantity(e.target.value)}
                className="w-full p-2 border rounded"
              />

              {sellError && (
                <p className="text-red-500 text-sm mt-2">{sellError}</p>
              )}

              <div className="flex justify-end mt-4 gap-3">
                <button
                  type="button"
                  onClick={() => setIsSellModalOpen(false)}
                  className="px-4 py-2 bg-gray-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 text-white rounded"
                >
                  Sell
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deposit / Withdraw Modal */}
      {isCashModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setIsCashModalOpen(false)}
          />

          <div className="relative z-50 w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold text-center mb-3 capitalize">
              {cashAction} Cash
            </h2>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setCashError("");

                const amount = parseFloat(cashAmount);
                if (isNaN(amount) || amount <= 0) {
                  setCashError("Enter a valid amount");
                  return;
                }

                const type =
                  cashAction === "deposit" ? "cash_deposit" : "cash_withdraw";

                try {
                  const res = await fetch(
                    `http://localhost:8000/portfolio/${id}/transcation`,
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({
                        cash: amount,
                        stock_symbol: "",
                        type: type,
                        shares: 0,
                      }),
                    }
                  );

                  if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.detail || "Transaction failed");
                  }

                  setIsCashModalOpen(false);
                  fetchPortfolio();
                } catch (err: any) {
                  setCashError(err.message);
                }
              }}
            >
              <input
                type="number"
                min="1"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                className="w-full p-2 border rounded"
              />

              {cashError && (
                <p className="text-red-500 text-sm mt-2">{cashError}</p>
              )}

              <div className="flex justify-end mt-4 gap-3">
                <button
                  type="button"
                  onClick={() => setIsCashModalOpen(false)}
                  className="px-4 py-2 bg-gray-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded"
                >
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="min-h-screen bg-gray-100">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <h1 className="text-4xl font-extrabold mb-6">Portfolio {id}</h1>

          {/* Cash Card */}
          <div className="bg-white rounded-xl shadow p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-700">
              Available Cash
            </h2>
            <p className="text-3xl font-bold mt-2 text-green-600">
              ${cash.toLocaleString()}
            </p>
          </div>

          <div className="flex gap-4 mb-4">
            <button
              onClick={() => {
                setCashAction("deposit");
                setCashAmount("1");
                setCashError("");
                setIsCashModalOpen(true);
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Deposit Cash
            </button>

            <button
              onClick={() => {
                setCashAction("withdraw");
                setCashAmount("1");
                setCashError("");
                setIsCashModalOpen(true);
              }}
              className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
            >
              Withdraw Cash
            </button>
          </div>

          {/* Buy Form */}
          <form
            onSubmit={handleAddStock}
            className="flex items-center gap-2 max-w-lg mb-8"
          >
            <input
              type="text"
              value={newItemSymbol}
              onChange={(e) => setNewItemSymbol(e.target.value)}
              placeholder="Symbol (e.g., AAPL)"
              className="flex-grow p-2 border rounded"
            />

            <input
              type="number"
              min="1"
              value={newItemQuantity}
              onChange={(e) => setNewItemQuantity(e.target.value)}
              className="w-24 p-2 border rounded"
            />

            <button className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
              Buy
            </button>
          </form>

          {/* Table */}
          <div className="overflow-x-auto bg-white rounded shadow">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">Ticker</th>
                  <th className="px-6 py-3 text-left">Shares</th>
                  <th className="px-6 py-3 text-left">Present Market Value</th>
                  <th className="px-6 py-3 text-left">Variance</th>
                  <th className="px-6 py-3 text-left">Beta</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {portfolio.length > 0 ? (
                  portfolio.map((item) => (
                    <tr key={item.stock_symbol} className="border-t">
                      <td className="px-6 py-4">
                        <Link
                          href={`/stocks/${item.stock_symbol}`}
                          className="text-indigo-600 font-semibold hover:underline"
                        >
                          {item.stock_symbol}
                        </Link>
                      </td>

                      <td className="px-6 py-4">{item.shares}</td>
                      <td className="px-6 py-4">{item.presentmarketvalue}</td>
                      <td className="px-6 py-4">
                        {variance[item.stock_symbol]?.toFixed(4)}
                      </td>
                      <td className="px-6 py-4">{beta[item.stock_symbol]?.toFixed(4)}</td>

                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setSellQuantity("1");
                            setSellError("");
                            setIsSellModalOpen(true);
                          }}
                          className="px-4 py-1 border border-red-600 text-red-600 rounded hover:bg-red-600 hover:text-white"
                        >
                          Sell
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-6 text-center text-gray-500"
                    >
                      This portfolio has no stocks yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <MatrixTable title="Covariance Matrix" matrix={covarianceMatrix} />
          <MatrixTable title="Correlation Matrix" matrix={correlationMatrix} />
        </div>
      </div>
      {toast && (
        <div
          className="fixed bottom-6 right-6 bg-red-600 text-white px-5 py-3 
                  rounded-lg shadow-lg font-medium z-50 animate-fadeIn"
        >
          {toast}
        </div>
      )}
    </>
  );
}

function MatrixTable({ title, matrix }: { title: string, matrix: Record<string, Record<string, number>> }) {
    const symbols = Object.keys(matrix);
    if (symbols.length === 0) {
        return null;
    }

    return (
        <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4">{title}</h2>
            <div className="overflow-x-auto bg-white rounded shadow">
                <table className="min-w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left"></th>
                            {symbols.map(symbol => (
                                <th key={symbol} className="px-6 py-3 text-left">{symbol}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {symbols.map(rowSymbol => (
                            <tr key={rowSymbol} className="border-t">
                                <td className="px-6 py-4 font-semibold">{rowSymbol}</td>
                                {symbols.map(colSymbol => (
                                    <td key={colSymbol} className="px-6 py-4">
                                        {matrix[rowSymbol]?.[colSymbol]?.toFixed(4)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
