"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

interface Portfolio {
  portfolio_id: number;
  cash: number;
}

export default function PortfolioListPage() {
  const [username, setUsername] = useState<string | null>(null);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("http://localhost:8000/users/me", {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Could not fetch user");
        const data = await res.json();
        setUsername(data.username);
      } catch (err: any) {
        setError(err.message);
      }
    }
    fetchUser();
  }, []);

  useEffect(() => {
    if (!username) return;

    async function fetchPortfolios() {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(`http://localhost:8000/portfolio/${username}`, {
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
  }, [username]);

  const handleCreatePortfolio = async () => {
    try {
      const res = await fetch(
        `http://localhost:8000/portfolio/${username}/create`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to create portfolio");
      }

      const newPortfolio = await res.json();

      setPortfolios((prev) =>
        Array.isArray(prev) ? [...prev, newPortfolio] : [newPortfolio]
      );

      // ✅ Set success alert
      setSuccessMessage("Portfolio created successfully!");

      // Auto-hide after 3 seconds (optional)
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <>
      {successMessage && (
        <div
          className="
    fixed bottom-6 right-6 
    bg-green-600 text-white px-5 py-3 
    rounded-lg shadow-lg text-sm font-medium
  "
        >
          {successMessage}
        </div>
      )}

      <div className="min-h-screen bg-gray-100">
        <div className="container px-4 py-10 mx-auto">
          <h1 className="mb-4 text-3xl font-bold text-center text-gray-800">
            My Portfolios
          </h1>

          {/* Create New Portfolio Button */}
          <div className="flex justify-end mb-6">
            <button
              onClick={handleCreatePortfolio}
              className="px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 font-medium"
            >
              Create New Portfolio
            </button>
          </div>

          {isLoading && <p className="text-center">Loading...</p>}
          {error && <p className="text-center text-red-500">{error}</p>}

          {!isLoading && !error && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              {portfolios.length > 0 ? (
                portfolios.map((p) => (
                  <button
                    key={p.portfolio_id}
                    onClick={() => router.push(`/portfolio/${p.portfolio_id}`)}
                    className="w-full text-left p-5 bg-white rounded-lg shadow hover:shadow-md 
                     border border-gray-200 hover:border-indigo-500 transition cursor-pointer"
                  >
                    <div className="text-xl font-semibold text-gray-800">
                      Portfolio #{p.portfolio_id}
                    </div>
                    <div className="mt-2 text-gray-600">
                      Cash:{" "}
                      <span className="font-medium">${p.cash.toFixed(2)}</span>
                    </div>
                  </button>
                ))
              ) : (
                <p className="text-center text-gray-500 col-span-full">
                  You have no portfolios yet.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
