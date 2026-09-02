import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import ForgotPassword from './components/Auth/ForgotPassword';
import Dashboard from './components/Dashboard/Dashboard';
import ExpenseList from './components/Expenses/ExpenseList';
import BudgetManager from './components/Budgets/BudgetManager';
import CategoryManager from './components/Categories/CategoryManager';
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
          <Route path="/expenses" element={token ? <ExpenseList /> : <Navigate to="/login" />} />
          <Route path="/budgets" element={token ? <BudgetManager /> : <Navigate to="/login" />} />
          <Route path="/categories" element={token ? <CategoryManager /> : <Navigate to="/login" />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;