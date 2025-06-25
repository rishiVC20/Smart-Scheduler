import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate } from "react-router-dom";
import Register from "./components/Register";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./components/Home";
import MeetsPage from "./components/MeetsPage";
import Calendar from "./components/Calendar";
import SearchFriendsPage from "./components/SearchFriendsPage";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getToken } from "./utils/auth";

// --- Re-implementing original components directly for simplicity and correctness ---

const MyFriendsPage = ({ connections }) => (
  <div className="p-8">
    <h1 className="text-2xl font-bold mb-6">My Friends</h1>
    {connections.friends && connections.friends.length > 0 ? (
      <ul className="bg-white p-4 rounded-lg shadow-md">
        {connections.friends.map((friend) => (
          <li key={friend._id} className="flex items-center justify-between p-3 border-b last:border-b-0">
            <span className="font-medium">{friend.name}</span>
            <span className="text-gray-500">{friend.email}</span>
          </li>
        ))}
      </ul>
    ) : <p>You have no friends yet. Use the Search Friends tab to find people!</p>}
  </div>
);

const NewConnectionPage = ({ connections, onAccept }) => (
  <div className="p-8">
    <h1 className="text-2xl font-bold mb-6">New Connection Requests</h1>
    {connections.receivedRequests && connections.receivedRequests.length > 0 ? (
      <ul className="bg-white p-4 rounded-lg shadow-md">
        {connections.receivedRequests.map((request) => (
          <li key={request._id} className="flex items-center justify-between p-3 border-b last:border-b-0">
            <div>
              <span className="font-medium">{request.name}</span>
              <span className="text-gray-500 ml-4">{request.email}</span>
            </div>
            <button onClick={() => onAccept(request._id)} className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
              Accept
            </button>
          </li>
        ))}
      </ul>
    ) : <p>You have no new connection requests.</p>}
  </div>
);

const SentRequestsPage = ({ connections }) => (
  <div className="p-8">
    <h1 className="text-2xl font-bold mb-6">Sent Requests</h1>
    {connections.sentRequests && connections.sentRequests.length > 0 ? (
      <ul className="bg-white p-4 rounded-lg shadow-md">
        {connections.sentRequests.map((request) => (
          <li key={request._id} className="flex items-center justify-between p-3 border-b last:border-b-0">
            <div>
              <span className="font-medium">{request.name}</span>
              <span className="text-gray-500 ml-4">{request.email}</span>
            </div>
            <span className="text-yellow-500 font-semibold">Pending</span>
          </li>
        ))}
      </ul>
    ) : <p>You have not sent any connection requests.</p>}
  </div>
);


// --- Main App Logic ---

function ProtectedRoute({ user, children }) {
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

const API = import.meta.env.VITE_API_URL;

function AppContent() {
  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem("user");
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  });

  const [connections, setConnections] = useState({ friends: [], sentRequests: [], receivedRequests: [] });
  const navigate = useNavigate();

  const fetchConnections = async () => {
    if (!user) return;
    try {
      const token = getToken();
      if(!token) return;
      const res = await fetch(`${API}/connections`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch connections');
      const data = await res.json();
      setConnections(data);
    } catch (err) {
      console.error(err);
      toast.error(err.message);
    }
  };

  useEffect(() => {
    if (user) fetchConnections();
  }, [user]);

  const handleLogin = (userData) => {
    setUser(userData.user);
    localStorage.setItem("user", JSON.stringify(userData.user));
    localStorage.setItem("token", userData.token);
    navigate("/dashboard");
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setConnections({ friends: [], sentRequests: [], receivedRequests: [] });
    navigate("/login");
  };

  const handleAccept = async (fromUserId) => {
    try {
        const token = getToken();
        if(!token) return;
        const res = await fetch(`${API}/accept-request`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ fromUserId }),
        });
        if (!res.ok) throw new Error('Failed to accept request');
        toast.success("Friend request accepted!");
        fetchConnections(); // Refresh data
    } catch (err) {
        toast.error(err.message);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
        <ToastContainer />
        <Navbar user={user} onLogout={handleLogout} connections={connections} />
        <main className="flex-grow">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/register" element={<Register onRegister={handleLogin} />} />
              <Route path="/login" element={<Login onLogin={handleLogin} />} />
              
              {/* Protected Routes */}
              <Route path="/dashboard" element={<ProtectedRoute user={user}><Dashboard user={user} /></ProtectedRoute>} />
              <Route path="/friends" element={<ProtectedRoute user={user}><MyFriendsPage connections={connections} /></ProtectedRoute>} />
              <Route path="/new-connection" element={<ProtectedRoute user={user}><NewConnectionPage connections={connections} onAccept={handleAccept} /></ProtectedRoute>} />
              <Route path="/sent-requests" element={<ProtectedRoute user={user}><SentRequestsPage connections={connections} /></ProtectedRoute>} />
              <Route path="/search-friends" element={<ProtectedRoute user={user}><SearchFriendsPage /></ProtectedRoute>} />
              <Route path="/calendar" element={<ProtectedRoute user={user}><Calendar user={user} /></ProtectedRoute>} />
              <Route path="/meets" element={<ProtectedRoute user={user}><MeetsPage user={user} /></ProtectedRoute>} />
            </Routes>
        </main>
        <Footer />
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  )
}

export default App;