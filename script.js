// ===== Footer year (optional) =====
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

// ===== Orbit Particles (no connecting lines) =====
const canvas = document.getElementById('playground');
if (canvas){
  // ---------- Tunables ----------
  const N_PARTICLES = 1000;     // number of particles
  const INFLUENCE_SCALE = 0.24; // fraction of min(canvas) used as influence radius
  const SPRING_TO_TEXT = 0.065; // pull strength to target points
  const ATTRACT_TO_POINTER = 0.10; // center pull to pointer
  const ORBIT_TANGENTIAL = 0.12;   // tangential component for orbit
  const DAMPING = 0.88;            // velocity damping
  const JITTER = 0.003;            // micro jitter for "alive" feel
  const EXPLODE_MS = 800;          // double-tap/dblclick explode duration
  const PARTICLE_MIN = 1.2, PARTICLE_MAX = 2.2;

  const ctx = canvas.getContext('2d');
  let W, H, DPR;
  const particles = [];
  let targets = [];
  let explodeUntil = 0;

  // Pointer state
  const pointer = { x:0, y:0, inside:false, lastTap:0 };

  // Resize & build targets
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

  // Init particles
  function rand(a,b){ return a + Math.random()*(b-a); }
  function initParticles(){
    particles.length = 0;
    for(let i=0;i<N_PARTICLES;i++){
      particles.push({x:rand(0,W), y:rand(0,H), vx:0, vy:0, r:rand(PARTICLE_MIN,PARTICLE_MAX), t:i});
    }
  }

  // Build "InnovRise" targets with fit-to-box
  function buildTextTargets(){
    const off = document.createElement('canvas');
    off.width = Math.floor(W); off.height = Math.floor(H);
    const octx = off.getContext('2d');
    octx.clearRect(0,0,off.width,off.height);
    octx.fillStyle = '#fff';
    octx.textBaseline = 'middle';

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
          // slight offset for life-like look
          targets.push({x:i + rand(-0.5,0.5), y:j + rand(-0.5,0.5)});
        }
      }
    }
    // map particles to available targets
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
  canvas.addEventListener('mouseleave', ()=>{ pointer.inside = false; });
  canvas.addEventListener('mousemove', (e)=>{
    const r = canvas.getBoundingClientRect();
    pointer.x = e.clientX - r.left;
    pointer.y = e.clientY - r.top;
    pointer.inside = true;
  });
  canvas.addEventListener('mousedown', (e)=>{
    const r = canvas.getBoundingClientRect();
    pointer.x = e.clientX - r.left;
    pointer.y = e.clientY - r.top;
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
  }, {passive:false});
  canvas.addEventListener('touchmove', (e)=>{
    const r = canvas.getBoundingClientRect();
    if (e.touches && e.touches.length){
      pointer.x = e.touches[0].clientX - r.left;
      pointer.y = e.touches[0].clientY - r.top;
    }
    e.preventDefault();
  }, {passive:false});
  canvas.addEventListener('touchend', ()=>{ pointer.inside = false; });

  // Draw loop
  function draw(){
    ctx.clearRect(0,0,W,H);

    // soft inner glow
    const g = ctx.createRadialGradient(W/2,H/2,10,W/2,H/2,Math.max(W,H)/1.2);
    g.addColorStop(0,'rgba(141,162,255,0.14)');
    g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);

    const now = performance.now();
    const R = Math.min(W,H) * INFLUENCE_SCALE;
    const R2 = R*R;

    for (let i=0;i<particles.length;i++){
      const p = particles[i];
      const T = targets[p.t % targets.length];

      if (pointer.inside){
        // pointer attraction + tangential orbit
        const dxp = pointer.x - p.x;
        const dyp = pointer.y - p.y;
        const d2 = dxp*dxp + dyp*dyp;
        const dist = Math.sqrt(d2) + 0.0001;

        if (d2 < R2){
          // radial pull
          const pull = ATTRACT_TO_POINTER * (1 - dist/R);
          p.vx += (dxp/dist) * pull * 14;
          p.vy += (dyp/dist) * pull * 14;

          // tangential component for orbit
          const tx = -dyp / dist;
          const ty =  dxp / dist;
          const orbit = ORBIT_TANGENTIAL * (1 - dist/R);
          p.vx += tx * orbit * 12;
          p.vy += ty * orbit * 12;

          // micro jitter
          p.vx += (Math.random()-0.5)*JITTER*40;
          p.vy += (Math.random()-0.5)*JITTER*40;
        } else if (T){
          // outside influence: keep word
          p.vx += (T.x - p.x) * SPRING_TO_TEXT;
          p.vy += (T.y - p.y) * SPRING_TO_TEXT;
        }
      } else {
        // immediately reform word
        if (T){
          p.vx += (T.x - p.x) * SPRING_TO_TEXT;
          p.vy += (T.y - p.y) * SPRING_TO_TEXT;
        }
      }

      // explosion decay
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

    requestAnimationFrame(draw);
  }

  // Start
  resize();
  initParticles();
  draw();
}
