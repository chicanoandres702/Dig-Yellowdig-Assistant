import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Check, Download, Upload, X, Play, ArrowRight, Edit3, Database, Zap, Settings, RefreshCw, MousePointer2 } from 'lucide-react';

const POSTS = [
  { id: 0, title: 'Discussion: Ethical Dimensions of AI Bias', preview: 'A hiring algorithm trained on historical data perpetuates demographic bias across multiple hiring cycles, affecting entire communities over time. How should organizations respond?', src: 'Yellowdig · Week 4' },
  { id: 1, title: "Week 4 Reflection — Knowledge Frameworks", preview: "After reviewing the Bloom's taxonomy readings, I'm struck by how few assessments push beyond recall toward genuine synthesis and evaluation of complex ideas.", src: 'Yellowdig · Week 4' },
  { id: 2, title: 'Module 3 Case Study Submission', preview: 'This analysis examines stakeholder conflicts in a distributed systems context, drawing on frameworks from lecture 5 and supplementary readings on organizational behavior.', src: 'Yellowdig · Module 3' },
];

export function ScanPane({ showToast, showOverlay, hideOverlay, onDraft }) {
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    const handleScan = () => {
      if (scanned) {
        showToast('Already scanned — pull down to rescan');
        return;
      }
      showOverlay('Scanning page…');
      setTimeout(() => {
        hideOverlay();
        setScanned(true);
        showToast(`Found ${POSTS.length} posts — tap any to draft a reply`);
      }, 1500);
    };
    document.addEventListener('do-scan', handleScan);
    return () => document.removeEventListener('do-scan', handleScan);
  }, [scanned]);

  return (
    <div className="p-4 pt-0">
      <div className="sec-header relative">
        <div className="w-1.5 h-1.5 rounded-full bg-[#5b8dee]" /> 
        Discussion Posts
        <button onClick={() => { setScanned(false); setTimeout(() => document.dispatchEvent(new CustomEvent('do-scan')), 50); }} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8ea5c4] active:text-white p-1 transition-colors bg-[#050c18] pl-2">
          <RefreshCw size={14} />
        </button>
      </div>
      
      {!scanned ? (
        <div className="flex flex-col items-center p-8 text-center mt-4">
          <div className="w-16 h-16 rounded-2xl bg-[#5b8dee]/10 border border-[#5b8dee]/30 flex items-center justify-center text-2xl mb-4">🔍</div>
          <div className="text-sm font-bold text-[#f0f6ff] mb-1.5">No posts scanned yet</div>
          <div className="text-xs text-[#8ea5c4] leading-relaxed max-w-[260px]">Tap "Scan This Page" below to detect discussion posts, then tap any post to reply or create a draft.</div>
        </div>
      ) : (
        <div className="space-y-3 mt-2">
          {POSTS.map(p => (
            <div key={p.id} className="bg-gradient-to-b from-[#0d1929] to-[#0a1320] border border-white/10 rounded-2xl overflow-hidden shadow-lg shadow-black/20">
              <div className="p-4 pb-3">
                <div className="flex items-center gap-2 font-mono text-[0.6rem] font-medium text-[#5b8dee] mb-2.5 bg-[#5b8dee]/10 w-fit px-2 py-0.5 rounded-full border border-[#5b8dee]/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#5b8dee] shadow-[0_0_6px_#5b8dee]" /> {p.src}
                </div>
                <div className="text-[0.9rem] font-bold text-[#f0f6ff] leading-snug mb-2">{p.title}</div>
                <div className="text-[0.75rem] text-[#8ea5c4] leading-relaxed line-clamp-2">{p.preview}</div>
              </div>
              <div className="flex gap-2 p-3 pt-2 border-t border-white/5 bg-[#050a12]/50">
                <button onClick={() => onDraft(p, 'rubric')} className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-1.5 text-[0.65rem] font-bold text-[#8ea5c4] active:bg-white/10 active:text-white transition-all active:scale-95">
                  <Edit3 size={16} className="text-[#a78bfa]" /> Rubrics
                </button>
                <button onClick={() => showToast('Added to KB')} className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-1.5 text-[0.65rem] font-bold text-[#8ea5c4] active:bg-white/10 active:text-white transition-all active:scale-95">
                  <Database size={16} className="text-[#10b981]" /> Add to KB
                </button>
                <button onClick={() => onDraft(p, 'yd')} className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-1.5 text-[0.65rem] font-bold text-[#8ea5c4] active:bg-white/10 active:text-white transition-all active:scale-95">
                  <Zap size={16} className="text-[#5b8dee]" /> YD Reply
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function VSPane({ showToast }) {
  const [step, setStep] = useState(1);
  const [scope, setScope] = useState('full');
  const [format, setFormat] = useState('pdf');
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    const handleNext = () => {
      if (step === 1) {
        setStep(2);
        const btn = document.getElementById('vs-cta-btn');
        if (btn) {
          btn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg> Begin Extraction';
          btn.className = 'btn-primary !bg-gradient-to-br !from-red-600 !to-red-500 !shadow-red-500/30';
        }
      } else if (step === 2) {
        setStep(3);
        setIsExtracting(true);
        let p = 0;
        const int = setInterval(() => {
          p += 5;
          setProgress(p);
          if (p >= 100) {
            clearInterval(int);
            setIsExtracting(false);
            setIsDone(true);
            showToast('Extraction complete! 🎉');
            const btn = document.getElementById('vs-cta-btn');
            if (btn) btn.style.display = 'none';
          }
        }, 200);
      }
    };
    document.addEventListener('do-vs-next', handleNext);
    return () => document.removeEventListener('do-vs-next', handleNext);
  }, [step]);

  return (
    <div className="p-4 pt-4 relative">
      <div className="flex items-center justify-between mb-3">
        <div className="sec-header !mt-0 !mb-0 flex-1"><div className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]" /> VitalSource Splitter</div>
        <button onClick={() => { setStep(1); setIsDone(false); setProgress(0); setIsExtracting(false); showToast('Refreshed VS Splitter'); }} className="text-[#8ea5c4] active:text-white p-1.5 transition-colors bg-white/5 border border-white/10 rounded-lg hover:bg-white/10">
          <RefreshCw size={14} />
        </button>
      </div>
      <div className="bg-gradient-to-br from-[#0e1530] to-[#0a0e28] border border-[#8b5cf6] rounded-2xl p-4 relative overflow-hidden mb-4">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#8b5cf6] via-[#5b8dee] to-transparent" />
        <div className="flex items-center gap-1.5 font-mono text-[0.6rem] font-medium tracking-wider text-[#8b5cf6] mb-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6] shadow-[0_0_7px_#8b5cf6] animate-pulse" />
          VitalSource · Auto-Detected
        </div>
        <div className="text-base font-bold text-[#f0f6ff] leading-snug mb-3">Organizational Behavior, 18th Ed.</div>
        <div className="flex flex-wrap gap-1.5">
          {['Robbins & Judge', '848 pages', '18 chapters'].map(p => (
            <span key={p} className="font-mono text-[0.62rem] text-[#8ea5c4] bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">{p}</span>
          ))}
        </div>
      </div>

      <div className="flex mb-4 border border-white/5 rounded-lg overflow-hidden">
        {[1, 2, 3].map(s => (
          <div key={s} className={`flex-1 py-2.5 text-center border-r border-white/5 last:border-0 transition-colors ${step === s ? 'bg-[#8b5cf6]/10' : step > s ? 'bg-[#10b981]/10' : 'bg-black/20'}`}>
            <span className={`font-mono text-[0.62rem] font-bold block ${step === s ? 'text-[#a78bfa]' : step > s ? 'text-[#10b981]' : 'text-[#4e6580]'}`}>0{s}</span>
            <span className={`text-[0.58rem] font-bold block mt-0.5 ${step === s ? 'text-[#8ea5c4]' : step > s ? 'text-[#10b981]' : 'text-[#4e6580]'}`}>{s === 1 ? 'Scope' : s === 2 ? 'Format' : 'Extract'}</span>
          </div>
        ))}
      </div>

      {step === 1 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="sec-header"><div className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]" /> What to extract?</div>
          <div className="flex bg-black/30 border border-white/5 rounded-lg p-1 gap-1 mb-4">
            {['full', 'chapters', 'range'].map(s => (
              <button key={s} onClick={() => setScope(s)} className={`flex-1 h-10 rounded-md font-sans text-[0.7rem] font-semibold transition-colors ${scope === s ? 'bg-[#8b5cf6]/20 text-[#c4b5fd] shadow-[inset_0_0_0_1px_rgba(139,92,246,0.32)]' : 'text-[#4e6580] active:bg-white/5'}`}>
                {s === 'full' ? 'Full Book' : s === 'chapters' ? 'Chapters' : 'Page Range'}
              </button>
            ))}
          </div>

          {scope === 'full' && (
            <div className="text-[0.74rem] text-[#8ea5c4] leading-relaxed mb-4">
              All <strong className="text-[#f0f6ff]">848 pages</strong> across <strong className="text-[#f0f6ff]">18 chapters</strong> will be extracted.
            </div>
          )}
          {scope === 'chapters' && (
            <button onClick={() => setSheetOpen(true)} className="btn-secondary !text-[#a78bfa] !border-[#8b5cf6]/30 !bg-[#8b5cf6]/10 mb-4">
              Choose Chapters
            </button>
          )}

          <div className="flex bg-[#0d1929] border border-white/5 rounded-lg overflow-hidden mb-4">
            {[
              { l: 'Chapters', v: scope === 'full' ? '18' : '—' },
              { l: 'Pages', v: scope === 'full' ? '848' : '0' },
              { l: 'Size', v: scope === 'full' ? '~42mb' : '0mb' },
              { l: 'Time', v: scope === 'full' ? '~14m' : '0m' }
            ].map((s, i) => (
              <div key={i} className="flex-1 p-3 border-r border-white/5 last:border-0 flex flex-col gap-1">
                <div className="font-mono text-[0.54rem] text-[#4e6580]">{s.l}</div>
                <div className="font-mono text-[0.92rem] font-semibold text-[#f0f6ff]">{s.v}</div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {step === 2 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="sec-header"><div className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]" /> Output Format</div>
          <div className="flex gap-1.5 mb-4">
            {[
              { id: 'pdf', l: 'PDF', d: 'Single file' },
              { id: 'split', l: 'Split', d: 'Per chapter' },
              { id: 'cbz', l: 'CBZ', d: 'Comic format' },
              { id: 'png', l: 'PNG', d: 'Image pack' }
            ].map(f => (
              <button key={f.id} onClick={() => setFormat(f.id)} className={`flex-1 h-12 flex flex-col items-center justify-center gap-0.5 rounded-lg border font-mono text-[0.66rem] font-medium transition-colors ${format === f.id ? 'bg-[#ef4444]/10 border-[#ef4444]/30 text-[#f87171]' : 'bg-black/20 border-white/5 text-[#4e6580] active:bg-white/5'}`}>
                {f.l}
                <span className="text-[0.5rem] opacity-70">{f.d}</span>
              </button>
            ))}
          </div>
          <button onClick={() => {
            setStep(1);
            const btn = document.getElementById('vs-cta-btn');
            if (btn) {
              btn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg> Next — Choose Format';
              btn.className = 'btn-vs';
            }
          }} className="btn-secondary">← Back to Scope</button>
        </motion.div>
      )}

      {step === 3 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {!isDone ? (
            <div className="bg-[#080e1e]/80 border border-[#8b5cf6]/20 rounded-xl p-4 mb-4">
              <div className="flex justify-between items-baseline mb-3">
                <span className="text-[0.68rem] font-semibold text-[#8ea5c4] uppercase tracking-widest">Extracting Spine</span>
                <span className="font-mono text-[0.84rem] font-semibold text-[#f0f6ff]">{Math.round((progress/100)*848)} <small className="text-[0.64rem] text-[#4e6580] font-normal">/ 848</small></span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mb-4">
                <div className="h-full bg-gradient-to-r from-[#5b8dee] to-[#8b5cf6] shadow-[0_0_10px_rgba(91,141,238,0.4)] transition-all duration-200" style={{ width: `${progress}%` }} />
              </div>
              <div className="font-mono text-[0.64rem] leading-relaxed text-[#4e6580] h-20 overflow-y-auto">
                <div className="text-[#a78bfa]">[SPINE] Initializing…</div>
                {progress > 10 && <div>[SPINE] Reading spine root…</div>}
                {progress > 30 && <div className="text-[#a78bfa]">[CH 1] What Is Organizational Behavior?</div>}
                {progress > 60 && <div className="text-[#10b981]">[CH 1] Done</div>}
                {progress > 80 && <div className="text-[#a78bfa]">[CH 2] Diversity in Organizations</div>}
              </div>
            </div>
          ) : (
            <div className="bg-[#10b981]/10 border border-[#10b981]/20 rounded-2xl p-6 text-center mb-4">
              <div className="text-4xl mb-2">✓</div>
              <div className="text-[0.96rem] font-bold text-[#10b981] mb-1">Extraction Complete!</div>
              <div className="font-mono text-[0.66rem] text-[#8ea5c4] mb-4">848 pages · 42.3 MB</div>
              <button className="btn-primary !bg-gradient-to-br !from-[#059669] !to-[#10b981] !shadow-[#059669]/30 mb-2">
                <Download size={15} /> Download PDF
              </button>
              <button onClick={() => {
                setStep(1);
                setIsDone(false);
                setProgress(0);
                const btn = document.getElementById('vs-cta-btn');
                if (btn) {
                  btn.style.display = 'flex';
                  btn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg> Next — Choose Format';
                  btn.className = 'btn-vs';
                }
              }} className="btn-secondary">Start New Extraction</button>
            </div>
          )}
        </motion.div>
      )}

      <AnimatePresence>
        {sheetOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSheetOpen(false)} className="fixed inset-0 z-[100] bg-[#030610]/80 backdrop-blur-sm" />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed bottom-0 left-0 right-0 z-[101] bg-[#0c1826] rounded-t-3xl border border-white/10 border-b-0 max-h-[85vh] flex flex-col pb-[env(safe-area-inset-bottom,16px)] shadow-[0_-14px_50px_rgba(0,0,0,0.55)]">
              <div className="p-3 flex justify-center shrink-0"><div className="w-11 h-1 rounded-full bg-white/10" /></div>
              <div className="px-4 pb-3 flex justify-between items-center border-b border-white/5 shrink-0">
                <div className="text-[0.94rem] font-bold text-[#f0f6ff]">Select Chapters</div>
                <button onClick={() => setSheetOpen(false)} className="w-9 h-9 rounded-full bg-white/5 text-[#8ea5c4] flex items-center justify-center active:bg-white/10"><X size={18} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                <div className="text-center text-sm text-[#8ea5c4] py-10">Chapter list goes here...</div>
              </div>
              <div className="p-4 border-t border-white/5 shrink-0">
                <button onClick={() => setSheetOpen(false)} className="btn-vs">Confirm Selection</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export function DraftsPane({ showToast, showOverlay, hideOverlay, selectedPost }) {
  const [drafts, setDrafts] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('Formal Academic (PDF)');
  const [showQueries, setShowQueries] = useState(false);
  const [selectedBuckets, setSelectedBuckets] = useState(['CS 401 / Week 4']);
  const [refiningDraftId, setRefiningDraftId] = useState(null);
  const [viewingDraftId, setViewingDraftId] = useState(null);
  const [customRefine, setCustomRefine] = useState('');

  const toggleBucket = (bucket) => {
    setSelectedBuckets(prev => 
      prev.includes(bucket) ? prev.filter(b => b !== bucket) : [...prev, bucket]
    );
  };

  useEffect(() => {
    if (selectedPost) {
      setPrompt(`${selectedPost.title}\n\n${selectedPost.preview}`);
      setStyle(selectedPost.draftType === 'yd' ? 'Yellowdig Engagement' : 'Formal Academic (PDF)');
      setShowQueries(false);
    }
  }, [selectedPost]);

  useEffect(() => {
    const handleDraft = () => {
      showOverlay('Generating draft…');
      setTimeout(() => {
        hideOverlay();
        if (style === 'Formal Academic (PDF)') {
          setDrafts([{ 
            id: Date.now(), 
            title: 'Academic Paper Guidance', 
            type: 'Guidance Needed',
            content: 'To complete this academic paper based on the rubric, please provide:\n• Your main thesis statement or stance.\n• 2-3 key arguments you wish to cover.\n• Any specific case studies or personal experiences to include.\n\nUse the research queries below to gather more context.'
          }, ...drafts]);
          setShowQueries(true);
        } else {
          setDrafts([{ id: Date.now(), title: 'New Draft', type: 'Yellowdig Engagement' }, ...drafts]);
        }
        showToast('Draft created ✓');
      }, 1500);
    };
    document.addEventListener('do-draft', handleDraft);
    return () => document.removeEventListener('do-draft', handleDraft);
  }, [drafts, style]);

  return (
    <div className="p-4 pt-4">
      <div className="sec-header"><div className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]" /> Context Buckets</div>
      <div className="flex flex-wrap gap-2 mb-4">
        {['CS 401 / Week 4', 'Lecture W1–4', 'Case Studies', 'Policy Frameworks'].map(l => {
          const isSelected = selectedBuckets.includes(l);
          return (
            <button 
              key={l} 
              onClick={() => toggleBucket(l)}
              className={`text-[0.72rem] font-medium px-3.5 py-2 rounded-full border transition-colors ${isSelected ? 'bg-[#8b5cf6]/20 border-[#8b5cf6]/50 text-[#c4b5fd]' : 'bg-white/5 border-white/5 text-[#8ea5c4] hover:bg-white/10'}`}
            >
              {l}
            </button>
          );
        })}
      </div>

      <div className="sec-header"><div className="w-1.5 h-1.5 rounded-full bg-[#5b8dee]" /> Prompt</div>
      <textarea className="inp mb-3" rows={3} placeholder="Tap a post in Scan to auto-fill, or type a topic here…" id="draft-prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
      <div className="mb-4">
        <label className="block text-[0.66rem] font-bold uppercase tracking-widest text-[#8ea5c4] mb-1.5">Style</label>
        <select className="inp py-2.5" value={style} onChange={(e) => setStyle(e.target.value)}>
          <option value="Formal Academic (PDF)">Formal Academic (PDF)</option>
          <option value="Yellowdig Engagement">Yellowdig Engagement</option>
        </select>
      </div>

      <input type="hidden" name="avoidPangrams" value="true" />

      {showQueries && (
        <>
          <div className="sec-header"><div className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]" /> Research Queries</div>
          <div className="flex overflow-x-auto scrollbar-hide snap-x gap-2 pb-2 mb-4 -mx-4 px-4">
            {[
              "AI bias in recruitment case studies",
              "Demographic impacts of algorithmic hiring",
              "Ethical frameworks for AI in HR",
              "Mitigating bias in machine learning",
              "Google Scholar: AI hiring bias"
            ].map((q, i) => (
              <button key={i} onClick={() => { navigator.clipboard.writeText(q); showToast('Copied to clipboard!'); }} className="shrink-0 snap-start bg-[#0d1929] border border-white/5 rounded-xl p-3 w-[180px] text-left active:bg-white/5 transition-colors flex flex-col gap-2">
                <Search size={14} className="text-[#8b5cf6]" />
                <div className="text-[0.7rem] font-medium text-[#dde8f8] leading-snug">{q}</div>
              </button>
            ))}
          </div>
        </>
      )}

      <div className="sec-header"><div className="w-1.5 h-1.5 rounded-full bg-[#5b8dee]" /> Recent Drafts</div>
      {drafts.length === 0 ? (
        <div className="flex flex-col items-center p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#5b8dee]/10 border border-[#5b8dee]/30 flex items-center justify-center text-2xl mb-4">✏️</div>
          <div className="text-sm font-bold text-[#f0f6ff] mb-1.5">No drafts yet</div>
          <div className="text-xs text-[#8ea5c4] leading-relaxed max-w-[260px]">Pick a post from Scan and tap "Draft Reply" — or type a topic above and tap Create.</div>
        </div>
      ) : (
        <div className="space-y-2">
          {drafts.map(d => (
            <div key={d.id} className="bg-[#0d1929] border border-white/5 rounded-xl p-3.5">
              <div className="text-[0.82rem] font-bold text-[#f0f6ff] mb-1">{d.title}</div>
              <div className="flex justify-between items-center text-[0.7rem] text-[#8ea5c4] mb-3">
                <span>{d.type}</span>
                <span className="font-mono text-[0.6rem] font-medium px-2 py-0.5 rounded bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20">Ready</span>
              </div>
              {d.content && (
                <div className="text-[0.75rem] text-[#8ea5c4] mb-4 whitespace-pre-wrap leading-relaxed bg-white/5 p-3 rounded-lg border border-white/5">
                  {d.content}
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => setViewingDraftId(d.id)} className="flex-1 py-2 rounded-lg bg-white/5 text-[#8ea5c4] text-[0.66rem] font-semibold flex items-center justify-center gap-1.5 active:bg-white/10 transition-colors">
                  <Search size={12} /> View
                </button>
                <button onClick={() => setRefiningDraftId(d.id)} className="flex-1 py-2 rounded-lg bg-white/5 text-[#8ea5c4] text-[0.66rem] font-semibold flex items-center justify-center gap-1.5 active:bg-white/10 transition-colors">
                  <Edit3 size={12} /> Refine
                </button>
                <button onClick={() => showToast('Draft copied!')} className="flex-1 py-2 rounded-lg bg-[#5b8dee]/10 text-[#5b8dee] text-[0.66rem] font-semibold flex items-center justify-center gap-1.5 active:bg-[#5b8dee]/20 transition-colors">
                  <Check size={12} /> Use
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {refiningDraftId && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setRefiningDraftId(null)} className="fixed inset-0 z-[100] bg-[#030610]/80 backdrop-blur-sm" />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed bottom-0 left-0 right-0 z-[101] bg-[#0c1826] rounded-t-3xl border border-white/10 border-b-0 flex flex-col pb-[env(safe-area-inset-bottom,16px)] shadow-[0_-14px_50px_rgba(0,0,0,0.55)]">
              <div className="p-3 flex justify-center shrink-0"><div className="w-11 h-1 rounded-full bg-white/10" /></div>
              <div className="px-4 pb-3 flex justify-between items-center border-b border-white/5 shrink-0">
                <div className="text-[0.94rem] font-bold text-[#f0f6ff]">Refine Draft</div>
                <button onClick={() => setRefiningDraftId(null)} className="w-9 h-9 rounded-full bg-white/5 text-[#8ea5c4] flex items-center justify-center active:bg-white/10"><X size={18} /></button>
              </div>
              <div className="p-4 space-y-2">
                <button onClick={() => { setRefiningDraftId(null); showToast('Making draft shorter...'); }} className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-sm font-medium text-[#f0f6ff] active:bg-white/10 transition-colors">Make Shorter</button>
                <button onClick={() => { setRefiningDraftId(null); showToast('Making draft longer...'); }} className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-sm font-medium text-[#f0f6ff] active:bg-white/10 transition-colors">Make Longer</button>
                <button onClick={() => { setRefiningDraftId(null); showToast('Removing external sources...'); }} className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-sm font-medium text-[#f0f6ff] active:bg-white/10 transition-colors">No External Sources</button>
                
                <div className="mt-4 pt-4 border-t border-white/5">
                  <label className="block text-[0.66rem] font-bold uppercase tracking-widest text-[#8ea5c4] mb-1.5">Custom Prompt</label>
                  <div className="flex gap-2">
                    <input type="text" className="inp flex-1" placeholder="e.g. Make it sound more professional" value={customRefine} onChange={(e) => setCustomRefine(e.target.value)} />
                    <button onClick={() => { setRefiningDraftId(null); showToast('Applying custom refinement...'); setCustomRefine(''); }} className="btn-primary !w-auto !px-4"><Check size={16} /></button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
        
        {viewingDraftId && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewingDraftId(null)} className="fixed inset-0 z-[100] bg-[#030610]/80 backdrop-blur-sm" />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed bottom-0 left-0 right-0 z-[101] bg-[#0c1826] rounded-t-3xl border border-white/10 border-b-0 max-h-[85vh] flex flex-col pb-[env(safe-area-inset-bottom,16px)] shadow-[0_-14px_50px_rgba(0,0,0,0.55)]">
              <div className="p-3 flex justify-center shrink-0"><div className="w-11 h-1 rounded-full bg-white/10" /></div>
              <div className="px-4 pb-3 flex justify-between items-center border-b border-white/5 shrink-0">
                <div className="text-[0.94rem] font-bold text-[#f0f6ff]">View Draft</div>
                <button onClick={() => setViewingDraftId(null)} className="w-9 h-9 rounded-full bg-white/5 text-[#8ea5c4] flex items-center justify-center active:bg-white/10"><X size={18} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="text-sm text-[#f0f6ff] whitespace-pre-wrap leading-relaxed">
                  {drafts.find(d => d.id === viewingDraftId)?.content || 'No content available.'}
                </div>
              </div>
              <div className="p-4 border-t border-white/5 shrink-0">
                <button onClick={() => { setViewingDraftId(null); showToast('Draft copied!'); }} className="btn-primary w-full"><Check size={16} /> Use Draft</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export function KBPane({ showToast }) {
  const [items, setItems] = useState([
    { id: 1, title: 'CS 401 Syllabus.pdf', bucket: 'CS 401 / Week 4', size: '2.4 MB' },
    { id: 2, title: 'Week 4 Reading Notes.txt', bucket: 'CS 401 / Week 4', size: '12 KB' },
    { id: 3, title: 'Module 3 Case Study.pdf', bucket: 'Case Studies', size: '1.1 MB' },
  ]);

  const buckets = Array.from(new Set(items.map(i => i.bucket)));

  const deleteBucket = (bucket) => {
    setItems(items.filter(i => i.bucket !== bucket));
    showToast(`Deleted bucket: ${bucket}`);
  };

  return (
    <div className="p-4 pt-4">
      <button onClick={() => showToast('Upload dialog opened')} className="btn-primary mb-1">
        <Upload size={15} /> Upload Resource
      </button>
      <div className="text-center text-[0.64rem] text-[#4e6580] mb-4">PDF · TXT · JSON</div>

      <div className="sec-header flex justify-between items-center">
        <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#10b981]" /> Knowledge Base</div>
      </div>
      
      {items.length === 0 ? (
        <div className="flex flex-col items-center p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#10b981]/10 border border-[#10b981]/30 flex items-center justify-center text-2xl mb-4">🗄️</div>
          <div className="text-sm font-bold text-[#f0f6ff] mb-1.5">No resources uploaded</div>
          <div className="text-xs text-[#8ea5c4] leading-relaxed max-w-[260px]">Upload PDFs, notes, or JSON data. Run a Scan to auto-populate buckets from the current page.</div>
        </div>
      ) : (
        <div className="space-y-6">
          {buckets.map(bucket => (
            <div key={bucket} className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <div className="text-[0.7rem] font-bold text-[#8ea5c4] uppercase tracking-wider">{bucket}</div>
                <button onClick={() => deleteBucket(bucket)} className="text-[0.65rem] text-[#ef4444] hover:underline">Delete Bucket</button>
              </div>
              <div className="space-y-2">
                {items.filter(i => i.bucket === bucket).map(item => (
                  <div key={item.id} className="bg-[#0d1929] border border-white/5 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <div className="text-[0.82rem] font-bold text-[#f0f6ff] mb-1">{item.title}</div>
                      <div className="flex items-center gap-2 font-mono text-[0.6rem] text-[#8ea5c4]">
                        <span>{item.size}</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => showToast('Viewing document...')} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[#8ea5c4] hover:text-white hover:bg-white/10 transition-colors">
                        <Search size={14} />
                      </button>
                      <button onClick={() => { setItems(items.filter(i => i.id !== item.id)); showToast('Deleted resource'); }} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[#ef4444] hover:bg-[#ef4444]/20 transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AgentPane({ showToast, showOverlay, hideOverlay }) {
  const [logs, setLogs] = useState(['No session activity yet.']);
  const [tasks, setTasks] = useState([
    { id: 1, title: 'Extract syllabus requirements', status: 'completed' },
    { id: 2, title: 'Draft Week 4 discussion post', status: 'in-progress' },
    { id: 3, title: 'Find peer posts to reply to', status: 'pending' },
    { id: 4, title: 'Sync with Canvas API', status: 'failed' }
  ]);

  useEffect(() => {
    const handleAgent = () => {
      showOverlay('Initializing agent…');
      setTimeout(() => {
        hideOverlay();
        setLogs([]);
        ['Parsing page context…', 'Extracting KB references…', 'Building reasoning chain…', 'Drafting response…', 'Done ✓'].forEach((s, i) => {
          setTimeout(() => {
            setLogs(prev => [...prev, `[0${i + 1}] ${s}`]);
          }, i * 500);
        });
      }, 1000);
    };
    document.addEventListener('do-agent', handleAgent);
    return () => document.removeEventListener('do-agent', handleAgent);
  }, []);

  const getStatusIcon = (status) => {
    switch(status) {
      case 'completed': return <Check size={12} className="text-[#10b981]" />;
      case 'in-progress': return <div className="w-3 h-3 border-2 border-[#5b8dee]/30 border-t-[#5b8dee] rounded-full animate-spin" />;
      case 'failed': return <X size={12} className="text-[#ef4444]" />;
      default: return <div className="w-1.5 h-1.5 rounded-full bg-[#4e6580]" />;
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return 'text-[#10b981] bg-[#10b981]/10 border-[#10b981]/20';
      case 'in-progress': return 'text-[#5b8dee] bg-[#5b8dee]/10 border-[#5b8dee]/20';
      case 'failed': return 'text-[#ef4444] bg-[#ef4444]/10 border-[#ef4444]/20';
      default: return 'text-[#8ea5c4] bg-white/5 border-white/10';
    }
  };

  return (
    <div className="p-4 pt-4">
      <div className="sec-header"><div className="w-1.5 h-1.5 rounded-full bg-[#5b8dee]" /> Command</div>
      <textarea className="inp mb-3" rows={3} placeholder="e.g. 'Read the textbook, identify key concepts, draft a 200-word Yellowdig post…'" />
      
      <div className="flex gap-2 mb-4">
        <div className="flex-1">
          <label className="block text-[0.66rem] font-bold uppercase tracking-widest text-[#8ea5c4] mb-1.5">Thinking</label>
          <select className="inp py-2.5"><option>Low</option><option selected>Medium</option><option>High</option></select>
        </div>
        <div className="flex-1">
          <label className="block text-[0.66rem] font-bold uppercase tracking-widest text-[#8ea5c4] mb-1.5">Precision</label>
          <select className="inp py-2.5"><option>Low</option><option selected>Medium</option><option>High</option></select>
        </div>
      </div>

      <div className="sec-header"><div className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]" /> Task Queue</div>
      <div className="space-y-2 mb-4">
        {tasks.map(task => (
          <div key={task.id} className="flex items-center gap-3 p-2.5 bg-[#0d1929] border border-white/5 rounded-lg">
            <div className="w-5 h-5 flex items-center justify-center shrink-0">
              {getStatusIcon(task.status)}
            </div>
            <span className="text-[0.76rem] font-medium flex-1 text-[#dde8f8] truncate">{task.title}</span>
            <span className={`font-mono text-[0.55rem] font-bold uppercase px-2 py-1 rounded border ${getStatusColor(task.status)}`}>
              {task.status.replace('-', ' ')}
            </span>
          </div>
        ))}
      </div>

      <div className="sec-header"><div className="w-1.5 h-1.5 rounded-full bg-[#10b981]" /> Progress Log</div>
      <div className="bg-[#030812]/80 border border-white/5 rounded-lg p-3 h-32 overflow-y-auto font-mono text-[0.66rem] leading-relaxed text-[#8ea5c4]">
        {logs.map((l, i) => (
          <div key={i} className="border-l-2 border-[#5b8dee]/40 pl-2 mb-0.5 text-[#5b8dee] animate-in fade-in slide-in-from-bottom-1">{l}</div>
        ))}
      </div>
    </div>
  );
}

export function SettingsPane({ showToast }) {
  return (
    <div className="p-4 pt-4">
      <div className="sec-header"><div className="w-1.5 h-1.5 rounded-full bg-[#5b8dee]" /> API Keys</div>
      <div className="mb-4">
        <label className="block text-[0.66rem] font-bold uppercase tracking-widest text-[#8ea5c4] mb-1.5">Gemini API Key</label>
        <input type="password" className="inp py-2.5" placeholder="AIzaSy…" />
      </div>

      <div className="sec-header"><div className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]" /> Firebase</div>
      <div className="mb-4">
        <label className="block text-[0.66rem] font-bold uppercase tracking-widest text-[#8ea5c4] mb-1.5">Web App Config JSON</label>
        <textarea className="inp min-h-[86px]" placeholder='{"apiKey":"...","projectId":"..."}' />
      </div>

      <div className="sec-header"><div className="w-1.5 h-1.5 rounded-full bg-[#10b981]" /> Modules</div>
      <div className="flex items-center gap-3 p-3 mb-2 bg-[#0d1929] border border-white/5 rounded-lg">
        <div className="w-2 h-2 rounded-full bg-[#10b981] shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
        <span className="text-[0.76rem] font-medium flex-1">vitalsource-detector</span>
        <span className="font-mono text-[0.6rem] font-medium px-2 py-1 rounded bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20">Ready</span>
      </div>
      <div className="flex items-center gap-3 p-3 mb-4 bg-[#0d1929] border border-white/5 rounded-lg">
        <div className="w-2 h-2 rounded-full bg-[#10b981] shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
        <span className="text-[0.76rem] font-medium flex-1">pagebreak-splitter</span>
        <span className="font-mono text-[0.6rem] font-medium px-2 py-1 rounded bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20">Ready</span>
      </div>

      <div className="sec-header"><div className="w-1.5 h-1.5 rounded-full bg-[#10b981]" /> System Status</div>
      <div className="flex items-center gap-3 p-3 mb-2 bg-[#0d1929] border border-white/5 rounded-lg">
        <div className="w-2 h-2 rounded-full bg-[#10b981] shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
        <span className="text-[0.76rem] font-medium flex-1">Extension Bridge</span>
        <span className="font-mono text-[0.6rem] text-[#4e6580]">Connected</span>
      </div>
      <div className="flex items-center gap-3 p-3 bg-[#0d1929] border border-white/5 rounded-lg">
        <div className="w-2 h-2 rounded-full bg-[#10b981] shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
        <span className="text-[0.76rem] font-medium flex-1">VitalSource Listener</span>
        <span className="font-mono text-[0.6rem] font-medium px-2 py-1 rounded bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20">Active</span>
      </div>
    </div>
  );
}
