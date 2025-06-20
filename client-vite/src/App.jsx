import React, { useState, useEffect } from "react";
import { Routes, Route, Link, useNavigate } from "react-router-dom";
import Register from "./components/Register";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";

// Placeholder components for new routes
function MyFriends() { return <div className="p-8">My Friends (Coming Soon)</div>; }
function NewConnection() { return <div className="p-8">New Connection (Coming Soon)</div>; }
function Calendar() { return <div className="p-8">Calendar (Coming Soon)</div>; }
function Meets() { return <div className="p-8">Meets (Coming Soon)</div>; }

const API = "/api";
function getToken() {
  const user = JSON.parse(localStorage.getItem("user"));
  return user?.token || localStorage.getItem("token");
}

function Navbar({ user, onLogout, connections, meetsCount }) {
  const [dropdown, setDropdown] = React.useState(false);
  const initial = user?.name ? user.name[0].toUpperCase() : "";
  const newRequestCount = connections?.receivedRequests?.length || 0;
  return (
    <nav className="flex items-center justify-between px-8 py-4 bg-green-100 shadow-md relative">
      <Link to="/" className="text-2xl font-extrabold text-blue-700 font-serif tracking-wide hover:underline">Smart Scheduler</Link>
      {user ? (
        <div className="flex items-center gap-8">
          <Link to="/dashboard" className="text-blue-600 font-medium hover:text-blue-800 transition">Dashboard</Link>
          <Link to="/friends" className="text-blue-600 font-medium hover:text-blue-800 transition">My Friends</Link>
          <Link to="/new-connection" className="text-blue-600 font-medium hover:text-blue-800 transition">New Connection</Link>
          <Link to="/sent-requests" className="text-blue-600 font-medium hover:text-blue-800 transition">Sent Requests</Link>
          <Link to="/search-friends" className="text-blue-600 font-medium hover:text-blue-800 transition">Search Friends</Link>
          <Link to="/calendar" className="text-blue-600 font-medium hover:text-blue-800 transition">Calendar</Link>
          <Link to="/meets" className="text-blue-600 font-medium hover:text-blue-800 transition relative">
            Meets
            {meetsCount > 0 && (
              <span className="absolute -top-2 -right-4 min-w-[1.2rem] h-5 bg-red-500 text-white text-xs flex items-center justify-center rounded-full border-2 border-white px-1">{meetsCount}</span>
            )}
          </Link>
          <div className="relative">
            <button onClick={() => setDropdown((d) => !d)} className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-lg focus:outline-none relative">
              {initial}
              {newRequestCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[1.2rem] h-5 bg-red-500 text-white text-xs flex items-center justify-center rounded-full border-2 border-white px-1">{newRequestCount}</span>
              )}
            </button>
            {dropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-white border rounded shadow-lg z-10 p-2">
                <div className="px-4 py-2 border-b">
                  <div className="font-semibold text-gray-800">{user.name}</div>
                  <div className="text-sm text-gray-500">{user.email}</div>
                </div>
                <button onClick={onLogout} className="block w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100">Log out</button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-x-4">
          <Link to="/register" className="text-blue-600 font-medium hover:text-blue-800 transition">Register</Link>
          <Link to="/login" className="text-blue-600 font-medium hover:text-blue-800 transition">Login</Link>
        </div>
      )}
    </nav>
  );
}

function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] bg-gradient-to-br from-blue-50 to-purple-50">
      <h1 className="text-5xl font-extrabold text-blue-700 mb-4 mt-12 drop-shadow">SMART SCHEDULER</h1>
      <p className="text-lg text-gray-700 max-w-2xl text-center mb-8">
        Effortlessly coordinate meetings, manage your time, and connect with friends. Smart Scheduler helps you find the best time for everyone, send invites, and keep your schedule organized. Say goodbye to endless back-and-forths and let us handle your planning needs!
      </p>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem("user");
    return u ? JSON.parse(u) : null;
  });
  const [connections, setConnections] = useState({ friends: [], sentRequests: [], receivedRequests: [] });
  const [meetsCount, setMeetsCount] = useState(0);
  const navigate = useNavigate();

  // Fetch connections for navbar notification
  const fetchConnections = async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API}/connections`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      setConnections(data);
    } catch (err) {}
  };

  const fetchMeetsCount = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/meetings/notifications`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      setMeetsCount(data.count);
    } catch {}
  };

  useEffect(() => {
    if (user) {
      fetchConnections();
      fetchMeetsCount();
    }
    // Optionally, poll for new requests every 30s:
    // const interval = setInterval(fetchConnections, 30000);
    // return () => clearInterval(interval);
  }, [user]);

  const handleLogin = (userObj) => {
    setUser(userObj);
    localStorage.setItem("user", JSON.stringify(userObj));
    setTimeout(fetchConnections, 500); // fetch after login
  };
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("user");
    setConnections({ friends: [], sentRequests: [], receivedRequests: [] });
    navigate("/");
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <Navbar user={user} onLogout={handleLogout} connections={connections} meetsCount={meetsCount} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register onRegister={handleLogin} />} />
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="/dashboard" element={<DashboardHome connections={connections} onSchedule={async (friendIds, duration, title) => {
          await fetch(`/api/schedule-meeting`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${getToken()}`,
            },
            body: JSON.stringify({ friendIds, duration, title }),
          });
        }} />} />
        <Route path="/friends" element={<MyFriendsPage connections={connections} />} />
        <Route path="/new-connection" element={<NewConnectionPage connections={connections} onAccept={async (fromUserId) => {
          await fetch(`${API}/accept-request`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${getToken()}`,
            },
            body: JSON.stringify({ fromUserId }),
          });
          fetchConnections();
        }} />} />
        <Route path="/sent-requests" element={<SentRequestsPage connections={connections} />} />
        <Route path="/search-friends" element={<SearchFriendsPage />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/meets" element={<MeetsPage user={user} />} />
      </Routes>
    </div>
  );
}

// New components for each route
function MyFriendsPage({ connections }) {
  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4 text-blue-700">My Friends</h2>
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
  );
}

function NewConnectionPage({ connections, onAccept }) {
  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4 text-blue-700">New Connection Requests</h2>
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
                onClick={() => onAccept(r._id)}
              >
                Accept
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SentRequestsPage({ connections }) {
  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4 text-blue-700">Sent Requests</h2>
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
  );
}

function DashboardHome({ connections, onSchedule }) {
  const [showWidget, setShowWidget] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [duration, setDuration] = useState(30);
  const [title, setTitle] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleFriendToggle = (id) => {
    setSelectedFriends((prev) =>
      prev.includes(id) ? prev.filter((fid) => fid !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedFriends.length === 0) return;
    await onSchedule(selectedFriends, duration, title);
    setSuccessMsg("Meeting scheduled and friends notified!");
    setShowWidget(false);
    setSelectedFriends([]);
    setDuration(30);
    setTitle("");
    setTimeout(() => setSuccessMsg(""), 2000);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh]">
      <h1 className="text-4xl font-bold text-blue-700 mb-4">Welcome to Smart Scheduler!</h1>
      <p className="mb-8 text-gray-600">Use the navigation bar to manage your friends and connections.</p>
      <div className="w-full max-w-md">
        <button
          className="w-full bg-green-500 text-white py-3 rounded-lg font-semibold shadow hover:bg-green-600 transition mb-4"
          onClick={() => setShowWidget((v) => !v)}
        >
          Schedule Meeting (People)
        </button>
        {showWidget && (
          <form onSubmit={handleSubmit} className="bg-green-50 p-6 rounded shadow">
            <h2 className="text-xl font-bold mb-2 text-blue-700">Meeting Title</h2>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded mb-4 focus:outline-none focus:ring-2 focus:ring-green-200"
              placeholder="Enter meeting title..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
            <h2 className="text-xl font-bold mb-2 text-blue-700">Select Friends</h2>
            <div className="mb-4 max-h-40 overflow-y-auto">
              {connections.friends.length === 0 ? (
                <div className="text-gray-500">No friends to invite.</div>
              ) : (
                connections.friends.map(f => (
                  <label key={f._id} className="flex items-center mb-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mr-2 accent-green-500"
                      checked={selectedFriends.includes(f._id)}
                      onChange={() => handleFriendToggle(f._id)}
                    />
                    <span className="font-medium text-gray-800">{f.name}</span>
                    <span className="ml-2 text-sm text-gray-500">{f.email}</span>
                  </label>
                ))
              )}
            </div>
            <div className="mb-4">
              <label className="block mb-1 font-medium">Duration (minutes)</label>
              <input
                type="number"
                min={5}
                max={240}
                value={duration}
                onChange={e => setDuration(Number(e.target.value))}
                className="w-24 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-green-200"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 transition"
              disabled={selectedFriends.length === 0 || !title}
            >
              Send Meeting Invite
            </button>
          </form>
        )}
        {successMsg && <div className="mt-4 text-green-600 font-semibold text-center">{successMsg}</div>}
      </div>
    </div>
  );
}

function SearchFriendsPage() {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

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
        const res = await fetch(`/api/search-users?email=${encodeURIComponent(search)}`, {
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

  const sendRequest = async (toUserId) => {
    await fetch(`/api/send-request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ toUserId }),
    });
    setSearch("");
    setResults([]);
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4 text-blue-700">Search & Add Friends</h2>
      <div className="mb-6 relative">
        <input
          type="text"
          className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-200"
          placeholder="Search friends by email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
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
    </div>
  );
}

function MeetsPage({ user }) {
  const [meetings, setMeetings] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [timingInputs, setTimingInputs] = useState({}); // {meetingId: {start, end}}
  const [submitting, setSubmitting] = useState({}); // {meetingId: bool}
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMeetings();
    fetchPendingCount();
    // eslint-disable-next-line
  }, []);

  const fetchMeetings = async () => {
    const res = await fetch('/api/meetings', {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const data = await res.json();
    setMeetings(data);
  };

  const fetchPendingCount = async () => {
    const res = await fetch('/api/meetings/notifications', {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const data = await res.json();
    setPendingCount(data.count);
  };

  const handleTimingChange = (meetingId, field, value) => {
    setTimingInputs((prev) => ({
      ...prev,
      [meetingId]: { ...prev[meetingId], [field]: value },
    }));
  };

  const handleSubmitTiming = async (meetingId, duration) => {
    setSubmitting((prev) => ({ ...prev, [meetingId]: true }));
    setError("");
    const { start, end } = timingInputs[meetingId] || {};
    if (!start || !end) {
      setError("Please provide both start and end time.");
      setSubmitting((prev) => ({ ...prev, [meetingId]: false }));
      return;
    }
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (endDate - startDate < duration * 60 * 1000) {
      setError(`Duration must be at least ${duration} minutes.`);
      setSubmitting((prev) => ({ ...prev, [meetingId]: false }));
      return;
    }
    await fetch(`/api/meetings/${meetingId}/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ start: startDate, end: endDate }),
    });
    setTimingInputs((prev) => ({ ...prev, [meetingId]: { start: '', end: '' } }));
    setSubmitting((prev) => ({ ...prev, [meetingId]: false }));
    fetchMeetings();
    fetchPendingCount();
  };

  const isInvitee = (meeting) => meeting.invitees.some(i => String(i._id) === String(user._id));
  const isHost = (meeting) => String(meeting.host._id) === String(user._id);
  const getInviteeResponse = (meeting) => meeting.inviteeResponses.find(r => String(r.user._id) === String(user._id));

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4 text-blue-700">Meets</h2>
      {meetings.length === 0 ? (
        <div className="text-gray-500">No meetings yet.</div>
      ) : (
        meetings.map(meeting => (
          <div key={meeting._id} className="mb-6 p-4 border rounded bg-green-50">
            <div className="mb-2 font-semibold text-blue-700">
              <span className="block text-lg font-bold">{meeting.title || 'Meeting'}</span>
              {isHost(meeting)
                ? `You scheduled a meeting` 
                : `${meeting.host.name} scheduled a meeting`}
            </div>
            <div className="mb-1 text-gray-700">Duration: {meeting.duration} min</div>
            <div className="mb-1 text-gray-700">Invited: {meeting.invitees.map(i => i.name).join(', ')}</div>
            {/* Invitee timing section */}
            {isInvitee(meeting) && !isHost(meeting) && (
              <div className="mt-2">
                <div className="font-semibold mb-1">Your Timings</div>
                {getInviteeResponse(meeting) && getInviteeResponse(meeting).timings.length > 0 ? (
                  <ul className="mb-2">
                    {getInviteeResponse(meeting).timings.map((t, idx) => (
                      <li key={idx} className="text-sm text-gray-800 mb-1">
                        {new Date(t.start).toLocaleString()} - {new Date(t.end).toLocaleString()}
                      </li>
                    ))}
                  </ul>
                ) : <div className="text-gray-500 mb-2">No timings submitted yet.</div>}
                <form
                  className="flex flex-col gap-2"
                  onSubmit={e => {
                    e.preventDefault();
                    handleSubmitTiming(meeting._id, meeting.duration);
                  }}
                >
                  <div className="flex gap-2 items-center">
                    <input
                      type="datetime-local"
                      value={timingInputs[meeting._id]?.start || ''}
                      onChange={e => handleTimingChange(meeting._id, 'start', e.target.value)}
                      className="border rounded px-2 py-1"
                      disabled={submitting[meeting._id]}
                      required
                    />
                    <span>to</span>
                    <input
                      type="datetime-local"
                      value={timingInputs[meeting._id]?.end || ''}
                      onChange={e => handleTimingChange(meeting._id, 'end', e.target.value)}
                      className="border rounded px-2 py-1"
                      disabled={submitting[meeting._id]}
                      required
                    />
                    <button
                      type="submit"
                      className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                      disabled={submitting[meeting._id]}
                    >
                      Add
                    </button>
                  </div>
                  {error && <div className="text-red-500 text-sm">{error}</div>}
                </form>
              </div>
            )}
            {/* Host view: see all responses */}
            {isHost(meeting) && (
              <div className="mt-2">
                <div className="font-semibold mb-1">Invitee Timings</div>
                {meeting.inviteeResponses.length === 0 ? (
                  <div className="text-gray-500">No responses yet.</div>
                ) : (
                  meeting.inviteeResponses.map(resp => (
                    <div key={resp.user._id} className="mb-2">
                      <div className="font-semibold text-gray-800">{resp.user.name}</div>
                      <ul>
                        {resp.timings.map((t, idx) => (
                          <li key={idx} className="text-sm text-gray-800 mb-1">
                            {new Date(t.start).toLocaleString()} - {new Date(t.end).toLocaleString()}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

export default App;
