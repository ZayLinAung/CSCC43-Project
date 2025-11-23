"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";

interface StocklistItem {
  symbol: string;
  shares: number;
}

interface StocklistDetails {
  stocklist_id: number;
  title: string;
  username: string;
  items: StocklistItem[];
}

interface Review {
  review_id: number;
  username: string;
  content: string;
  created_at: string;
}

interface ReviewModalProps {
  stocklistId: string | string[] | undefined;
  existingReview: Review | null;
  onReviewSubmitted: () => void;
  onClose: () => void;
  isOpen: boolean;
}

function ReviewModal({
  stocklistId,
  existingReview,
  onReviewSubmitted,
  onClose,
  isOpen,
}: ReviewModalProps) {
  const [content, setContent] = useState(existingReview?.content || "");
  const [error, setError] = useState("");

  useEffect(() => {
    setContent(existingReview?.content || "");
  }, [existingReview, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!content.trim()) {
      setError("Review content cannot be empty.");
      return;
    }

    const url = existingReview
      ? `http://localhost:8000/${stocklistId}/reviews/${existingReview.review_id}/edit`
      : `http://localhost:8000/${stocklistId}/reviews/add`;

    const method = existingReview ? "PATCH" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to submit review");
      }

      onReviewSubmitted();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {existingReview ? "Edit Your Review" : "Add a Review"}
          </DialogTitle>
          <DialogDescription>
            Share your thoughts on this stocklist.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-32 p-2 mt-4 border rounded"
            placeholder="Write your review here..."
          />
          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
          <DialogFooter className="mt-4">
            <button
              type="submit"
              className="px-4 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
            >
              {existingReview ? "Update Review" : "Post Review"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteStocklistModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void; }) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you absolutely sure?</DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete this stocklist and all of its contents.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">
            Delete
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SellStockModal({ item, onClose, onSold }: { item: StocklistItem; onClose: () => void; onSold: () => void; }) {
  const params = useParams();
  const id = params.id;
  const [quantity, setQuantity] = useState("1");
  const [error, setError] = useState("");

  const handleSell = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const sellQuantity = parseInt(quantity);

    if (isNaN(sellQuantity) || sellQuantity <= 0) {
      setError("Please enter a valid quantity.");
      return;
    }

    const finalQuantity = Math.min(sellQuantity, item.shares);

    try {
      const response = await fetch(
        `http://localhost:8000/stocklists/${id}/sell-stock`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            symbol: item.symbol,
            quantity: finalQuantity,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to sell stock");
      }

      onSold();
      onClose();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sell Stock</DialogTitle>
          <DialogDescription>
            Selling: <span className="font-semibold">{item.symbol}</span>. You currently own {item.shares} shares.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSell} className="mt-4">
          <div className="mb-4">
            <label
              htmlFor="quantity"
              className="block mb-2 text-sm font-medium text-gray-700"
            >
              Quantity to Sell
            </label>
            <input
              id="quantity"
              type="number"
              min="1"
              max={item.shares}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500"
              required
            />
          </div>
          {error && (
            <p className="mb-4 text-sm text-center text-red-500">{error}</p>
          )}
          <div className="flex items-center justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
            >
              Sell
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function StocklistDetailPage() {
  const params = useParams();
  const id = params.id;
  const [stocklist, setStocklist] = useState<StocklistDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newItemSymbol, setNewItemSymbol] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState("1");
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StocklistItem | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentUserReview, setCurrentUserReview] = useState<Review | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string>('');
  const router = useRouter();

  const fetchStocklistData = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      // Fetch stocklist items, reviews, and user in parallel
      const [itemsResponse, reviewsResponse, reviewSelfResponse, userResponse] =
        await Promise.all([
          fetch(`http://localhost:8000/stocklists/${id}/items`, {
            credentials: "include",
          }),
          fetch(`http://localhost:8000/${id}/reviews`, {
            credentials: "include",
          }),
          fetch(`http://localhost:8000/${id}/reviews/self`, {
            credentials: "include",
          }),
          fetch(`http://localhost:8000/users/me`, { credentials: "include" }),
        ]);

      if (!itemsResponse.ok) {
        const errorData = await itemsResponse.json();
        throw new Error(
          errorData.detail || "Failed to fetch stocklist details"
        );
      }
      const itemsData = await itemsResponse.json();
      setStocklist(itemsData);

      // set all reviews (may include user's review)
      let allReviews: Review[] = [];
      if (reviewsResponse.ok) {
        const reviewsData = await reviewsResponse.json();
        allReviews = reviewsData.reviews || [];
      } else {
        console.warn("Could not fetch reviews.");
      }

      // attempt to fetch current user's review separately so we can show it first
      let selfReview: Review | null = null;
      if (reviewSelfResponse.ok) {
        const selfData = await reviewSelfResponse.json();
        // endpoint returns { review: ... }
        selfReview = selfData.review || null;
      } else if (
        reviewSelfResponse.status === 403 ||
        reviewSelfResponse.status === 404
      ) {
        // no personal review or no access — treat as no review
        selfReview = null;
      } else {
        console.warn("Could not fetch user review.");
      }

      // set current user
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setCurrentUsername(userData.username);
      } else {
        console.warn("Could not fetch current user.");
      }

      if (selfReview) {
        setCurrentUserReview(selfReview);
        const filtered = allReviews.filter(
          (r) => r.review_id !== selfReview!.review_id
        );
        setReviews(filtered);
      } else {
        setReviews(allReviews);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemSymbol.trim() || !id || !newItemQuantity) return;

    try {
      const response = await fetch(
        `http://localhost:8000/stocklists/${id}/add-stock`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            symbol: newItemSymbol,
            quantity: parseInt(newItemQuantity),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to add item");
      }
      setNewItemSymbol("");
      setNewItemQuantity("1");
      fetchStocklistData(); // Refresh the list
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleOpenSellModal = (item: StocklistItem) => {
    setSelectedItem(item);
    setIsSellModalOpen(true);
  };

  const handleReviewSubmitted = () => {
    setIsReviewModalOpen(false);
    fetchStocklistData();
  };

  const handleDeleteStocklist = async () => {
    if (!id) return;
    try {
      const response = await fetch(`http://localhost:8000/stocklists/delete/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete stocklist');
      }
      
      setIsDeleteModalOpen(false);
      router.push('/stocklists');
    } catch (err: any) {
      setError(err.message);
      // Optionally close the modal even if there's an error
      setIsDeleteModalOpen(false);
    }
  };

  const handleDeleteReview = async (reviewId: number) => {
    if (!id) return;
    try {
      const response = await fetch(
        `http://localhost:8000/${id}/reviews/${reviewId}/delete`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to delete review");
      }
      fetchStocklistData(); // Refresh reviews
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchStocklistData();
  }, [id]);

  useEffect(() => {
    if (!currentUserReview && reviews && currentUsername) {
      const userReview =
        reviews.find((r) => r.username === currentUsername) || null;
      if (userReview) {
        setCurrentUserReview(userReview);
        // remove it from reviews list so it appears only as the prominent user's review
        setReviews((prev) =>
          prev.filter((r) => r.review_id !== userReview.review_id)
        );
      }
    }
  }, [reviews, currentUsername, currentUserReview]);

  if (isLoading) return <p className="text-center mt-8">Loading...</p>;
  if (error) return <p className="text-center text-red-500 mt-8">{error}</p>;
  if (!stocklist)
    return <p className="text-center mt-8">Stocklist not found.</p>;

  const otherReviews = reviews
    ? reviews.filter((r) => r.username !== currentUsername)
    : [];

  return (
    <>
      {isSellModalOpen && selectedItem && (
        <SellStockModal
          item={selectedItem}
          onClose={() => setIsSellModalOpen(false)}
          onSold={() => {
            fetchStocklistData();
            setIsSellModalOpen(false);
          }}
        />
      )}
      {isDeleteModalOpen && (
        <DeleteStocklistModal
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDeleteStocklist}
        />
      )}
       <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        stocklistId={id}
        existingReview={currentUserReview}
        onReviewSubmitted={handleReviewSubmitted}
      />
      <div className="min-h-screen z-1 bg-gray-100">
        <div className="container z-1 px-4 py-8 mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="mb-2 text-4xl font-bold text-gray-800">{stocklist.title}</h1>
              <p className="mb-6 text-lg text-gray-600">by {stocklist.username}</p>
            </div>
            {currentUsername === stocklist.username && (
              <button 
                onClick={() => setIsDeleteModalOpen(true)}
                className="px-4 py-2 font-semibold text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Delete Stocklist
              </button>
            )}
          </div>

          <div className="mb-8">
            <form
              onSubmit={handleAddItem}
              className="flex items-center max-w-lg gap-2"
            >
              <input
                type="text"
                value={newItemSymbol}
                onChange={(e) => setNewItemSymbol(e.target.value.toUpperCase())}
                placeholder="Enter stock symbol (e.g., AAPL)"
                className="flex-grow px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500"
              />
              <input
                type="number"
                min="1"
                value={newItemQuantity}
                onChange={(e) => setNewItemQuantity(e.target.value)}
                placeholder="Qty"
                className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500"
              />
              <button
                type="submit"
                className="px-4 py-2 font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              >
                Add Item
              </button>
            </form>
          </div>

          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Ticker
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-right text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stocklist.items && stocklist.items.length > 0 ? (
                  stocklist.items.map((item) => (
                    <tr key={item.symbol}>
                      <td className="px-6 py-4">
                        <Link
                          href={`/stocks/${item.symbol}`}
                          className="text-indigo-600 font-semibold hover:underline"
                        >
                          {item.symbol}
                        </Link>
                      </td>

                      <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                        {item.shares}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap">
                        <button
                          onClick={() => handleOpenSellModal(item)}
                          className="text-red-600 bg-white border cursor-pointer rounded-lg py-1 px-5 border-red-600 hover:bg-red-600 hover:text-white"
                        >
                          Sell
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-6 py-4 text-center text-gray-500"
                    >
                      This stocklist is empty.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Reviews Section */}
          <div className="mt-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-3xl font-bold text-gray-800">Reviews</h2>
              <button
                onClick={() => setIsReviewModalOpen(true)}
                className="px-4 py-2 font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              >
                {currentUserReview ? "Edit Your Review" : "Write a Review"}
              </button>
            </div>
            <div className="space-y-6">
              {currentUserReview && (
                <div
                  key={currentUserReview.review_id}
                  className="p-6 bg-white border-2 border-indigo-500 rounded-lg shadow"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-gray-900">
                      {currentUserReview.username} (Your Review)
                    </p>
                    <button
                      onClick={() =>
                        handleDeleteReview(currentUserReview.review_id)
                      }
                      className="px-3 py-1 text-sm font-semibold text-red-600 border border-red-600 rounded-md hover:bg-red-600 hover:text-white"
                    >
                      Delete
                    </button>
                  </div>
                  <p className="mt-2 text-gray-600">
                    {currentUserReview.content}
                  </p>
                </div>
              )}
              {otherReviews.length > 0
                ? otherReviews.map((review) => (
                    <div
                      key={review.review_id}
                      className="p-6 bg-white rounded-lg shadow"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-gray-900">
                          {review.username}
                        </p>
                      </div>
                      <p className="mt-2 text-gray-600">{review.content}</p>
                    </div>
                  ))
                : !currentUserReview && (
                    <div className="p-6 text-center bg-white rounded-lg shadow">
                      <p className="text-gray-500">
                        No reviews yet. Be the first to write one!
                      </p>
                    </div>
                  )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
