import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="bottom-center"
      toastOptions={{
        duration: 3500,
        style: {
          background: '#1c201c',
          color: '#e8ede8',
          border: '1px solid #2a2f2a',
          borderRadius: '8px',
          fontFamily: "'Noto Sans Hebrew', sans-serif",
          fontSize: '0.88rem',
          direction: 'rtl',
          padding: '12px 16px',
        },
        success: {
          iconTheme: { primary: '#4eff7c', secondary: '#040f09' },
        },
        error: {
          iconTheme: { primary: '#ff4e4e', secondary: '#1c201c' },
        },
      }}
    />
  </React.StrictMode>
);
