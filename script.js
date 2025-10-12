
// Footer year
document.addEventListener('DOMContentLoaded', () => {
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
});

// Mode toggle (persist)
const root = document.documentElement;
const modeBtn = document.getElementById('modeToggle');
const saved = localStorage.getItem('innovrise-mode');
if (saved === 'light') root.classList.add('light');
if (modeBtn){
  modeBtn.addEventListener('click', ()=>{
    root.classList.toggle('light');
    localStorage.setItem('innovrise-mode', root.classList.contains('light') ? 'light' : 'dark');
  });
}

// Reveal on scroll
const observer = new IntersectionObserver((entries)=>{
  for (const e of entries){
    if (e.isIntersecting){ e.target.classList.add('show'); observer.unobserve(e.target); }
  }
},{threshold:0.15});
document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));

// Magnetic buttons
document.querySelectorAll('.magnetic').forEach(btn=>{
  btn.addEventListener('mousemove', (e)=>{
    const s = btn.querySelector('span');
    const r = btn.getBoundingClientRect();
    const x = (e.clientX - r.left - r.width/2)/r.width;
    const y = (e.clientY - r.top - r.height/2)/r.height;
    s.style.transform = `translate(${x*8}px, ${y*8}px)`;
  });
  btn.addEventListener('mouseleave', ()=>{
    const s = btn.querySelector('span');
    s.style.transform = 'translate(0,0)';
  });
});

// WebGL background (from v4.1) with graceful fallback
const canvasBG = document.getElementById('bgGL');
let gl;
try { gl = canvasBG.getContext('webgl2', { antialias: true }); } catch(e){}
if (!gl){
  document.getElementById('bgFallback').style.display = 'block';
  const grain = document.getElementById('grain');
  if (grain){
    const gctx = grain.getContext('2d');
    function resize(){ grain.width = innerWidth; grain.height = innerHeight; }
    addEventListener('resize', resize, {passive:true}); resize();
    function draw(){
      const img = gctx.createImageData(grain.width, grain.height);
      for (let i=0; i<img.data.length; i+=4){
        const v = Math.random()*255|0;
        img.data[i]=img.data[i+1]=img.data[i+2]=v;
        img.data[i+3]=30;
      }
      gctx.putImageData(img,0,0);
      requestAnimationFrame(draw);
    }
    draw();
  }
} else {
  document.getElementById('bgFallback').style.display = 'none';
  const vert = `#version 300 es
  in vec2 a;
  void main(){ gl_Position = vec4(a,0.0,1.0); }`;
  const frag = `#version 300 es
  precision highp float;
  out vec4 o;
  uniform vec2 r;
  uniform float t;
  uniform vec3 c1;
  uniform vec3 c2;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    float a = hash(i);
    float b = hash(i+vec2(1,0));
    float c = hash(i+vec2(0,1));
    float d = hash(i+vec2(1,1));
    vec2 u = f*f*(3.0-2.0*f);
    return mix(a,b,u.x)+ (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
  }
  float fbm(vec2 p){
    float v=0.0,a=0.5;
    for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.02; a*=0.5; }
    return v;
  }
  void main(){
    vec2 uv = (gl_FragCoord.xy - 0.5*r) / r.y;
    float m = fbm(uv*1.6 + vec2(0.12*t, 0.07*t));
    float b = smoothstep(0.35,0.85,m);
    float g = abs(sin(uv.y*6.0 + t*0.6))*0.08 + abs(sin((uv.x+uv.y)*3.0 - t*0.5))*0.06;
    vec3 col = mix(c1, c2, b) + g;
    float v = smoothstep(1.2, 0.2, length(uv));
    col *= v;
    o = vec4(col, 1.0);
  }`;
  function compile(type, src){
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw gl.getShaderInfoLog(s);
    return s;
  }
  function program(vs, fs){
    const p = gl.createProgram();
    gl.attachShader(p, vs); gl.attachShader(p, fs);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw gl.getProgramInfoLog(p);
    return p;
  }
  const vs = compile(gl.VERTEX_SHADER, vert);
  const fs = compile(gl.FRAGMENT_SHADER, frag);
  const prog = program(vs, fs);
  gl.useProgram(prog);
  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const u_r = gl.getUniformLocation(prog, 'r');
  const u_t = gl.getUniformLocation(prog, 't');
  const u_c1 = gl.getUniformLocation(prog, 'c1');
  const u_c2 = gl.getUniformLocation(prog, 'c2');
  function resizeBG(){
    const dpr = Math.min( window.devicePixelRatio || 1, 1.6);
    const w = Math.floor(innerWidth * dpr);
    const h = Math.floor(innerHeight * dpr);
    canvasBG.width = w; canvasBG.height = h;
    canvasBG.style.width = innerWidth + 'px';
    canvasBG.style.height = innerHeight + 'px';
    gl.viewport(0,0,w,h);
    gl.uniform2f(u_r, w, h);
  }
  window.addEventListener('resize', resizeBG, {passive:true}); resizeBG();
  let start = performance.now();
  function loop(){
    const time = (performance.now()-start)/1000;
    const styles = getComputedStyle(document.documentElement);
    let c1 = styles.getPropertyValue('--accent').trim() || '#55ffe1';
    let c2 = styles.getPropertyValue('--accent-2').trim() || '#8da2ff';
    function hex3(s){ if (s[0]==='#') s=s.slice(1); return [parseInt(s.slice(0,2),16)/255, parseInt(s.slice(2,4),16)/255, parseInt(s.slice(4,6),16)/255]; }
    const a=hex3(c1), b=hex3(c2);
    gl.uniform3f(u_c1, a[0], a[1], a[2]);
    gl.uniform3f(u_c2, b[0], b[1], b[2]);
    gl.uniform1f(u_t, time);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(loop);
  }
  loop();
}

// ---- Interactive "Orbit Particles" mini‑game ----
const canvas = document.getElementById('playground');
if (canvas){
  const ctx = canvas.getContext('2d');
  let W, H, DPR;
  const particles = [];
  const N = 120;
  let pointer = {x:0, y:0, active:false};

  function resize(){
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    W = rect.width; H = rect.height;
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    ctx.setTransform(DPR,0,0,DPR,0,0);
  }
  window.addEventListener('resize', resize, {passive:true});
  resize();

  function rand(a,b){ return a + Math.random()*(b-a); }
  for(let i=0;i<N;i++){
    particles.push({x:rand(0,W), y:rand(0,H), vx:rand(-0.6,0.6), vy:rand(-0.6,0.6), r:rand(1.5,3.5)});
  }

  function draw(){
    ctx.clearRect(0,0,W,H);
    // soft background glow
    const g = ctx.createRadialGradient(W/2,H/2,10,W/2,H/2,Math.max(W,H)/1.2);
    g.addColorStop(0,'rgba(141,162,255,0.15)');
    g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);

    // update & draw
    for (const p of particles){
      // pointer gravity
      if (pointer.active){
        const dx = (pointer.x - p.x), dy = (pointer.y - p.y);
        const dist2 = dx*dx + dy*dy + 40;
        const f = 1400 / dist2;
        p.vx += f * dx / Math.sqrt(dist2);
        p.vy += f * dy / Math.sqrt(dist2);
      } else {
        // gentle orbit towards center
        const dx = (W/2 - p.x), dy = (H/2 - p.y);
        p.vx += dx * 0.0006;
        p.vy += dy * 0.0006;
      }
      // damping
      p.vx *= 0.985; p.vy *= 0.985;
      p.x += p.vx; p.y += p.vy;

      // walls
      if (p.x<0||p.x>W) p.vx*=-1;
      if (p.y<0||p.y>H) p.vy*=-1;

      // draw particle
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(85,255,225,0.9)';
      ctx.fill();

      // link lines
      for (const q of particles){
        const dx = p.x - q.x, dy = p.y - q.y;
        const d2 = dx*dx + dy*dy;
        if (d2 < 120*120){
          ctx.globalAlpha = Math.max(0, 1 - d2/(120*120)) * 0.35;
          ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(q.x,q.y);
          ctx.strokeStyle = '#8da2ff'; ctx.lineWidth = 1;
          ctx.stroke(); ctx.globalAlpha=1;
        }
      }
    }
    requestAnimationFrame(draw);
  }
  draw();

  function setPointer(e, active){
    const rect = canvas.getBoundingClientRect();
    if (e.touches && e.touches.length>0){
      pointer.x = e.touches[0].clientX - rect.left;
      pointer.y = e.touches[0].clientY - rect.top;
    } else {
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
    }
    pointer.active = active;
  }
  canvas.addEventListener('mousemove', e => setPointer(e, true));
  canvas.addEventListener('mouseleave', e => setPointer(e, false));
  canvas.addEventListener('touchstart', e => { setPointer(e, true); e.preventDefault(); }, {passive:false});
  canvas.addEventListener('touchmove', e => { setPointer(e, true); e.preventDefault(); }, {passive:false});
  canvas.addEventListener('touchend', e => setPointer(e, false));
}
