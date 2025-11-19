'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Stocklist {
  stocklist_id: number;
  title: string;
  username: string;
}

type StocklistView = 'self' | 'public' | 'friends';

function ShareStocklistModal({ listId, onClose }: { listId: number; onClose: () => void; }) {
  const [friends, setFriends] = useState<string[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<string>('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const response = await fetch('http://localhost:8000/users/friends/all', { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to fetch friends');
        const data = await response.json();
        console.log(data);
        setFriends(data.users || []);
      } catch (err: any) {
        setError(err.message);
      }
    };
    fetchFriends();
  }, []);

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!selectedFriend) {
      setError('Please select a friend to share with.');
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/stocklists/${listId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ friendname: selectedFriend }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to share stocklist');
      }
      
      setSuccess('Stocklist shared successfully!');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      <div className="relative z-50 w-full max-w-md p-8 bg-white rounded-lg shadow-xl">
        <h2 className="mb-6 text-2xl font-bold text-center">Share Stocklist</h2>
        <form onSubmit={handleShare}>
          <div className="mb-6">
            <label htmlFor="friend" className="block mb-2 text-sm font-medium text-gray-700">Select a Friend</label>
            <select
              id="friend"
              value={selectedFriend}
              onChange={(e) => setSelectedFriend(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500"
              required
            >
              <option value="" disabled>-- Choose a friend --</option>
              {friends.map((friend) => (
                <option key={friend} value={friend}>
                  {friend}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="mb-4 text-sm text-center text-red-500">{error}</p>}
          {success && <p className="mb-4 text-sm text-center text-green-500">{success}</p>}
          <div className="flex items-center justify-end space-x-4">
            <button type="button" onClick={onClose} className="px-4 py-2 cursor-pointer text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
              Cancel
            </button>
            <button type="submit" className="px-4 cursor-pointer py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700">
              Share
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateStocklistModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [listname, setListname] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!listname) {
      setError('List name is required.');
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/stocklists/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
            "name": listname,
            "visibility": isPublic ? 'public' : 'private'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create stocklist');
      }
      
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
        <div className="relative z-50 w-full max-w-md p-8 bg-white rounded-lg shadow-xl">
            <h2 className="mb-6 text-2xl font-bold text-center">Create New Stocklist</h2>
            <form onSubmit={handleSubmit}>
            <div className="mb-4">
                <label htmlFor="listname" className="block mb-2 text-sm font-medium text-gray-700">List Name</label>
                <input
                id="listname"
                type="text"
                value={listname}
                onChange={(e) => setListname(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500"
                required
                />
            </div>
            <div className="flex items-center justify-between mb-6">
                <span className="text-sm font-medium text-gray-700">Make Public</span>
                <label htmlFor="isPublic" className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" id="isPublic" className="sr-only peer" checked={isPublic} onChange={() => setIsPublic(!isPublic)} />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-indigo-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
            </div>
            {error && <p className="mb-4 text-sm text-center text-red-500">{error}</p>}
            <div className="flex items-center justify-end space-x-4">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
                Cancel
                </button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700">
                Create
                </button>
            </div>
            </form>
        </div>
    </div>
  );
}


export default function StocklistsPage() {
  const [view, setView] = useState<StocklistView>('self');
  const [stocklists, setStocklists] = useState<Stocklist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchStocklists(view, 1);
    setCurrentPage(1);
  }, [view]);

  useEffect(() => {
    fetchStocklists(view, currentPage);
  }, [currentPage]);

  const fetchStocklists = async (currentView: StocklistView, page: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
      });
      
      const response = await fetch(`http://localhost:8000/stocklists/${currentView}?${params}`, { credentials: 'include' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to fetch ${currentView} stocklists`);
      }
      const data = await response.json();
      setStocklists(data.stocklists);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message);
      setStocklists([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenShareModal = (listId: number) => {
    setSelectedListId(listId);
    setIsShareModalOpen(true);
  };

  const totalPages = Math.ceil(total / itemsPerPage);

  const renderContent = () => {
    if (isLoading) return <p className="text-center">Loading...</p>;
    if (error) return <p className="text-center text-red-500">{error}</p>;
    if (stocklists.length === 0) return <p className="text-center text-gray-500">No stocklists found.</p>;

    return (
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Name</th>
              {view !== 'self' && <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Owner</th>}
              {view === 'self' && <th className="px-6 py-3 text-xs font-medium tracking-wider text-right text-gray-500 uppercase">Actions</th>}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {stocklists.map((list) => (
              <tr key={list.stocklist_id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link href={`/stocklists/${list.stocklist_id}`} className="text-sm font-medium text-indigo-600 hover:text-indigo-900">
                    {list.title}
                  </Link>
                </td>
                {view !== 'self' && <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{list.username}</td>}
                {view === 'self' && (
                  <td className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap">
                    <button onClick={() => handleOpenShareModal(list.stocklist_id)} className="text-indigo-600 border border-indigo-600 rounded-lg px-4 py-2 cursor-pointer hover:text-white hover:bg-indigo-600">
                      Share
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {isCreateModalOpen && <CreateStocklistModal onClose={() => setIsCreateModalOpen(false)} onCreated={() => fetchStocklists(view, currentPage)} />}
      {isShareModalOpen && selectedListId && <ShareStocklistModal listId={selectedListId} onClose={() => setIsShareModalOpen(false)} />}
      <div className="container px-4 py-8 mx-auto">
        <div className="flex items-center justify-between mb-6">
            <h1 className="text-4xl font-bold text-gray-800">Stocklists</h1>
            <button onClick={() => setIsCreateModalOpen(true)} className="px-4 py-2 font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700">
                Create New Stocklist
            </button>
        </div>
        
        <div className="flex justify-center mb-8 border-b border-gray-200">
          <button onClick={() => setView('self')} className={`px-4 py-2 text-sm font-medium ${view === 'self' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
            My Stocklists
          </button>
          <button onClick={() => setView('public')} className={`px-4 py-2 text-sm font-medium ${view === 'public' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
            Public
          </button>
          <button onClick={() => setView('friends')} className={`px-4 py-2 text-sm font-medium ${view === 'friends' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
            Shared With Me
          </button>
        </div>

        {renderContent()}

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
