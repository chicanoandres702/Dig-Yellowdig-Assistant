import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import extBridge from './ext-bridge';

const ExtBridgeContext = createContext(null);

export function ExtBridgeProvider({ children }) {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const unsub = extBridge.onMessage((msg, sender, sendResponse) => {
      try {
        setMessages(prev => [...prev, { msg, ts: Date.now() }]);
      } catch (e) {}
    });
    return () => { try { unsub && unsub(); } catch (e) {} };
  }, []);

  const value = useMemo(() => ({ send: extBridge.send, isActive: extBridge.isActive, messages }), [messages]);
  return (
    <ExtBridgeContext.Provider value={value}>{children}</ExtBridgeContext.Provider>
  );
}

export function useExtBridge() {
  const ctx = useContext(ExtBridgeContext);
  if (!ctx) throw new Error('useExtBridge must be used within ExtBridgeProvider');
  return ctx;
}
