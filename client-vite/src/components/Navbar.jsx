import React from 'react';
import { Link } from 'react-router-dom';

function Navbar({ user, onLogout, connections, meetsCount }) {
  const [dropdown, setDropdown] = React.useState(false);
  const [mobileMenu, setMobileMenu] = React.useState(false);
  const initial = user?.name ? user.name[0].toUpperCase() : "";
  const newRequestCount = connections?.receivedRequests?.length || 0;

  const scrollToHowItWorks = () => {
    const element = document.getElementById('how-it-works');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav className="flex flex-wrap items-center justify-between px-4 sm:px-8 py-4 bg-green-700 shadow-md relative">
      <Link to="/" className="text-2xl font-extrabold text-white font-serif tracking-wide hover:underline">Smart Scheduler</Link>
      <button className="sm:hidden ml-auto text-white focus:outline-none" onClick={() => setMobileMenu(m => !m)}>
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
      </button>
      <div className={`w-full sm:w-auto ${mobileMenu ? "block" : "hidden"} sm:flex sm:items-center sm:gap-8 mt-4 sm:mt-0`}> 
        {user ? (
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
            <Link to="/dashboard" className="text-white font-medium hover:text-green-200 transition">Dashboard</Link>
            <Link to="/friends" className="text-white font-medium hover:text-green-200 transition">My Friends</Link>
            <Link to="/new-connection" className="text-white font-medium hover:text-green-200 transition relative">
              New Connection
              {newRequestCount > 0 && (
                <span className="absolute -top-2 -right-4 min-w-[1.2rem] h-5 bg-red-500 text-white text-xs flex items-center justify-center rounded-full border-2 border-white px-1">{newRequestCount}</span>
              )}
            </Link>
            <Link to="/sent-requests" className="text-white font-medium hover:text-green-200 transition">Sent Requests</Link>
            <Link to="/search-friends" className="text-white font-medium hover:text-green-200 transition">Search Friends</Link>
            <Link to="/calendar" className="text-white font-medium hover:text-green-200 transition">Calendar</Link>
            <Link to="/meets" className="text-white font-medium hover:text-green-200 transition relative">
              Meets
              {meetsCount > 0 && (
                <span className="absolute -top-2 -right-4 min-w-[1.2rem] h-5 bg-red-500 text-white text-xs flex items-center justify-center rounded-full border-2 border-white px-1">{meetsCount}</span>
              )}
            </Link>
            <div className="relative">
              <button onClick={() => setDropdown((d) => !d)} className="w-10 h-10 rounded-full bg-white text-green-700 font-bold flex items-center justify-center text-lg focus:outline-none relative">
                {initial}
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
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-0 sm:space-x-4">
            <button 
              onClick={scrollToHowItWorks}
              className="text-white font-medium hover:text-green-200 transition"
            >
              How It Works
            </button>
            <Link to="/register" className="text-white font-medium hover:text-green-200 transition">Register</Link>
            <Link to="/login" className="text-white font-medium hover:text-green-200 transition">Login</Link>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar; 