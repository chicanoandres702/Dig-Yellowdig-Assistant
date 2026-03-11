import React, { useState, useCallback } from 'react';
import { useExtBridge } from '../core/ExtBridgeProvider';
import { ScanPane, VSPane, DraftsPane, KBPane, AgentPane, SettingsPane } from './Panes';

const PANES = [
  { key: 'scan', label: 'Scan', comp: ScanPane },
  { key: 'vs', label: 'VitalSource', comp: VSPane },
  { key: 'drafts', label: 'Drafts', comp: DraftsPane },
  { key: 'kb', label: 'KB', comp: KBPane },
  { key: 'agent', label: 'Agent', comp: AgentPane },
  { key: 'settings', label: 'Settings', comp: SettingsPane },
];

export default function App() {
  const { send } = useExtBridge();
  const [active, setActive] = useState('scan');
  const [toasts, setToasts] = useState([]);
  const [overlay, setOverlay] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);

  const showToast = useCallback((text, timeout = 2500) => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, text }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), timeout);
  }, []);

  const showOverlay = useCallback((text) => setOverlay(text), []);
  const hideOverlay = useCallback(() => setOverlay(null), []);

  const handleDraft = useCallback((post, type) => {
    setSelectedPost(post);
    setActive('drafts');
    // trigger existing DraftsPane listener
    setTimeout(() => document.dispatchEvent(new CustomEvent('do-draft')), 50);
    showToast('Creating draft…');
  }, [showToast]);

  const startAgent = async () => {
    showOverlay('Starting agent session…');
    try {
      await send('START_AGENT_SESSION', { prompt: 'Draft a 200-word reply to the selected post.' });
      showToast('Agent started');
    } catch (e) {
      showToast('Agent failed to start');
    } finally {
      hideOverlay();
    }
  };

  const ActivePane = PANES.find(p => p.key === active).comp;

  return (
    <div style={{ height: '100vh', display: 'flex', background: 'var(--bg-main, #020617)', color: 'var(--text-main, #fff)' }}>
      <aside style={{ width: 96, borderRight: '1px solid rgba(255,255,255,0.03)', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {PANES.map(p => (
          <button key={p.key} onClick={() => setActive(p.key)} style={{ padding: 10, borderRadius: 10, background: active === p.key ? 'rgba(139,92,246,0.12)' : 'transparent', color: active === p.key ? '#c4b5fd' : '#9fb2cc', border: 'none', cursor: 'pointer' }}>{p.label}</button>
        ))}

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={() => { document.dispatchEvent(new CustomEvent('do-scan')); showToast('Scanning page…'); }} style={{ padding: 10, borderRadius: 10 }}>Scan</button>
          <button onClick={() => { document.dispatchEvent(new CustomEvent('do-vs-next')); showToast('VS Next'); }} style={{ padding: 10, borderRadius: 10 }}>VS Next</button>
          <button onClick={() => { document.dispatchEvent(new CustomEvent('do-agent')); showToast('Agent (local)'); }} style={{ padding: 10, borderRadius: 10 }}>Agent</button>
          <button onClick={startAgent} style={{ padding: 10, borderRadius: 10 }}>Agent (extBridge)</button>
        </div>
      </aside>

      <main style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ maxWidth: 920, margin: '18px auto', background: 'transparent', borderRadius: 12, overflow: 'hidden' }}>
          <ActivePane showToast={showToast} showOverlay={showOverlay} hideOverlay={hideOverlay} onDraft={handleDraft} selectedPost={selectedPost} />
        </div>
      </main>

      {overlay && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'rgba(2,6,23,0.85)', padding: 18, borderRadius: 12, color: '#cbd5e1', boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }}>{overlay}</div>
        </div>
      )}

      <div style={{ position: 'fixed', right: 18, bottom: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.map(t => (
          <div key={t.id} style={{ background: 'rgba(15,23,42,0.9)', color: '#e6eefc', padding: '8px 12px', borderRadius: 10, boxShadow: '0 6px 30px rgba(0,0,0,0.6)', fontSize: 13 }}>{t.text}</div>
        ))}
      </div>
    </div>
  );
}
