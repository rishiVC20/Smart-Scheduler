import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import heroImg from "../assets/hero-user-coding.jpg";

const Login = ({ onLogin }) => {
  const [form, setForm] = useState({ email: "", password: "" });
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Replace with your backend API endpoint
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Login successful! Redirecting to dashboard...");
        if (onLogin) {
          onLogin(data);
        }
      } else {
        toast.error(data.message || "Login failed");
      }
    } catch (err) {
      toast.error("Server error");
    }
  };

  return (
    <div className="flex flex-col md:flex-row items-stretch justify-center min-h-[80vh] bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="md:w-[45vw] w-full h-[350px] md:h-auto flex-shrink-0 flex items-stretch">
        <img
          src={heroImg}
          alt="Smart Scheduler illustration"
          className="w-full h-full object-cover md:rounded-none rounded-b-xl shadow-lg border-0"
          style={{ minHeight: 350, maxHeight: '100vh' }}
        />
      </div>
      <div className="md:w-[55vw] w-full flex flex-col items-center justify-center px-6 py-10 md:py-0">
        <ToastContainer />
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h2 className="text-2xl font-bold mb-6 text-blue-700">Login</h2>
          <div className="mb-4">
            <label className="block mb-1 font-medium">Email</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} required className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
          <div className="mb-6">
            <label className="block mb-1 font-medium">Password</label>
            <input type="password" name="password" value={form.password} onChange={handleChange} required className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 transition">Login</button>
        </form>
      </div>
    </div>
  );
};

export default Login; 