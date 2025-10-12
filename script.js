
// Footer year
document.addEventListener('DOMContentLoaded', () => {
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
});

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

// WebGL background (shader) with graceful fallback
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
        img.data[i+3]=28;
      }
      gctx.putImageData(img,0,0);
      requestAnimationFrame(draw);
    }
    draw();
  }
} else {
  document.getElementById('bgFallback').style.display = 'none';
  const vert = `#version 300 es
  in vec2 a; void main(){ gl_Position = vec4(a,0.0,1.0); }`;
  const frag = `#version 300 es
  precision highp float; out vec4 o;
  uniform vec2 r; uniform float t; uniform vec3 c1; uniform vec3 c2;
  float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
  float n(vec2 p){ vec2 i=floor(p), f=fract(p);
    float a=h(i), b=h(i+vec2(1,0)), c=h(i+vec2(0,1)), d=h(i+vec2(1,1));
    vec2 u=f*f*(3.0-2.0*f);
    return mix(a,b,u.x)+ (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
  }
  float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<5;i++){ v+=a*n(p); p*=2.02; a*=0.5;} return v; }
  void main(){
    vec2 uv=(gl_FragCoord.xy-0.5*r)/r.y;
    float m=fbm(uv*1.5+vec2(0.1*t,0.07*t)); float b=smoothstep(0.35,0.85,m);
    float g=abs(sin(uv.y*6.0+t*0.6))*0.08+abs(sin((uv.x+uv.y)*3.0-t*0.5))*0.06;
    vec3 col=mix(c1,c2,b)+g; float v=smoothstep(1.2,0.2,length(uv)); col*=v; o=vec4(col,1.0);
  }`;
  function compile(type, src){ const s=gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s);
    if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw gl.getShaderInfoLog(s); return s; }
  function program(vs, fs){ const p=gl.createProgram(); gl.attachShader(p,vs); gl.attachShader(p,fs); gl.linkProgram(p);
    if(!gl.getProgramParameter(p, gl.LINK_STATUS)) throw gl.getProgramInfoLog(p); return p; }
  const vs=compile(gl.VERTEX_SHADER, vert), fs=compile(gl.FRAGMENT_SHADER, frag), prog=program(vs,fs); gl.useProgram(prog);
  const buf=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
  const loc=gl.getAttribLocation(prog,'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
  const u_r=gl.getUniformLocation(prog,'r'), u_t=gl.getUniformLocation(prog,'t'), u_c1=gl.getUniformLocation(prog,'c1'), u_c2=gl.getUniformLocation(prog,'c2');
  function resizeBG(){ const dpr=Math.min(window.devicePixelRatio||1,1.6); const w=Math.floor(innerWidth*dpr), h=Math.floor(innerHeight*dpr);
    canvasBG.width=w; canvasBG.height=h; canvasBG.style.width=innerWidth+'px'; canvasBG.style.height=innerHeight+'px';
    gl.viewport(0,0,w,h); gl.uniform2f(u_r,w,h); }
  addEventListener('resize', resizeBG, {passive:true}); resizeBG();
  let start=performance.now();
  function loop(){ const time=(performance.now()-start)/1000;
    const a=[0.333,1.0,0.882]; const b=[0.553,0.635,1.0]; // #55ffe1 & #8da2ff
    gl.uniform3f(u_c1,a[0],a[1],a[2]); gl.uniform3f(u_c2,b[0],b[1],b[2]);
    gl.uniform1f(u_t,time); gl.drawArrays(gl.TRIANGLE_STRIP,0,4); requestAnimationFrame(loop); }
  loop();
}

// ---- Interactive "InnovRise Particles" mini-game ----
const canvas = document.getElementById('playground');
if (canvas){
  const ctx = canvas.getContext('2d');
  let W, H, DPR;
  let lastMove = performance.now();
  const particles = [];
  const N = 900;
  let targets = [];
  let pointer = {x:0, y:0, active:false};
  let explodeUntil = 0;
  let lastTap = 0;

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
  resize();

  function rand(a,b){ return a + Math.random()*(b-a); }
  for(let i=0;i<N;i++){
    particles.push({x:rand(0,W), y:rand(0,H), vx:rand(-0.6,0.6), vy:rand(-0.6,0.6), r:rand(1.5,2.8), t: -1});
  }

  function buildTextTargets(){
    const off = document.createElement('canvas');
    off.width = Math.floor(W); off.height = Math.floor(H);
    const octx = off.getContext('2d');
    octx.clearRect(0,0,off.width,off.height);
    octx.fillStyle = '#fff';
    const base = Math.min(W*0.7, H*0.36);
    octx.font = `700 ${base}px "Space Grotesk", Inter, system-ui`;
    const text = 'InnovRise';
    const tw = octx.measureText(text).width;
    const x = (W - tw)/2;
    const y = (H + base*0.75)/2 - base*0.15;
    octx.fillText(text, x, y);

    const step = Math.max(4, Math.floor(base/26));
    targets = [];
    const img = octx.getImageData(0,0,off.width,off.height).data;
    for (let j=0;j<off.height;j+=step){
      for (let i=0;i<off.width;i+=step){
        const idx = (j*off.width + i)*4 + 3;
        if (img[idx] > 0){
          targets.push({x:i, y:j});
        }
      }
    }
    if (targets.length > particles.length) targets = targets.slice(0, particles.length);
  }

  function draw(){
    const now = performance.now();
    const idle = (now - lastMove) > 1600;
    ctx.clearRect(0,0,W,H);

    const g = ctx.createRadialGradient(W/2,H/2,10,W/2,H/2,Math.max(W,H)/1.2);
    g.addColorStop(0,'rgba(141,162,255,0.14)');
    g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);

    if (idle && targets.length){
      for (let i=0;i<targets.length;i++){ particles[i].t = i; }
    } else {
      for (let p of particles) p.t = -1;
    }

    for (let i=0;i<particles.length;i++){
      const p = particles[i];

      if (p.t >= 0 && explodeUntil < now){
        const T = targets[p.t];
        const dx = T.x - p.x, dy = T.y - p.y;
        p.vx += dx * 0.01; p.vy += dy * 0.01;
      } else {
        if (pointer.active){
          const dx = (pointer.x - p.x), dy = (pointer.y - p.y);
          const dist2 = dx*dx + dy*dy + 60;
          const f = 1600 / dist2;
          p.vx += f * dx / Math.sqrt(dist2);
          p.vy += f * dy / Math.sqrt(dist2);
        } else {
          const dx = (W/2 - p.x), dy = (H/2 - p.y);
          p.vx += dx * 0.0006; p.vy += dy * 0.0006;
        }
      }

      const damping = (p.t>=0) ? 0.90 : 0.985;
      p.vx *= damping; p.vy *= damping;
      p.x += p.vx; p.y += p.vy;

      if (p.x<0||p.x>W) p.vx*=-1;
      if (p.y<0||p.y>H) p.vy*=-1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(85,255,225,0.95)';
      ctx.fill();
    }

    for (let i=0;i<particles.length; i+=6){
      const p = particles[i];
      for (let j=i+6;j<particles.length; j+=24){
        const q = particles[j];
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
    lastMove = performance.now();
  }

  function explode(){
    const now = performance.now();
    explodeUntil = now + 900;
    for (const p of particles){
      const angle = Math.random()*Math.PI*2;
      const speed = 4 + Math.random()*4;
      p.vx += Math.cos(angle)*speed;
      p.vy += Math.sin(angle)*speed;
      p.t = -1;
    }
  }

  canvas.addEventListener('mousemove', e => setPointer(e, true));
  canvas.addEventListener('mouseleave', e => setPointer(e, false));
  canvas.addEventListener('mousedown', e => setPointer(e, true));
  canvas.addEventListener('mouseup', e => setPointer(e, false));
  canvas.addEventListener('dblclick', e => explode());

  canvas.addEventListener('touchstart', e => {
    const now = Date.now();
    if (now - lastTap < 300) explode();
    lastTap = now;
    setPointer(e, true);
  }, {passive:false});
  canvas.addEventListener('touchmove', e => { setPointer(e, true); e.preventDefault(); }, {passive:false});
  canvas.addEventListener('touchend', e => setPointer(e, false));
}

// Mobile menu: close when clicking backdrop or link
const navToggle = document.getElementById('nav-toggle');
const backdrop = document.querySelector('.backdrop');
document.querySelectorAll('.nav-links a').forEach(a => a.addEventListener('click', ()=>{ if(navToggle) navToggle.checked=false; }));
if (backdrop) backdrop.addEventListener('click', ()=>{ if(navToggle) navToggle.checked=false; });
