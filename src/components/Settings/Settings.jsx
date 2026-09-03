import React from 'react';
import GmailIntegration from './GmailIntegration';

const Settings = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Settings</h1>
      <p className="text-gray-600 dark:text-gray-400">
        Manage your integrations and preferences.
      </p>

      <div className="grid grid-cols-1 gap-6">
        <GmailIntegration />
      </div>
    </div>
  );
};

export default Settings;