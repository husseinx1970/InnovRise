
// Footer year
document.addEventListener('DOMContentLoaded', () => {
  const y = document.getElementById('year'); if (y) y.textContent = new Date().getFullYear();
});

// Preloader handling
window.addEventListener('load', () => {
  setTimeout(()=>{
    const pre = document.getElementById('preloader');
    if (pre){ pre.style.opacity = '0'; pre.style.transition='opacity .6s ease'; setTimeout(()=> pre.remove(), 650); }
  }, 900);
});

// Reveal on scroll
const observer = new IntersectionObserver((entries)=>{
  for (const e of entries){
    if (e.isIntersecting){ e.target.classList.add('show'); observer.unobserve(e.target); }
  }
},{threshold:0.15});
document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));

// Close mobile menu when tapping backdrop
const navToggle = document.getElementById('nav-toggle');
const backdrop = document.querySelector('.backdrop');
if (backdrop){ backdrop.addEventListener('click', ()=>{ navToggle.checked = false; drawerBlip(); }); }

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

// KPI counters
const kpis = document.querySelectorAll('.kpi span[data-kpi]');
const kpiObs = new IntersectionObserver((entries)=>{
  for(const e of entries){
    if(e.isIntersecting){
      const el = e.target; const target = +el.dataset.kpi;
      let cur = 0; const step = Math.max(1, Math.floor(target/60));
      const id = setInterval(()=>{
        cur += step;
        if(cur >= target){ cur = target; clearInterval(id); }
        el.textContent = cur.toLocaleString();
      }, 18);
      kpiObs.unobserve(el);
    }
  }
},{threshold:0.6});
kpis.forEach(el=>kpiObs.observe(el));

// ---- WebGL Neural Quantum Field ----
const canvasBG = document.getElementById('bgGL');
let gl;
try { gl = canvasBG.getContext('webgl2', { antialias: true }); } catch(e){}
if (gl){
  const vert = `#version 300 es
  in vec2 a; void main(){ gl_Position = vec4(a,0.0,1.0); }`;
  const frag = `#version 300 es
  precision highp float; out vec4 o;
  uniform vec2 r; uniform float t; uniform vec2 m; uniform float idle;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
  float noise(vec2 p){ vec2 i=floor(p), f=fract(p);
    float a=hash(i), b=hash(i+vec2(1,0)), c=hash(i+vec2(0,1)), d=hash(i+vec2(1,1));
    vec2 u=f*f*(3.0-2.0*f); return mix(a,b,u.x)+ (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y; }
  float fbm(vec2 p){ float v=0.,a=.5; for(int i=0;i<6;i++){ v+=a*noise(p); p*=2.02; a*=.5;} return v; }
  float ring(vec2 uv, float rad, float thick){ float d = abs(length(uv)-rad); return smoothstep(thick, 0., d); }
  void main(){
    vec2 uv = (gl_FragCoord.xy - 0.5*r) / r.y;
    // attractor by mouse
    vec2 c = (m - 0.5) * vec2(r.x/r.y, -1.0);
    float attract = 1.0 / (1.0 + 14.0*length(uv-c));
    float f = fbm(uv*1.6 + vec2(0.1*t, -0.07*t)) + attract*0.6;
    // base color
    vec3 a = vec3(0.05,0.07,0.12);
    vec3 b = vec3(0.33,1.0,0.88);
    vec3 c2= vec3(0.55,0.64,1.0);
    vec3 col = mix(a, mix(c2,b, f), 0.9);
    // idle morph to logo rings
    float l = ring(uv, 0.42, 0.02)*idle + ring(uv, 0.22, 0.015)*idle;
    col += vec3(0.33,1.0,0.88)*l*0.9;
    // vignette
    col *= smoothstep(1.25, 0.25, length(uv));
    o = vec4(col,1.0);
  }`;
  function compile(type,src){ const s=gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s); if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw gl.getShaderInfoLog(s); return s; }
  function program(vs,fs){ const p=gl.createProgram(); gl.attachShader(p,vs); gl.attachShader(p,fs); gl.linkProgram(p); if(!gl.getProgramParameter(p,gl.LINK_STATUS)) throw gl.getProgramInfoLog(p); return p; }
  const vs = compile(gl.VERTEX_SHADER, vert);
  const fs = compile(gl.FRAGMENT_SHADER, frag);
  const P = program(vs, fs); gl.useProgram(P);
  const quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(P, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
  const u_r = gl.getUniformLocation(P,'r'), u_t=gl.getUniformLocation(P,'t'), u_m=gl.getUniformLocation(P,'m'), u_idle=gl.getUniformLocation(P,'idle');
  function resize(){ const dpr = Math.min(window.devicePixelRatio||1, 1.6); const w = Math.floor(innerWidth*dpr), h = Math.floor(innerHeight*dpr);
    canvasBG.width = w; canvasBG.height = h; canvasBG.style.width=innerWidth+'px'; canvasBG.style.height=innerHeight+'px';
    gl.viewport(0,0,w,h); gl.uniform2f(u_r, w, h); }
  addEventListener('resize', resize, {passive:true}); resize();
  let start = performance.now(), mx=0.5, my=0.5, idle=0.0, lastMove=performance.now();
  function loop(){ const time=(performance.now()-start)/1000;
    gl.uniform1f(u_t, time); gl.uniform2f(u_m, mx, my);
    // after 12s idle, morph to logo rings
    idle = Math.min(1, Math.max(0, (performance.now()-lastMove - 12000)/3000 ));
    gl.uniform1f(u_idle, idle);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(loop);
  } loop();
  function setM(e){ const w = innerWidth, h = innerHeight; if(e.touches&&e.touches.length){ mx=e.touches[0].clientX/w; my=1-(e.touches[0].clientY/h); } else { mx=e.clientX/w; my=1-e.clientY/h; } lastMove=performance.now(); }
  window.addEventListener('mousemove', setM); window.addEventListener('touchstart', setM, {passive:true}); window.addEventListener('touchmove', setM, {passive:true});
}

// ---- Audio: ambient hum + drawer blips + Synth voice via Web Speech API ----
let audioEnabled = false;
let ctx, master, humOsc1, humOsc2, humGain;
function initAudio(){
  if (audioEnabled) return;
  audioEnabled = true;
  try{
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.6; master.connect(ctx.destination);
    // ambient hum
    humGain = ctx.createGain(); humGain.gain.value = 0.0; humGain.connect(master);
    humOsc1 = ctx.createOscillator(); humOsc1.type='sine'; humOsc1.frequency.value = 54; humOsc1.connect(humGain); humOsc1.start();
    humOsc2 = ctx.createOscillator(); humOsc2.type='triangle'; humOsc2.frequency.value = 108; humOsc2.connect(humGain); humOsc2.start();
    // fade in hum
    const now = ctx.currentTime; humGain.gain.cancelScheduledValues(now); humGain.gain.setValueAtTime(0.0, now); humGain.gain.linearRampToValueAtTime(0.06, now+2.2);
    // speak synth voice once
    try {
      const utter = new SpeechSynthesisUtterance("Welcome to InnovRise — where future intelligence begins.");
      utter.lang = 'en-US';
      utter.rate = 0.96; utter.pitch = 1.35; utter.volume = 0.8;
      speechSynthesis.speak(utter);
    } catch(e){ /* ignore */ }
    // toggle UI
    const btn = document.getElementById('audio-toggle'); if (btn){ btn.textContent = '🔊 Sound On'; btn.classList.add('on'); }
  } catch(e){ console.log('Audio init failed', e); }
}
function stopAudio(){
  if (!audioEnabled || !ctx) return;
  const now = ctx.currentTime; humGain.gain.cancelScheduledValues(now); humGain.gain.linearRampToValueAtTime(0.0, now+0.4);
  const btn = document.getElementById('audio-toggle'); if (btn){ btn.textContent = '🔇 Sound Off'; btn.classList.remove('on'); }
}
function drawerBlip(){
  if (!ctx) return; const o = ctx.createOscillator(); const g = ctx.createGain(); o.type='sine'; o.frequency.value=780; g.gain.value=0.0; o.connect(g); g.connect(master);
  const n=ctx.currentTime; g.gain.setValueAtTime(0.0,n); g.gain.linearRampToValueAtTime(0.08,n+0.02); g.gain.exponentialRampToValueAtTime(0.0001,n+0.25); o.start(); o.stop(n+0.3);
}

// Audio UI
const audioBtn = document.getElementById('audio-toggle');
if (audioBtn){
  audioBtn.addEventListener('click', ()=>{
    if (!audioEnabled) { initAudio(); } else { stopAudio(); }
  });
}
// Also enable audio on first user gesture anywhere
['click','touchstart','keydown'].forEach(ev => window.addEventListener(ev, ()=>{ if(!audioEnabled){ initAudio(); } }, {once:true, passive:true}));

// Holographic welcome text: gentle glow pulse
const welcome = document.getElementById('welcome-text');
if (welcome){
  let t=0; function tick(){ t+=0.016; welcome.style.textShadow = `0 0 ${10+Math.sin(t)*6}px rgba(141,162,255,.55)`; requestAnimationFrame(tick); } tick();
}
