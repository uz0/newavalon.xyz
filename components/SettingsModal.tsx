/**
 * @file Renders a modal for application settings.
 */
import React, { useState, useEffect } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (url: string) => void;
}

/**
 * A modal that allows users to configure application settings, such as the
 * WebSocket server address.
 * @param {SettingsModalProps} props The properties for the component.
 * @returns {React.ReactElement | null} The rendered modal or null if not open.
 */
export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave }) => {
  const [serverUrl, setServerUrl] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Load the currently saved custom URL from localStorage when the modal opens.
      const savedUrl = localStorage.getItem('custom_ws_url') || '';
      setServerUrl(savedUrl);
    }
  }, [isOpen]);

  if (!isOpen) return null;
  
  const handleSave = () => {
    onSave(serverUrl);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-8 shadow-xl w-full max-w-xl">
        <h2 className="text-2xl font-bold mb-6">Settings</h2>
        
        <div className="space-y-4">
            <div>
                <label htmlFor="server-url" className="block text-sm font-medium text-gray-300 mb-1">
                    Server Address
                </label>
                <input
                    id="server-url"
                    type="text"
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                    placeholder="e.g., ws://localhost:8080 or wss://my-server.com"
                    className="w-full bg-gray-700 border border-gray-600 text-white font-mono rounded-lg p-2 focus:ring-indigo-500 focus:border-indigo-500"
                    onKeyUp={(e) => e.key === 'Enter' && handleSave()}
                />
                 <p className="text-xs text-gray-500 mt-1">
                    Enter the full WebSocket address for the server. Leave blank to use the default.
                </p>
            </div>
        </div>

        <div className="flex justify-end mt-8 space-x-3">
          <button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">
            Cancel
          </button>
           <button
                onClick={handleSave}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition-colors"
            >
                Save & Reconnect
            </button>
        </div>
      </div>
    </div>
  );
};