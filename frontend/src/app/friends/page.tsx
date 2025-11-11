'use client';

import { useState, useEffect } from 'react';

interface User {
  username: string;
}

type FriendListView = 'friends' | 'pending' | 'sent';

export default function FriendsPage() {
  const [view, setView] = useState<FriendListView>('friends');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [actionStates, setActionStates] = useState<{[key: string]: boolean}>({});
  const usersPerPage = 10;

  useEffect(() => {
    fetchData(view, 1);
    setCurrentPage(1);
    setActionStates({});
  }, [view]);

  useEffect(() => {
    fetchData(view, currentPage);
  }, [currentPage]);

  const fetchData = async (currentView: FriendListView, page: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: usersPerPage.toString(),
      });
      
      let endpoint = '';
      if (currentView === 'friends') {
        endpoint = `http://localhost:8000/users/friends?${params}`;
      } else if (currentView === 'pending') {
        endpoint = `http://localhost:8000/users/friends/pending?${params}`;
      } else {
        endpoint = `http://localhost:8000/users/friends/sent?${params}`;
      }

      const response = await fetch(endpoint, { credentials: 'include' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to fetch ${currentView}`);
      }
      const data = await response.json();
      setUsers(data.users.map((username: string) => ({ username })));
      setTotalUsers(data.total);
    } catch (err: any) {
      setError(err.message);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (username: string, action: 'accept' | 'reject' | 'remove') => {
    setActionStates(prev => ({...prev, [username]: true}));
    try {
        let endpoint = '';
        let method = 'POST';
        if(action === 'accept') {
            endpoint = `http://localhost:8000/users/${username}/accept-request`;
            method = 'PATCH';
        } else if (action === 'reject') {
            endpoint = `http://localhost:8000/users/${username}/reject-request`;
            method = 'PATCH';
        } else if (action === 'remove') {
            endpoint = `http://localhost:8000/users/${username}/remove-friend`;
            method = 'DELETE';
        }

      const response = await fetch(endpoint, { method, credentials: 'include' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to ${action} user`);
      }
      // Refresh list
      fetchData(view, currentPage);
    } catch (err: any) {
      alert(err.message);
      setActionStates(prev => ({...prev, [username]: false}));
    }
  };

  const totalPages = Math.ceil(totalUsers / usersPerPage);

  const renderList = () => {
    if (isLoading) return <p className="text-center">Loading...</p>;
    if (error) return <p className="text-center text-red-500">Error: {error}</p>;
    if (users.length === 0) return <p className="text-center text-gray-500">No users found.</p>;

    return (
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                Username
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.username}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{user.username}</div>
                </td>
                <td className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap">
                  {view === 'friends' && (
                    <button
                      onClick={() => handleAction(user.username, 'remove')}
                      disabled={actionStates[user.username]}
                      className="text-red-600 hover:text-red-900 disabled:opacity-50"
                    >
                      Remove Friend
                    </button>
                  )}
                  {view === 'pending' && (
                    <div className="space-x-4">
                      <button
                        onClick={() => handleAction(user.username, 'accept')}
                        disabled={actionStates[user.username]}
                        className="text-green-600 hover:text-green-900 disabled:opacity-50"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleAction(user.username, 'reject')}
                        disabled={actionStates[user.username]}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                   {view === 'sent' && (
                    <span className="text-sm text-gray-500">Request Sent</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container px-4 py-8 mx-auto">
        <h1 className="mb-6 text-4xl font-bold text-center text-gray-800">Friends</h1>
        
        <div className="flex justify-center mb-8 border-b border-gray-200">
          <button onClick={() => setView('friends')} className={`px-4 py-2 text-sm font-medium ${view === 'friends' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
            Friends
          </button>
          <button onClick={() => setView('pending')} className={`px-4 py-2 text-sm font-medium ${view === 'pending' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
            Pending Requests
          </button>
          <button onClick={() => setView('sent')} className={`px-4 py-2 text-sm font-medium ${view === 'sent' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
            Sent Requests
          </button>
        </div>

        {renderList()}

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
