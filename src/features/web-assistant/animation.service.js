// Animated mesh engine for web-assistant
// Exports: initMesh (starts engine), stopMesh

let _running = false;
let _canvas = null;
let _ctx = null;
let _width = 0, _height = 0, _time = 0;
let _mouse = { x: -1000, y: -1000 };
let _blobs = [];
let _rafId = null;

class BlobItem {
    constructor(color, radius) { this.init(); this.radius = radius; this.color = color; }
    init() { this.x = Math.random() * window.innerWidth; this.y = Math.random() * window.innerHeight; this.angle = Math.random() * Math.PI * 2; this.velocity = 0.2 + Math.random() * 0.4; }
    update() {
        this.angle += Math.sin(_time * 0.001 + this.x * 0.002) * 0.02;
        this.x += Math.cos(this.angle) * this.velocity;
        this.y += Math.sin(this.angle) * this.velocity;
        const dx = this.x - _mouse.x; const dy = this.y - _mouse.y; const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 400) { const force = (400 - dist) / 400; this.x += (dx / dist) * force * 1.5; this.y += (dy / dist) * force * 1.5; }
        if (this.x < -this.radius) this.x = _width + this.radius; if (this.x > _width + this.radius) this.x = -this.radius;
        if (this.y < -this.radius) this.y = _height + this.radius; if (this.y > _height + this.radius) this.y = -this.radius;
    }
    draw() {
        const gradient = _ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
        gradient.addColorStop(0, this.color); gradient.addColorStop(1, 'transparent');
        _ctx.fillStyle = gradient; _ctx.globalCompositeOperation = 'screen';
        _ctx.beginPath(); _ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); _ctx.fill();
    }
}

function resize() { if (!_canvas) return; _width = _canvas.width = window.innerWidth; _height = _canvas.height = window.innerHeight; }
function createBlobs() {
    if (!_canvas) return; _blobs = []; const count = _width < 768 ? 4 : 6;
    const palette = ['rgba(30, 41, 59, 0.8)', 'rgba(15, 23, 42, 0.9)', 'rgba(56, 189, 248, 0.08)', 'rgba(99, 102, 241, 0.15)'];
    for (let i = 0; i < count; i++) _blobs.push(new BlobItem(palette[i % palette.length], Math.max(_width, _height) * (0.6 + Math.random() * 0.3)));
}
function loop() {
    _time++; _ctx.globalCompositeOperation = 'source-over'; _ctx.fillStyle = '#0f172a'; _ctx.fillRect(0, 0, _width, _height);
    _blobs.forEach(b => { b.update(); b.draw(); });
    _rafId = requestAnimationFrame(loop);
}

export function initMesh() {
    try {
        _canvas = document.getElementById('meshCanvas');
        if (!_canvas) return;
        _ctx = _canvas.getContext('2d', { alpha: false });
        window.addEventListener('mousemove', (e) => { _mouse.x = e.clientX; _mouse.y = e.clientY; });
        window.addEventListener('resize', () => { resize(); createBlobs(); });
        resize(); createBlobs(); loop();
        _running = true;
        // Expose compatibility globals so older code can call them directly
        try { window.resize = resize; window.createBlobs = createBlobs; window.loop = loop; window._mesh = { stop: stopMesh }; } catch (e) {}
    } catch (e) { /* ignore */ }
}

export function stopMesh() {
    try { if (_rafId) cancelAnimationFrame(_rafId); _rafId = null; _running = false; } catch (e) {}
}

// Auto-init if mesh canvas exists
try { if (typeof document !== 'undefined' && document.getElementById('meshCanvas')) initMesh(); } catch (e) {}
