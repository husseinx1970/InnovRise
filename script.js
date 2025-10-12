// ===== Footer year =====
document.addEventListener('DOMContentLoaded', () => {
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
});

// ===== Subtle animated background (2D canvas) =====
const bg = document.getElementById('bgGL');
if (bg) {
  const gl = bg.getContext('2d');
  function resizeBG(){ bg.width = innerWidth; bg.height = innerHeight; }
  addEventListener('resize', resizeBG, {passive:true}); resizeBG();
  (function loop(){
    const g = gl.createLinearGradient(0,0, bg.width, bg.height);
    g.addColorStop(0, `rgba(141,162,255,0.08)`);
    g.addColorStop(1, `rgba(85,255,225,0.06)`);
    gl.fillStyle = g; gl.fillRect(0,0,bg.width,bg.height);
    requestAnimationFrame(loop);
  })();
}

// ===== Interactive "InnovRise" particles (disturb nearby only) =====
const canvas = document.getElementById('playground');
if (canvas){
  // ---------- Tunables ----------
  const N_PARTICLES = 1100;     // number of particles
  const DISTURB_DELAY = 2000;   // ms: time to return to word after last move
  const INFLUENCE_SCALE = 0.22; // fraction of min(canvas) used as influence radius
  const ATTRACT_K = 0.06;       // spring to text
  const ATTRACT_POINTER = 0.08; // attraction to pointer (inside disturbance)
  const DAMPING = 0.86;         // velocity damping
  const SCATTER = 0.6;          // random jitter magnitude during disturbance
  const LINK_DIST = 130;        // link lines distance

  const ctx = canvas.getContext('2d');
  let W, H, DPR;
  const particles = [];
  let targets = [];
  let jitter = 0;
  let explodeUntil = 0;
  const EXPLODE_MS = 900;

  // Pointer + disturbance timer
  const pointer = { x:0, y:0, inside:false, lastTap:0 };
  let disturbUntil = 0;

  // Resize
  function resize(){
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    W = rect.width; H = rect.height;
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    ctx.setTransform(DPR,0,0,DPR,0,0);
    buildTextTargets();
  }
  addEventListener('resize', resize, {passive:true});

  // Init
  function rand(a,b){ return a + Math.random()*(b-a); }
  function initParticles(){
    particles.length = 0;
    for(let i=0;i<N_PARTICLES;i++){
      particles.push({x:rand(0,W), y:rand(0,H), vx:0, vy:0, r:rand(1.2,2.3), t:i});
    }
  }

  function buildTextTargets(){
    const off = document.createElement('canvas');
    off.width = Math.floor(W); off.height = Math.floor(H);
    const octx = off.getContext('2d');
    octx.clearRect(0,0,off.width,off.height);
    octx.fillStyle = '#fff';
    octx.textBaseline = 'middle';

    // Fit text to box
    const text = 'InnovRise';
    let size = Math.min(W*0.9, H*0.55);
    const PAD = W*0.06;
    octx.font = `800 ${size}px "Space Grotesk", Inter, system-ui`;
    let tw = octx.measureText(text).width;
    while ((tw + PAD*2) > W && size > 8){
      size *= 0.96;
      octx.font = `800 ${size}px "Space Grotesk", Inter, system-ui`;
      tw = octx.measureText(text).width;
    }
    const x = (W - tw)/2;
    const y = H/2;
    octx.fillText(text, x, y);

    const step = Math.max(3, Math.floor(size/26));
    targets = [];
    const img = octx.getImageData(0,0,off.width,off.height).data;
    for (let j=0;j<off.height;j+=step){
      for (let i=0;i<off.width;i+=step){
        const idx = (j*off.width + i)*4 + 3;
        if (img[idx] > 0){
          targets.push({x:i + rand(-0.5,0.5), y:j + rand(-0.5,0.5)});
        }
      }
    }
    for (let i=0;i<particles.length;i++){
      particles[i].t = i % targets.length;
    }
  }

  function explode(){
    const now = performance.now();
    explodeUntil = now + EXPLODE_MS;
    for (const p of particles){
      const angle = Math.random()*Math.PI*2;
      const speed = 4 + Math.random()*4;
      p.vx += Math.cos(angle)*speed;
      p.vy += Math.sin(angle)*speed;
    }
  }

  // Events
  canvas.addEventListener('mouseenter', ()=>{ pointer.inside = true; });
  canvas.addEventListener('mouseleave', ()=>{
    pointer.inside = false;
    disturbUntil = performance.now() + DISTURB_DELAY; // give it time to re-form
  });
  canvas.addEventListener('mousemove', (e)=>{
    const r = canvas.getBoundingClientRect();
    pointer.x = e.clientX - r.left;
    pointer.y = e.clientY - r.top;
    pointer.inside = true;
    disturbUntil = performance.now() + DISTURB_DELAY; // extend disturbance window
  });
  canvas.addEventListener('mousedown', (e)=>{
    const r = canvas.getBoundingClientRect();
    pointer.x = e.clientX - r.left;
    pointer.y = e.clientY - r.top;
    disturbUntil = performance.now() + DISTURB_DELAY;
  });
  canvas.addEventListener('dblclick', ()=> explode());

  // Touch
  canvas.addEventListener('touchstart', (e)=>{
    const now = Date.now();
    const r = canvas.getBoundingClientRect();
    if (e.touches && e.touches.length){
      pointer.x = e.touches[0].clientX - r.left;
      pointer.y = e.touches[0].clientY - r.top;
    }
    if (now - pointer.lastTap < 300) explode();
    pointer.lastTap = now;
    pointer.inside = true;
    disturbUntil = performance.now() + DISTURB_DELAY;
  }, {passive:false});
  canvas.addEventListener('touchmove', (e)=>{
    const r = canvas.getBoundingClientRect();
    if (e.touches && e.touches.length){
      pointer.x = e.touches[0].clientX - r.left;
      pointer.y = e.touches[0].clientY - r.top;
    }
    disturbUntil = performance.now() + DISTURB_DELAY;
    e.preventDefault();
  }, {passive:false});
  canvas.addEventListener('touchend', ()=>{
    pointer.inside = false;
    disturbUntil = performance.now() + DISTURB_DELAY;
  });

  // Draw loop
  function draw(){
    ctx.clearRect(0,0,W,H);

    // soft inner glow
    const g = ctx.createRadialGradient(W/2,H/2,10,W/2,H/2,Math.max(W,H)/1.2);
    g.addColorStop(0,'rgba(141,162,255,0.14)');
    g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);

    const now = performance.now();
    const disturbActive = (now < disturbUntil) || (pointer.inside);

    jitter += 0.004;
    const R = Math.min(W,H) * INFLUENCE_SCALE;
    const R2 = R*R;

    for (let i=0;i<particles.length;i++){
      const p = particles[i];
      const T = targets[p.t % targets.length];

      if (disturbActive){
        // If near pointer, attract + scatter; otherwise spring to text
        const dxp = pointer.x - p.x;
        const dyp = pointer.y - p.y;
        const d2 = dxp*dxp + dyp*dyp;

        if (d2 < R2){
          // attract with distance-based strength
          const dist = Math.sqrt(d2) + 0.0001;
          const strength = ATTRACT_POINTER * (1 - dist/R);
          p.vx += (dxp/dist) * strength * 14;
          p.vy += (dyp/dist) * strength * 14;
          // scatter (random) for sparkle
          p.vx += (Math.random()-0.5) * SCATTER;
          p.vy += (Math.random()-0.5) * SCATTER;
        } else if (T){
          const dx = (T.x + Math.sin(jitter + i*0.02)*0.8) - p.x;
          const dy = (T.y + Math.cos(jitter*1.3 + i*0.02)*0.8) - p.y;
          p.vx += dx * ATTRACT_K; p.vy += dy * ATTRACT_K;
        }
      } else {
        // default: strong spring to the word
        if (T){
          const dx = (T.x + Math.sin(jitter + i*0.02)*0.8) - p.x;
          const dy = (T.y + Math.cos(jitter*1.3 + i*0.02)*0.8) - p.y;
          p.vx += dx * ATTRACT_K; p.vy += dy * ATTRACT_K;
        }
      }

      // decay (if explosion active, let them be looser)
      if (now < explodeUntil){
        p.vx *= 0.9; p.vy *= 0.9;
      } else {
        p.vx *= DAMPING; p.vy *= DAMPING;
      }

      p.x += p.vx; p.y += p.vy;

      // draw particle
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(85,255,225,0.95)';
      ctx.fill();
    }

    // linking
    const L2 = LINK_DIST * LINK_DIST;
    for (let i=0;i<particles.length; i+=6){
      const p = particles[i];
      for (let j=i+6;j<particles.length; j+=24){
        const q = particles[j];
        const dx = p.x - q.x, dy = p.y - q.y;
        const d2 = dx*dx + dy*dy;
        if (d2 < L2){
          ctx.globalAlpha = Math.max(0, 1 - d2/L2) * 0.35;
          ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(q.x,q.y);
          ctx.strokeStyle = '#8da2ff'; ctx.lineWidth = 1;
          ctx.stroke(); ctx.globalAlpha=1;
        }
      }
    }

    requestAnimationFrame(draw);
  }

  // Start
  resize();
  initParticles();
  draw();
}
