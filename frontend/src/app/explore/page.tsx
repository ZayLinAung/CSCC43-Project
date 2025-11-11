'use client';

import { useState, useEffect } from 'react';

interface User {
  username: string;
}

export default function ExplorePage() {
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const usersPerPage = 50;

  useEffect(() => {
    fetchUsers(searchQuery, currentPage);
    setSentRequests(new Set()); // Reset sent requests on page change
  }, [currentPage]);

  const fetchUsers = async (query: string, page: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: usersPerPage.toString(),
      });
      
      const endpoint = query
        ? `http://localhost:8000/users/${query}?${params}`
        : `http://localhost:8000/users/all?${params}`;

      const response = await fetch(endpoint, { credentials: 'include' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to fetch users');
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    setSentRequests(new Set());
    fetchUsers(searchQuery, 1);
  };

  const handleSendRequest = async (username: string) => {
    try {
      const response = await fetch(`http://localhost:8000/users/${username}/send-friend-request`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to send friend request');
      }
      setSentRequests(prev => new Set(prev).add(username));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const totalPages = Math.ceil(totalUsers / usersPerPage);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container px-4 py-8 mx-auto">
        <h1 className="mb-6 text-4xl font-bold text-center text-gray-800">Explore Users</h1>
        
        <form onSubmit={handleSearch} className="flex max-w-lg mx-auto mb-8">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for users..."
            className="flex-grow px-4 py-2 text-gray-700 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            className="px-6 py-2 font-semibold text-white bg-indigo-600 rounded-r-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Search
          </button>
        </form>

        {isLoading && <p className="text-center">Loading...</p>}
        {error && <p className="text-center text-red-500">Error: {error}</p>}
        
        {!isLoading && !error && (
          <>
            <div className="overflow-x-auto bg-white rounded-lg shadow">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                      Username
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Send Request</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.length > 0 ? (
                    users.map((user) => (
                      <tr key={user.username}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-medium font-bold text-gray-900">{user.username}</div>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap">
                          <button
                            onClick={() => handleSendRequest(user.username)}
                            disabled={sentRequests.has(user.username)}
                            className="text-indigo-600 border cursor-pointer border-indigo-600 rounded-md px-4 py-2 hover:bg-indigo-600 hover:text-white disabled:bg-gray-300 disabled:text-gray-500 disabled:border-gray-300 disabled:cursor-not-allowed"
                          >
                            {sentRequests.has(user.username) ? 'Sent' : 'Send Request'}
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={2} className="px-6 py-4 text-center text-gray-500 whitespace-nowrap">
                        No users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-evenly mt-4">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 text-medium font-bold text-white cursor-pointer bg-indigo-600 border border-gray-300 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  Previous
                </button>
                <span>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 text-medium font-bold cursor-pointer text-white bg-indigo-600 border border-gray-300 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
