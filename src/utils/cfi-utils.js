(function(){
    // Centralized CFI utilities for VitalSource/EPUB matching.
    function safeDecode(s) {
        try { return decodeURIComponent(String(s)); } catch (e) { return String(s); }
    }

    function extractSpineIndex(urlOrCfi) {
        if (!urlOrCfi) return null;
        const s = safeDecode(urlOrCfi);
        const m1 = s.match(/epubcfi\/6\/(\d+)/);
        if (m1) return parseInt(m1[1], 10);
        const m2 = s.match(/\/6\/(\d+)/);
        if (m2) return parseInt(m2[1], 10);
        const m3 = s.match(/epubcfi\([^)]*\/6\/(\d+)/);
        if (m3) return parseInt(m3[1], 10);
        return null;
    }

    function cfiMatchesUrl(rawCfi, url) {
        if (!rawCfi || !url) return false;
        try {
            const raw = String(rawCfi);
            const decoded = safeDecode(raw);
            if (decoded && url.includes(decoded)) return true;
            const stripped = decoded.replace(/^epubcfi\(?/i, '').replace(/\)?$/, '');
            if (stripped && url.includes(stripped)) return true;
            if (url.includes(raw)) return true;
        } catch (e) { /* ignore */ }
        return false;
    }

    function parseCfiEntry(raw) {
        try {
            const s = safeDecode(String(raw || '')).trim();
            const norm = s.replace(/^epubcfi\(?/i, '').replace(/\)?$/, '');
            const parts = norm.split('!');
            let spine = null;
            const m = parts[0] && parts[0].match(/\/6\/(\d+)/);
            if (m) spine = parseInt(m[1], 10);
            const steps = [];
            if (parts[1]) {
                const segs = parts[1].split('/').filter(Boolean);
                for (const seg of segs) {
                    const nm = String(seg).match(/^(\d+)/);
                    if (nm) steps.push(parseInt(nm[1], 10));
                }
            }
            return { spine, steps, normalized: norm };
        } catch (e) { return { spine: null, steps: [], normalized: String(raw || '') }; }
    }

    function compareSteps(a, b) {
        const A = Array.isArray(a) ? a : [];
        const B = Array.isArray(b) ? b : [];
        const L = Math.max(A.length, B.length);
        for (let i = 0; i < L; i++) {
            const ai = (typeof A[i] === 'number') ? A[i] : -1;
            const bi = (typeof B[i] === 'number') ? B[i] : -1;
            if (ai !== bi) return ai - bi;
        }
        return 0;
    }

    function findMatchingPagebreakEntry(pagesPayload, topUrl) {
        try {
            let pbList = [];
            if (!pagesPayload) return null;
            if (Array.isArray(pagesPayload)) pbList = pagesPayload;
            else if (pagesPayload && Array.isArray(pagesPayload.pages)) pbList = pagesPayload.pages;
            else if (pagesPayload && typeof pagesPayload === 'object') pbList = Object.values(pagesPayload).filter(v => v && typeof v === 'object');

            const url = topUrl || (typeof window !== 'undefined' && window.top && window.top.location && window.top.location.href) || (typeof window !== 'undefined' && window.location.href) || '';

            // 1) Exact cfiWithoutAssertions match
            for (const p of pbList) {
                try {
                    if (!p) continue;
                    if (p.cfiWithoutAssertions && cfiMatchesUrl(p.cfiWithoutAssertions, url)) return { entry: p, reason: 'cfiWithoutAssertions' };
                } catch (e) { }
            }

            // 2) Exact cfi match
            for (const p of pbList) {
                try {
                    if (!p) continue;
                    if (p.cfi && cfiMatchesUrl(p.cfi, url)) return { entry: p, reason: 'cfi' };
                } catch (e) { }
            }

            // 3) Resource/url/path/href match
            for (const p of pbList) {
                try {
                    if (!p) continue;
                    if (p.absoluteURL && url.includes(String(p.absoluteURL))) return { entry: p, reason: 'absoluteURL' };
                    if (p.url && url.includes(String(p.url))) return { entry: p, reason: 'url' };
                    if (p.href && url.includes(String(p.href))) return { entry: p, reason: 'href' };
                    if (p.resource && url.includes(String(p.resource))) return { entry: p, reason: 'resource' };
                    if (p.path && url.includes(String(p.path))) return { entry: p, reason: 'path' };
                } catch (e) { }
            }

            // 4) Spine-based fallback
            const spine = extractSpineIndex(url) || null;
            if (spine != null) {
                const candidates = pbList.map(p => ({ p, parsed: parseCfiEntry(p.cfiWithoutAssertions || p.cfi || '') }))
                    .filter(it => it.parsed && it.parsed.spine === spine);
                if (candidates.length === 1) return { entry: candidates[0].p, reason: 'spine' };
                if (candidates.length > 1) {
                    candidates.sort((a, b) => compareSteps(a.parsed.steps, b.parsed.steps));
                    return { entry: candidates[0].p, reason: 'spine-closest', candidates: candidates.map(c => c.p) };
                }
            }

            return null;
        } catch (e) { return null; }
    }

    function runPagebreakDiagnostic(pagesPayload, testUrl) {
        try {
            const url = testUrl || (typeof window !== 'undefined' && window.top && window.top.location && window.top.location.href) || (typeof window !== 'undefined' && window.location.href) || '';
            const result = findMatchingPagebreakEntry(pagesPayload, url);
            if (!result) {
                if (typeof console !== 'undefined' && console.info) console.info('Pagebreak diagnostic: no match found for', url);
                return null;
            }
            if (typeof console !== 'undefined' && console.info) console.info('Pagebreak diagnostic: matched reason=', result.reason, 'entry=', result.entry);
            return result;
        } catch (e) { if (typeof console !== 'undefined' && console.error) console.error('Diagnostic error', e); return null; }
    }

    // Expose on window for other scripts to use; preserve existing global if present
    try {
        if (typeof window !== 'undefined') {
            window.DIG_CFI = window.DIG_CFI || {};
            window.DIG_CFI.safeDecode = safeDecode;
            window.DIG_CFI.extractSpineIndex = extractSpineIndex;
            window.DIG_CFI.cfiMatchesUrl = cfiMatchesUrl;
            window.DIG_CFI.parseCfiEntry = parseCfiEntry;
            window.DIG_CFI.compareSteps = compareSteps;
            window.DIG_CFI.findMatchingPagebreakEntry = findMatchingPagebreakEntry;
            window.DIG_CFI.runPagebreakDiagnostic = runPagebreakDiagnostic;
        }
    } catch (e) { /* ignore */ }
})();
