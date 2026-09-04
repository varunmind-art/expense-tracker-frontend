import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import toast from 'react-hot-toast';

const GmailIntegration = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    checkGmailStatus();
  }, []);

  const checkGmailStatus = async () => {
    try {
      const res = await api.get('/auth/gmail/status');
      setIsConnected(res.data.connected);
    } catch (error) {
      setIsConnected(false);
    }
  };

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/auth/gmail');
      const { authUrl } = res.data;

      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      const popup = window.open(
        authUrl,
        'gmail-auth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      const pollTimer = setInterval(() => {
        if (popup.closed) {
          clearInterval(pollTimer);
          checkGmailStatus();
          setIsLoading(false);
          toast.success('Gmail connected successfully!');
        }
      }, 1000);
    } catch (error) {
      toast.error('Failed to initiate Gmail connection.');
      setIsLoading(false);
    }
  };

  // ✅ New function to manually trigger sync
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await api.post('/gmail/sync');
      toast.success(res.data.message || 'Sync completed!');
      // Optional: refresh the page or check expenses
    } catch (error) {
      toast.error(error.response?.data?.error || 'Sync failed.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
        Gmail Integration
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Connect your Gmail account to automatically import receipts and create expenses.
      </p>
      {isConnected ? (
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
            <span>✅</span>
            <span>Gmail is connected</span>
          </div>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
          >
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Auto-sync runs every 6 hours.
          </p>
        </div>
      ) : (
        <button
          onClick={handleConnect}
          disabled={isLoading}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition disabled:opacity-50"
        >
          {isLoading ? 'Connecting...' : 'Connect Gmail'}
        </button>
      )}
    </div>
  );
};

export default GmailIntegration;