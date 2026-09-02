#!/bin/bash

# Create directories
mkdir -p src/api src/context src/components/Auth src/components/Common src/components/Layout src/components/Dashboard

# ---- main.jsx ----
cat > src/main.jsx << 'EOF'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
EOF

# ---- App.jsx ----
cat > src/App.jsx << 'EOF'
import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import ForgotPassword from './components/Auth/ForgotPassword';
import Dashboard from './components/Dashboard/Dashboard';
import Navbar from './components/Layout/Navbar';
import PINLock from './components/Common/PINLock';

function App() {
  const { token, loading } = useAuth();
  const [isPINVerified, setIsPINVerified] = useState(false);

  useEffect(() => {
    const pin = localStorage.getItem('web_pin');
    if (pin) {
      setIsPINVerified(false);
    } else {
      setIsPINVerified(true);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-2xl">Loading...</div>
      </div>
    );
  }

  if (localStorage.getItem('web_pin') && !isPINVerified) {
    return <PINLock onUnlock={() => setIsPINVerified(true)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <Toaster position="top-right" />
      {token && <Navbar />}
      <div className={token ? 'container mx-auto px-4 py-6' : ''}>
        <Routes>
          <Route path="/login" element={!token ? <Login /> : <Navigate to="/" />} />
          <Route path="/register" element={!token ? <Register /> : <Navigate to="/" />} />
          <Route path="/forgot-password" element={!token ? <ForgotPassword /> : <Navigate to="/" />} />
          <Route path="/" element={token ? <Dashboard /> : <Navigate to="/login" />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
EOF

# ---- index.css (already exists, but we'll overwrite) ----
cat > src/index.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;
EOF

# ---- api/client.js ----
cat > src/api/client.js << 'EOF'
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
EOF

# ---- context/AuthContext.jsx ----
cat > src/context/AuthContext.jsx << 'EOF'
import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../api/client';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      setToken(token);
      setUser(user);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      toast.success('Welcome back!');
      return true;
    } catch (error) {
      toast.error(error.response?.data?.error || 'Login failed');
      return false;
    }
  };

  const register = async (email, password, name) => {
    try {
      const res = await api.post('/auth/register', { email, password, name });
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      setToken(token);
      setUser(user);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      toast.success('Account created!');
      return true;
    } catch (error) {
      toast.error(error.response?.data?.error || 'Registration failed');
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete api.defaults.headers.common['Authorization'];
    toast.success('Logged out');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
EOF

# ---- context/ThemeContext.jsx ----
cat > src/context/ThemeContext.jsx << 'EOF'
import React, { createContext, useState, useEffect, useContext } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const toggleTheme = () => setDarkMode(!darkMode);

  return (
    <ThemeContext.Provider value={{ darkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
EOF

# ---- components/Auth/Login.jsx ----
cat > src/components/Auth/Login.jsx << 'EOF'
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../Common/ThemeToggle';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await login(email, password);
    if (success) navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <h2 className="text-3xl font-bold text-center text-gray-800 dark:text-white mb-6">Expense Tracker</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 dark:text-gray-300 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition">Login</button>
        </form>
        <div className="mt-4 text-center">
          <Link to="/forgot-password" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Forgot password?</Link>
        </div>
        <p className="mt-4 text-center text-gray-600 dark:text-gray-400">
          Don't have an account? <Link to="/register" className="text-blue-600 dark:text-blue-400 hover:underline">Register</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
EOF

# ---- components/Auth/Register.jsx ----
cat > src/components/Auth/Register.jsx << 'EOF'
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../Common/ThemeToggle';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await register(email, password, name);
    if (success) navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <h2 className="text-3xl font-bold text-center text-gray-800 dark:text-white mb-6">Create Account</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-2">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 dark:text-gray-300 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg transition">Register</button>
        </form>
        <p className="mt-4 text-center text-gray-600 dark:text-gray-400">
          Already have an account? <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:underline">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
EOF

# ---- components/Auth/ForgotPassword.jsx ----
cat > src/components/Auth/ForgotPassword.jsx << 'EOF'
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import toast from 'react-hot-toast';
import ThemeToggle from '../Common/ThemeToggle';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
      toast.success('Reset link sent to your email');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to send reset email');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-6">Reset Password</h2>
        {sent ? (
          <p className="text-center text-green-600 dark:text-green-400">Check your email for the reset link.</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 dark:text-gray-300 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition">Send Reset Link</button>
          </form>
        )}
        <p className="mt-4 text-center text-gray-600 dark:text-gray-400">
          <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:underline">Back to Login</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
EOF

# ---- components/Common/ThemeToggle.jsx ----
cat > src/components/Common/ThemeToggle.jsx << 'EOF'
import React from 'react';
import { useTheme } from '../../context/ThemeContext';

const ThemeToggle = () => {
  const { darkMode, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
      aria-label="Toggle theme"
    >
      {darkMode ? '☀️' : '🌙'}
    </button>
  );
};

export default ThemeToggle;
EOF

# ---- components/Common/PINLock.jsx ----
cat > src/components/Common/PINLock.jsx << 'EOF'
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import ThemeToggle from './ThemeToggle';

const PINLock = ({ onUnlock }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const savedPin = localStorage.getItem('web_pin');
    if (pin === savedPin) {
      onUnlock();
    } else {
      setError('Incorrect PIN');
      toast.error('Incorrect PIN');
      setPin('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>
      <div className="max-w-sm w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-6">Enter PIN</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            maxLength="6"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            className="w-full px-4 py-3 text-center text-2xl border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="••••••"
            autoFocus
          />
          {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
          <button type="submit" className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition">Unlock</button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">PIN is stored locally on this device.</p>
      </div>
    </div>
  );
};

export default PINLock;
EOF

# ---- components/Layout/Navbar.jsx ----
cat > src/components/Layout/Navbar.jsx << 'EOF'
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../Common/ThemeToggle';
import { Menu } from '@headlessui/react';
import { UserCircleIcon } from '@heroicons/react/24/outline';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = [
    { name: 'Dashboard', path: '/' },
    // We'll add Expenses, Budgets, Categories later
  ];

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="text-xl font-bold text-blue-600 dark:text-blue-400">💰 Expense Tracker</Link>
          <div className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
              <Link key={link.path} to={link.path} className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition">
                {link.name}
              </Link>
            ))}
          </div>
          <div className="flex items-center space-x-3">
            <ThemeToggle />
            <Menu as="div" className="relative">
              <Menu.Button className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 transition">
                <UserCircleIcon className="h-8 w-8" />
                <span className="hidden sm:inline">{user?.name || 'User'}</span>
              </Menu.Button>
              <Menu.Items className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border dark:border-gray-700 py-1">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={handleLogout}
                      className={`${active ? 'bg-gray-100 dark:bg-gray-700' : ''} block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300`}
                    >
                      Logout
                    </button>
                  )}
                </Menu.Item>
              </Menu.Items>
            </Menu>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
EOF

# ---- components/Dashboard/Dashboard.jsx ----
cat > src/components/Dashboard/Dashboard.jsx << 'EOF'
import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import ExpenseChart from './ExpenseChart';
import TrendChart from './TrendChart';
import TopCategories from './TopCategories';
import BudgetProgress from './BudgetProgress';

const Dashboard = () => {
  const [expenses, setExpenses] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('this-month');

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    try {
      const now = new Date();
      let startDate = new Date();
      if (filter === 'this-week') {
        const day = now.getDay();
        startDate.setDate(now.getDate() - day);
        startDate.setHours(0,0,0,0);
      } else if (filter === 'this-month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (filter === 'last-month') {
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      }
      const endDate = new Date();
      
      const [expRes, budRes] = await Promise.all([
        api.get('/expenses', { params: { startDate: startDate.toISOString(), endDate: endDate.toISOString() } }),
        api.get('/budgets'),
      ]);
      setExpenses(expRes.data);
      setBudgets(budRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-10">Loading dashboard...</div>;

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Dashboard</h1>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-1 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none"
        >
          <option value="this-week">This Week</option>
          <option value="this-month">This Month</option>
          <option value="last-month">Last Month</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Spent</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-white">₹{totalSpent.toFixed(2)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500 dark:text-gray-400">Transactions</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-white">{expenses.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500 dark:text-gray-400">Categories Used</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-white">
            {new Set(expenses.map(e => e.categoryId)).size}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExpenseChart expenses={expenses} />
        <TrendChart expenses={expenses} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopCategories expenses={expenses} />
        <BudgetProgress expenses={expenses} budgets={budgets} />
      </div>
    </div>
  );
};

export default Dashboard;
EOF

# ---- components/Dashboard/ExpenseChart.jsx ----
cat > src/components/Dashboard/ExpenseChart.jsx << 'EOF'
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD', '#D4A5A5', '#9B59B6', '#E67E22', '#2ECC71', '#95A5A6'];

const ExpenseChart = ({ expenses }) => {
  const categoryMap = {};
  expenses.forEach(exp => {
    const catName = exp.category?.name || 'Uncategorized';
    categoryMap[catName] = (categoryMap[catName] || 0) + exp.amount;
  });

  const data = Object.keys(categoryMap).map((name, index) => ({
    name,
    value: categoryMap[name],
    color: COLORS[index % COLORS.length],
  }));

  if (data.length === 0) return <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow text-center text-gray-500">No data</div>;

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Expenses by Category</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
            {data.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ExpenseChart;
EOF

# ---- components/Dashboard/TrendChart.jsx ----
cat > src/components/Dashboard/TrendChart.jsx << 'EOF'
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const TrendChart = ({ expenses }) => {
  const days = {};
  expenses.forEach(exp => {
    const date = new Date(exp.date).toISOString().split('T')[0];
    days[date] = (days[date] || 0) + exp.amount;
  });

  const data = Object.keys(days).sort().map(date => ({ date, amount: days[date] }));

  if (data.length === 0) return <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow text-center text-gray-500">No trend data</div>;

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Spending Trend</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="amount" stroke="#8884d8" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TrendChart;
EOF

# ---- components/Dashboard/TopCategories.jsx ----
cat > src/components/Dashboard/TopCategories.jsx << 'EOF'
import React from 'react';

const TopCategories = ({ expenses }) => {
  const catMap = {};
  expenses.forEach(exp => {
    const name = exp.category?.name || 'Uncategorized';
    catMap[name] = (catMap[name] || 0) + exp.amount;
  });

  const sorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  if (sorted.length === 0) return <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow text-center text-gray-500">No data</div>;

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Top Spending Categories</h3>
      <ul className="space-y-2">
        {sorted.map(([name, amount], idx) => (
          <li key={name} className="flex justify-between items-center border-b dark:border-gray-700 pb-1">
            <span className="text-gray-700 dark:text-gray-300">{idx+1}. {name}</span>
            <span className="font-semibold text-gray-800 dark:text-white">₹{amount.toFixed(2)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TopCategories;
EOF

# ---- components/Dashboard/BudgetProgress.jsx ----
cat > src/components/Dashboard/BudgetProgress.jsx << 'EOF'
import React from 'react';

const BudgetProgress = ({ expenses, budgets }) => {
  const spentMap = {};
  expenses.forEach(exp => {
    const catId = exp.categoryId;
    spentMap[catId] = (spentMap[catId] || 0) + exp.amount;
  });

  const budgetData = budgets
    .filter(b => b.category)
    .map(b => {
      const spent = spentMap[b.categoryId] || 0;
      const percentage = b.amount > 0 ? Math.min((spent / b.amount) * 100, 100) : 0;
      return { ...b, spent, percentage };
    });

  if (budgetData.length === 0) return <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow text-center text-gray-500">No budgets set</div>;

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Budget Progress</h3>
      <div className="space-y-3">
        {budgetData.map(b => (
          <div key={b.id}>
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>{b.category.name}</span>
              <span>₹{b.spent.toFixed(2)} / ₹{b.amount.toFixed(2)}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full ${b.percentage > 90 ? 'bg-red-500' : b.percentage > 70 ? 'bg-yellow-400' : 'bg-green-500'}`}
                style={{ width: `${b.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BudgetProgress;
EOF

echo "✅ All frontend files created successfully!"