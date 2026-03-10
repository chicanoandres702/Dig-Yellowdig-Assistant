/**
 * ============================================================
 * PAGEPILOT  —  CAROUSEL PATCH
 * ============================================================
 * Drop this file alongside main.js and add ONE script tag
 * in your HTML (after main.js loads):
 *
 *   <script type="module" src="carousel-patch.js"></script>
 *
 * It overwrites populateDetectedPosts() and injects all the
 * required CSS at runtime.  No other files need to change.
 * ============================================================
 */

// ── State ────────────────────────────────────────────────────
let _carouselPosts = [];
let _carouselIndex = 0;

// ── Styles (injected once) ───────────────────────────────────
function _injectCarouselStyles() {
    if (document.getElementById('pp-carousel-styles')) return;
    const st = document.createElement('style');
    st.id = 'pp-carousel-styles';
    st.textContent = `
        /* ─── Scan tab toolbar: all buttons inline ─── */
        .scan-toolbar {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            align-items: center;
            padding: 6px 0 10px;
        }
        .scan-toolbar > * { margin: 0 !important; }

        /* ─── Carousel outer wrapper ─── */
        .post-carousel {
            position: relative;
            display: flex;
            align-items: stretch;
            gap: 0;
            width: 100%;
            min-height: 260px;
            margin-top: 8px;
        }

        /* ─── Large arrow buttons ─── */
        .carousel-arrow {
            flex-shrink: 0;
            width: 56px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(99, 102, 241, 0.10);
            border: 1px solid rgba(99, 102, 241, 0.22);
            cursor: pointer;
            color: rgba(148, 163, 184, 0.85);
            font-size: 30px;
            font-weight: 700;
            line-height: 1;
            transition: background 0.18s, color 0.18s, transform 0.12s;
            user-select: none;
            -webkit-user-select: none;
            padding: 0;
        }
        .carousel-arrow:hover:not(:disabled) {
            background: rgba(99, 102, 241, 0.28);
            color: #e2e8f0;
            transform: scale(1.07);
        }
        .carousel-arrow:disabled {
            opacity: 0.22;
            cursor: default;
            transform: none;
        }
        .carousel-arrow.left  { border-radius: 10px 3px 3px 10px; }
        .carousel-arrow.right { border-radius: 3px 10px 10px 3px; }

        /* ─── Card viewport ─── */
        .carousel-viewport {
            flex: 1;
            overflow: hidden;
        }
        .carousel-slide {
            display: none;
            flex-direction: column;
            height: 100%;
        }
        .carousel-slide.active { display: flex; }

        /* ─── Full post card ─── */
        .post-carousel-card {
            background: var(--bg-card, rgba(15,23,42,0.88));
            border: 1px solid rgba(99, 102, 241, 0.18);
            border-radius: 3px;
            padding: 18px 20px 14px;
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 10px;
            position: relative;
            box-shadow: 0 2px 18px rgba(0,0,0,0.28);
        }

        /* ─── Confidence badge ─── */
        .post-conf-badge {
            position: absolute;
            top: 14px;
            right: 14px;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 12px;
            color: #fff;
            animation: ppConfPulse 1.4s ease-in-out infinite;
            pointer-events: none;
        }
        .post-conf-badge.high { background: rgba(239,68,68,0.95); }
        .post-conf-badge.med  { background: rgba(249,115,22,0.90); }
        .post-conf-badge.low  { background: rgba(100,116,139,0.80); }

        @keyframes ppConfPulse {
            0%,100% { transform: scale(1); }
            50%      { transform: scale(1.13); }
        }

        /* ─── Author line ─── */
        .post-author-line {
            font-size: 0.7rem;
            color: var(--text-muted, #64748b);
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            padding-right: 56px; /* room for badge */
        }

        /* ─── Post body ─── */
        .post-body-text {
            flex: 1;
            font-size: 0.83rem;
            line-height: 1.65;
            color: #cbd5e1;
            overflow-y: auto;
            max-height: 130px;
            padding-right: 4px;
        }

        /* ─── Confidence bar ─── */
        .conf-bar-wrap {
            height: 5px;
            background: rgba(0,0,0,0.14);
            border-radius: 5px;
            flex-shrink: 0;
        }
        .conf-bar-fill {
            height: 5px;
            border-radius: 5px;
            background: linear-gradient(90deg, #10b981, #60a5fa);
            transition: width 0.3s;
        }

        /* ─── Card action buttons (side by side) ─── */
        .post-card-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            flex-shrink: 0;
        }
        .post-card-actions .card-action-btn { margin: 0 !important; }

        /* ─── Counter below carousel ─── */
        .carousel-counter {
            text-align: center;
            font-size: 0.64rem;
            color: var(--text-muted, #64748b);
            margin-top: 6px;
            letter-spacing: 0.07em;
            user-select: none;
        }

        /* ─── Empty state ─── */
        .carousel-empty {
            font-size: 0.65rem;
            color: var(--text-muted, #64748b);
            text-align: center;
            padding: 42px 0;
        }

        /* ─── Draft card button rows (side by side) ─── */
        .card-actions,
        .draft-btn-row {
            display: flex !important;
            flex-wrap: wrap;
            gap: 7px !important;
        }
        .card-actions > *,
        .draft-btn-row > * { margin: 0 !important; }

        /* ─── Refine modal button row ─── */
        .refine-btn-row {
            display: flex;
            gap: 7px;
        }
        .refine-btn-row > * { margin: 0 !important; }
    `;
    document.head.appendChild(st);
}

// ── Render a specific slide and update arrow/counter state ───
function _renderCarouselSlide(idx) {
    const viewport = document.querySelector('.carousel-viewport');
    if (!viewport) return;

    viewport.querySelectorAll('.carousel-slide').forEach((s, i) =>
        s.classList.toggle('active', i === idx)
    );

    const leftBtn  = document.getElementById('pp-carousel-prev');
    const rightBtn = document.getElementById('pp-carousel-next');
    const counter  = document.querySelector('.carousel-counter');

    if (leftBtn)  leftBtn.disabled  = (idx === 0);
    if (rightBtn) rightBtn.disabled = (idx >= _carouselPosts.length - 1);
    if (counter)  counter.textContent = `${idx + 1} / ${_carouselPosts.length}`;
}

// ── Main function (replaces the old populateDetectedPosts) ───
function populateDetectedPosts(posts) {
    const container = document.getElementById('detectedPostsContainer');
    if (!container) return;

    _injectCarouselStyles();

    // Deduplicate
    try {
        const seen = new Set();
        const unique = [];
        (posts || []).forEach(p => {
            const key = (p && p.selector)
                ? `sel:${p.selector}`
                : `txt:${String((p && p.text) || '').slice(0, 200)}`;
            if (!seen.has(key)) { seen.add(key); unique.push(p); }
        });
        posts = unique;
    } catch (_) {}

    // Empty state
    if (!posts || !Array.isArray(posts) || posts.length === 0) {
        container.style.display = 'block';
        container.innerHTML = '<div class="carousel-empty">No posts found.</div>';
        return;
    }

    _carouselPosts = posts;
    _carouselIndex = 0;

    // Build one slide per post
    const slidesHtml = posts.map((p, i) => {
        const author  = p.author || 'Unknown';
        const text    = (p.text || '').replace(/\n/g, ' ');
        const conf    = typeof p.confidence === 'number' ? p.confidence : 0;
        const pct     = Math.round(conf * 100);
        const lvl     = conf >= 0.75 ? 'high' : conf >= 0.40 ? 'med' : 'low';
        const aEnc    = encodeURIComponent(author);
        const tEnc    = encodeURIComponent(text);

        return `
        <div class="carousel-slide${i === 0 ? ' active' : ''}">
          <div class="post-carousel-card">
            <div class="post-conf-badge ${lvl}" title="Confidence ${pct}%">${pct}%</div>

            <div class="post-author-line">${author}</div>

            <div class="post-body-text">${
                text || '<em style="opacity:.4">No content</em>'
            }</div>

            <div class="conf-bar-wrap">
              <div class="conf-bar-fill" style="width:${pct}%"></div>
            </div>

            <div class="post-card-actions">
              <button class="card-action-btn"
                data-action="save-post"
                data-author="${aEnc}"
                data-text="${tEnc}">+ KB</button>
              <button class="card-action-btn yd"
                data-action="load-draft"
                data-author="${aEnc}"
                data-text="${tEnc}">📝 DRAFT</button>
            </div>
          </div>
        </div>`;
    }).join('');

    container.style.display = 'block';
    container.innerHTML = `
      <div class="post-carousel">
        <button class="carousel-arrow left"
          id="pp-carousel-prev"
          ${posts.length <= 1 ? 'disabled' : ''}
          aria-label="Previous post">&#8249;</button>

        <div class="carousel-viewport">${slidesHtml}</div>

        <button class="carousel-arrow right"
          id="pp-carousel-next"
          ${posts.length <= 1 ? 'disabled' : ''}
          aria-label="Next post">&#8250;</button>
      </div>
      <div class="carousel-counter">1 / ${posts.length}</div>`;

    // Wire navigation
    document.getElementById('pp-carousel-prev').addEventListener('click', () => {
        if (_carouselIndex > 0) {
            _carouselIndex--;
            _renderCarouselSlide(_carouselIndex);
        }
    });

    document.getElementById('pp-carousel-next').addEventListener('click', () => {
        if (_carouselIndex < _carouselPosts.length - 1) {
            _carouselIndex++;
            _renderCarouselSlide(_carouselIndex);
        }
    });
}

// ── Keyboard navigation (left / right arrow keys) ───────────
document.addEventListener('keydown', (e) => {
    const container = document.getElementById('detectedPostsContainer');
    if (!container || !container.querySelector('.post-carousel')) return;
    if (e.key === 'ArrowLeft'  && _carouselIndex > 0) {
        _carouselIndex--; _renderCarouselSlide(_carouselIndex);
    }
    if (e.key === 'ArrowRight' && _carouselIndex < _carouselPosts.length - 1) {
        _carouselIndex++; _renderCarouselSlide(_carouselIndex);
    }
});

// ── Expose globally so main.js can call it after scoring ─────
window.populateDetectedPosts = populateDetectedPosts;