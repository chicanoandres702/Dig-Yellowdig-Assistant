import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, BookOpen, Edit3, Database, Zap, Settings, Play, ArrowRight, Check, RefreshCw, MousePointer2 } from 'lucide-react';
import Background from './components/Background';
import { ScanPane, VSPane, DraftsPane, KBPane, AgentPane, SettingsPane } from './Panes';

const TABS = [
  { id: 'scan', label: 'Scan', icon: Activity },
  { id: 'vs', label: 'VS Splitter', icon: BookOpen },
  { id: 'drafts', label: 'Drafts', icon: Edit3 },
  { id: 'kb', label: 'Knowledge', icon: Database },
  { id: 'agent', label: 'Agent', icon: Zap },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('scan');
  const [direction, setDirection] = useState(0);
  const [toastMsg, setToastMsg] = useState('');
  const [overlayMsg, setOverlayMsg] = useState('');
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [currentBucket, setCurrentBucket] = useState('CS 401 / Week 4');
  const [isChoosing, setIsChoosing] = useState(false);

  const activeIndex = TABS.findIndex(t => t.id === activeTab);

  useEffect(() => {
    if (!isChoosing) return;

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('#root')) return; // Don't highlight our own UI if it's an extension, but since it's a web app, we'll just highlight anything
      target.style.outline = '2px solid #5b8dee';
      target.style.backgroundColor = 'rgba(91, 141, 238, 0.1)';
      target.style.cursor = 'crosshair';
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      target.style.outline = '';
      target.style.backgroundColor = '';
      target.style.cursor = '';
    };

    const handleClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const target = e.target as HTMLElement;
      target.style.outline = '';
      target.style.backgroundColor = '';
      target.style.cursor = '';
      setIsChoosing(false);
      showToast('Element selected! Extracting images and text...');
      // Dispatch an event to handle the extraction logic
      document.dispatchEvent(new CustomEvent('do-extract-element', { detail: { element: target } }));
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);
    document.addEventListener('click', handleClick, { capture: true });

    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      document.removeEventListener('click', handleClick, { capture: true });
    };
  }, [isChoosing]);

  const handleTabChange = (id: string) => {
    const newIndex = TABS.findIndex(t => t.id === id);
    setDirection(newIndex > activeIndex ? 1 : -1);
    setActiveTab(id);
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
  };

  const showOverlay = (msg: string) => setOverlayMsg(msg);
  const hideOverlay = () => setOverlayMsg('');

  const handleDragEnd = (e: any, { offset }: any) => {
    if (activeIndex === -1) return;
    const swipe = offset.x;
    if (swipe < -50 && activeIndex < TABS.length - 1) {
      handleTabChange(TABS[activeIndex + 1].id);
    } else if (swipe > 50 && activeIndex > 0) {
      handleTabChange(TABS[activeIndex - 1].id);
    }
  };

  return (
    <>
      <Background />
      
      <AnimatePresence>
        {overlayMsg && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-[#050a16]/90 backdrop-blur-md flex flex-col items-center justify-center gap-4"
          >
            <div className="w-8 h-8 border-2 border-[#5b8dee]/20 border-t-[#5b8dee] rounded-full animate-spin" />
            <div className="font-mono text-xs font-medium tracking-widest text-[#5b8dee]">{overlayMsg}</div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className="fixed left-1/2 z-[300] bg-[#0f1e32] border border-white/10 rounded-xl px-5 py-3 text-xs font-semibold text-[#f0f6ff] shadow-2xl whitespace-nowrap"
            style={{ bottom: 'calc(var(--navtot) + 60px)' }}
          >
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 w-full h-full flex flex-col glass-panel overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px z-30 bg-gradient-to-r from-transparent via-[#5b8dee]/60 to-[#8b5cf6]/40" />

        <header className="shrink-0 px-4 pt-3 pb-2.5 flex items-center justify-between border-b border-white/5 bg-[#040914]/60 min-h-[54px]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#5b8dee]/10 border border-[#5b8dee]/40 flex items-center justify-center shadow-[0_0_14px_rgba(91,141,238,0.18)] shrink-0">
              <Zap size={16} className="text-[#5b8dee]" />
            </div>
            <div>
              <div className="text-[0.86rem] font-extrabold tracking-wider uppercase text-[#f0f6ff] leading-none">PagePilot</div>
              <div className="font-mono text-[0.54rem] text-[#4e6580] mt-0.5">Mission Control</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#10b981]/10 border border-[#10b981]/20">
              <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] shadow-[0_0_8px_#10b981] animate-pulse" />
              <span className="font-mono text-[0.6rem] font-medium tracking-widest text-[#10b981]">LIVE</span>
            </div>
            <button onClick={() => handleTabChange('settings')} className="w-11 h-11 rounded-lg bg-white/5 border border-white/5 text-[#4e6580] flex items-center justify-center active:bg-[#5b8dee]/10 active:text-[#5b8dee] transition-colors">
              <Settings size={16} />
            </button>
          </div>
        </header>

        <div className="shrink-0 px-4 py-2 bg-[#050c18] border-b border-white/5 flex items-center gap-2">
          <div className="text-[0.66rem] font-bold uppercase tracking-widest text-[#8ea5c4] shrink-0">Bucket:</div>
          <input 
            type="text" 
            value={currentBucket} 
            onChange={e => setCurrentBucket(e.target.value)}
            className="flex-1 bg-transparent border-none text-sm font-semibold text-[#f0f6ff] focus:outline-none"
          />
          <button onClick={() => showToast('AI checking bucket context...')} className="p-1.5 rounded-md hover:bg-white/5 text-[#5b8dee] transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>

        <div className="shrink-0 px-1 bg-[#040914]/40 border-b border-white/5 flex overflow-x-auto scrollbar-hide snap-x">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`shrink-0 px-3.5 min-h-[44px] font-sans text-[0.68rem] font-bold tracking-wide uppercase relative snap-start transition-colors ${activeTab === tab.id ? 'text-[#f0f6ff]' : 'text-[#4e6580]'}`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="tab-indicator"
                  className={`absolute bottom-0 left-[14%] w-[72%] h-[2.5px] rounded-t-sm ${tab.id === 'vs' ? 'bg-[#8b5cf6]' : tab.id === 'kb' ? 'bg-[#10b981]' : 'bg-[#5b8dee]'}`}
                />
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 relative overflow-hidden">
          <AnimatePresence initial={false} custom={direction}>
            <motion.div
              key={activeTab}
              custom={direction}
              initial={{ x: direction > 0 ? '100%' : '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: direction > 0 ? '-100%' : '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={1}
              onDragEnd={handleDragEnd}
              className="absolute inset-0 overflow-y-auto overflow-x-hidden pb-[140px]"
            >
              {activeTab === 'scan' && <ScanPane showToast={showToast} showOverlay={showOverlay} hideOverlay={hideOverlay} onDraft={(post: any, type: string) => { setSelectedPost({ ...post, draftType: type }); handleTabChange('drafts'); }} />}
              {activeTab === 'vs' && <VSPane showToast={showToast} />}
              {activeTab === 'drafts' && <DraftsPane showToast={showToast} showOverlay={showOverlay} hideOverlay={hideOverlay} selectedPost={selectedPost} />}
              {activeTab === 'kb' && <KBPane showToast={showToast} />}
              {activeTab === 'agent' && <AgentPane showToast={showToast} showOverlay={showOverlay} hideOverlay={hideOverlay} />}
              {activeTab === 'settings' && <SettingsPane showToast={showToast} />}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="absolute left-0 right-0 px-4 py-2.5 bg-gradient-to-t from-[#050c18]/95 to-transparent z-40 pointer-events-none" style={{ bottom: 'var(--navtot)' }}>
          <div className="pointer-events-auto">
            {activeTab === 'scan' && (
              <div className="flex gap-2">
                <button onClick={() => document.dispatchEvent(new CustomEvent('do-scan'))} className="btn-primary flex-1">
                  <Play size={15} fill="currentColor" /> Scan This Page
                </button>
                <button 
                  onClick={() => setIsChoosing(!isChoosing)} 
                  className={`w-14 h-[56px] rounded-2xl flex items-center justify-center transition-all ${isChoosing ? 'bg-[#5b8dee] text-white shadow-[0_0_15px_rgba(91,141,238,0.5)]' : 'bg-white/5 border border-white/10 text-[#8ea5c4] hover:bg-white/10'}`}
                >
                  <MousePointer2 size={20} />
                </button>
              </div>
            )}
            {activeTab === 'vs' && (
              <button onClick={() => document.dispatchEvent(new CustomEvent('do-vs-next'))} className="btn-vs" id="vs-cta-btn">
                <ArrowRight size={15} /> Next — Choose Format
              </button>
            )}
            {activeTab === 'drafts' && (
              <button onClick={() => document.dispatchEvent(new CustomEvent('do-draft'))} className="btn-primary">
                <Edit3 size={15} /> Create Draft
              </button>
            )}
            {activeTab === 'agent' && (
              <button onClick={() => document.dispatchEvent(new CustomEvent('do-agent'))} className="btn-primary">
                <Zap size={15} fill="currentColor" /> Initiate Agent
              </button>
            )}
            {activeTab === 'settings' && (
              <button onClick={() => showToast('Settings saved ✓')} className="btn-primary">
                <Check size={15} /> Save Settings
              </button>
            )}
          </div>
        </div>

        <nav className="absolute bottom-0 left-0 right-0 z-50 bg-[#060e1a]/95 backdrop-blur-xl border-t border-white/10 pb-[env(safe-area-inset-bottom,0px)] flex shadow-[0_-8px_32px_rgba(0,0,0,0.45)]">
          {TABS.slice(0, 5).map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className="flex-1 py-2 px-1 flex flex-col items-center gap-1 active:opacity-65 transition-opacity"
              >
                <div className="relative w-6 h-6 flex items-center justify-center">
                  <Icon size={20} className={`transition-all duration-300 ${isActive ? (tab.id === 'vs' ? 'text-[#a78bfa] scale-110' : 'text-[#5b8dee] scale-110') : 'text-[#2d4260]'}`} />
                  {isActive && (
                    <motion.div layoutId="nav-dot" className={`absolute -bottom-1.5 w-1 h-1 rounded-full ${tab.id === 'vs' ? 'bg-[#a78bfa] shadow-[0_0_6px_#a78bfa]' : 'bg-[#5b8dee] shadow-[0_0_6px_#5b8dee]'}`} />
                  )}
                </div>
                <span className={`font-sans text-[0.58rem] font-semibold tracking-wide transition-colors ${isActive ? (tab.id === 'vs' ? 'text-[#a78bfa]' : 'text-[#5b8dee]') : 'text-[#2d4260]'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
}
