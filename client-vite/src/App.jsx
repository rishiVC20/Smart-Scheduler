import React from "react";
import { Routes, Route, Link } from "react-router-dom";
import Register from "./components/Register";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";

function Navbar() {
  return (
    <nav className="flex items-center justify-between px-8 py-4 bg-white shadow-md">
      <div className="text-2xl font-extrabold text-blue-700 font-serif tracking-wide">Smart Scheduler</div>
      <div className="space-x-4">
        <Link to="/register" className="text-blue-600 font-medium hover:text-blue-800 transition">Register</Link>
        <Link to="/login" className="text-blue-600 font-medium hover:text-blue-800 transition">Login</Link>
      </div>
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
  return (
    <div className="bg-gray-50 min-h-screen">
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </div>
  );
}

export default App;
