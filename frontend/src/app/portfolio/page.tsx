"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

interface Portfolio {
  portfolio_id: number;
  cash: number;
}

export default function PortfolioListPage() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchPortfolios() {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(`http://localhost:8000/portfolio`, {
          credentials: "include",
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.detail || "Failed to fetch portfolios");
        }

        const data = await res.json();
        console.log(data);
        setPortfolios(Array.isArray(data.result) ? data.result : []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPortfolios();
  }, []);

  const handleCreatePortfolio = async () => {
    try {
      const res = await fetch(`http://localhost:8000/portfolio/create`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to create portfolio");
      }

      const newPortfolio = await res.json();

      setPortfolios((prev) =>
        Array.isArray(prev) ? [...prev, newPortfolio] : [newPortfolio]
      );

      setSuccessMessage("Portfolio created successfully!");

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <>
      {successMessage && (
        <div
          className="fixed bottom-6 right-6 bg-green-600 text-white px-5 py-3 
        rounded-lg shadow-lg text-sm font-medium animate-fadeIn"
        >
          {successMessage}
        </div>
      )}

      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200">
        <div className="container mx-auto px-4 py-12">
          {/* Title */}
          <h1 className="text-4xl font-extrabold text-center text-gray-800 mb-10 tracking-tight">
            Your Portfolios
          </h1>

          {/* Create button */}
          <div className="flex justify-end mb-10">
            <button
              onClick={handleCreatePortfolio}
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 
            text-white rounded-xl shadow-md hover:shadow-lg 
            transition-all font-medium active:scale-95"
            >
              + Create Portfolio
            </button>
          </div>

          {isLoading && (
            <p className="text-center text-gray-600 text-lg">Loading...</p>
          )}

          {error && <p className="text-center text-red-500 text-lg">{error}</p>}

          {!isLoading && !error && (
            <>
              {portfolios.length === 0 ? (
                <p className="text-center text-gray-500 text-lg">
                  You don’t have any portfolios yet.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {portfolios.map((p) => (
                    <button
                      key={p.portfolio_id}
                      onClick={() =>
                        router.push(`/portfolio/${p.portfolio_id}`)
                      }
                      className="
                      group
                      bg-white/70 backdrop-blur-md
                      rounded-2xl p-6 shadow-md border border-gray-200
                      hover:shadow-xl hover:border-indigo-500
                      transition-transform transform hover:-translate-y-1
                      text-left cursor-pointer
                    "
                    >
                      <div className="text-2xl font-bold text-gray-800 mb-2">
                        Portfolio #{p.portfolio_id}
                      </div>

                      <div className="text-gray-600 text-lg">
                        Cash Balance:
                        <span className="ml-1 font-semibold text-gray-900">
                          ${p.cash.toFixed(2)}
                        </span>
                      </div>

                      <div
                        className="
                        mt-4 px-3 py-1 
                        inline-block rounded-lg 
                        bg-indigo-100 text-indigo-700 
                        text-sm font-medium
                        group-hover:bg-indigo-600 group-hover:text-white 
                        transition
                      "
                      >
                        View Details →
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
