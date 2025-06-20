import React, { useState, useEffect } from "react";

const API = "/api";

function getToken() {
  const user = JSON.parse(localStorage.getItem("user"));
  return user?.token || localStorage.getItem("token");
}

const Dashboard = ({ user }) => {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [tab, setTab] = useState("friends");
  const [connections, setConnections] = useState({ friends: [], sentRequests: [], receivedRequests: [] });
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  // Fetch connections (friends, requests)
  const fetchConnections = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/connections`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      setConnections(data);
    } catch (err) {
      // handle error
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchConnections();
    // eslint-disable-next-line
  }, [user]);

  // Search users by partial email
  useEffect(() => {
    if (!search) {
      setResults([]);
      setSearching(false);
      setSearchError("");
      return;
    }
    setSearching(true);
    setSearchError("");
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`${API}/search-users?email=${encodeURIComponent(search)}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        setResults(data);
      } catch (err) {
        setResults([]);
        setSearchError("Error searching users");
      }
      setSearching(false);
    }, 400);
    return () => clearTimeout(timeout);
  }, [search]);

  // Send friend request
  const sendRequest = async (toUserId) => {
    await fetch(`${API}/send-request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ toUserId }),
    });
    setSearch("");
    setResults([]);
    fetchConnections();
  };

  // Accept friend request
  const acceptRequest = async (fromUserId) => {
    await fetch(`${API}/accept-request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ fromUserId }),
    });
    fetchConnections();
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded shadow">
      <div className="mb-6 relative">
        <input
          type="text"
          className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-200"
          placeholder="Search friends by email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {/* Suggestion Dropdown */}
        {search && (
          <div className="absolute left-0 right-0 mt-1 bg-white border border-green-200 rounded shadow z-20 divide-y">
            {searching ? (
              <div className="px-4 py-2 text-gray-500">Searching...</div>
            ) : searchError ? (
              <div className="px-4 py-2 text-red-500">{searchError}</div>
            ) : results.length === 0 ? (
              <div className="px-4 py-2 text-gray-500">No users found</div>
            ) : (
              results.map(u => (
                <div key={u._id} className="flex items-center justify-between px-4 py-2 hover:bg-green-50">
                  <div>
                    <div className="font-semibold text-gray-800">{u.name}</div>
                    <div className="text-sm text-gray-500">{u.email}</div>
                  </div>
                  <button
                    className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                    onClick={() => sendRequest(u._id)}
                  >
                    Add Friend
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      <div className="flex mb-4 gap-4">
        <button
          className={`px-4 py-2 rounded ${tab === "friends" ? "bg-green-500 text-white" : "bg-green-100 text-green-700"}`}
          onClick={() => setTab("friends")}
        >
          My Friends
        </button>
        <button
          className={`px-4 py-2 rounded ${tab === "connections" ? "bg-green-500 text-white" : "bg-green-100 text-green-700"}`}
          onClick={() => setTab("connections")}
        >
          New Connection
        </button>
        <button
          className={`px-4 py-2 rounded ${tab === "sent" ? "bg-green-500 text-white" : "bg-green-100 text-green-700"}`}
          onClick={() => setTab("sent")}
        >
          Sent Requests
        </button>
      </div>
      {loading ? (
        <div className="text-center text-gray-500">Loading...</div>
      ) : tab === "friends" ? (
        <div>
          {connections.friends.length === 0 ? (
            <div className="text-gray-500">No friends yet.</div>
          ) : (
            <ul>
              {connections.friends.map(f => (
                <li key={f._id} className="mb-3 p-3 bg-green-50 rounded">
                  <div className="font-semibold text-gray-800">{f.name}</div>
                  <div className="text-sm text-gray-500">{f.email}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : tab === "connections" ? (
        <div>
          {connections.receivedRequests.length === 0 ? (
            <div className="text-gray-500">No new connection requests.</div>
          ) : (
            <ul>
              {connections.receivedRequests.map(r => (
                <li key={r._id} className="mb-3 p-3 bg-green-50 rounded flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-gray-800">{r.name}</div>
                    <div className="text-sm text-gray-500">{r.email}</div>
                  </div>
                  <button
                    className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                    onClick={() => acceptRequest(r._id)}
                  >
                    Accept
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div>
          {connections.sentRequests.length === 0 ? (
            <div className="text-gray-500">No sent requests.</div>
          ) : (
            <ul>
              {connections.sentRequests.map(s => (
                <li key={s._id} className="mb-3 p-3 bg-green-50 rounded">
                  <div className="font-semibold text-gray-800">{s.name}</div>
                  <div className="text-sm text-gray-500">{s.email}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard; 