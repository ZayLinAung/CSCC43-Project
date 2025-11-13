// "use client";

// import { useEffect, useState } from "react";
// import { useParams } from "next/navigation";

// interface Portfolio {
//   portfolio_id: number;
//   cash: number;
// }

// export default function PortfolioDetailsPage() {
//   const { id } = useParams();

//   const [portfolio, setPortfolio] = useState(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     if (!id) return;

//     async function fetchPortfolio() {
//       const res = await fetch(`http://localhost:8000/portfolio/${id}`, {
//         credentials: "include",
//       });

//       const data = await res.json();
//       setPortfolio(data);
//       setLoading(false);
//     }

//     fetchPortfolio();
//   }, [id]);

//   if (loading) return <p className="p-6">Loading...</p>;
//   if (!portfolio) return <p className="p-6">Portfolio not found.</p>;

//   return (
//     <div className="p-6">
//       <h1 className="text-2xl font-bold">Portfolio {id}</h1>
//       <p className="mt-2 text-gray-700">
//         Cash: ${portfolio.cash.toFixed(2)}
//       </p>
//     </div>
//   );
// }
