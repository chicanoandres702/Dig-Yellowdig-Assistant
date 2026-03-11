import React from 'react';
import { createRoot } from 'react-dom/client';
import { ExtBridgeProvider } from './core/ExtBridgeProvider';
import App from './ui/App';
import './core/styles/theme.css';

function Root() {
  return (
    <ExtBridgeProvider>
      <App />
    </ExtBridgeProvider>
  );
}

const el = document.getElementById('react-root');
if (!el) {
  const d = document.createElement('div');
  d.id = 'react-root';
  document.body.appendChild(d);
}

createRoot(document.getElementById('react-root')).render(<Root />);
