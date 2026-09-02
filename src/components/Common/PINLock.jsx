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
