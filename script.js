
document.addEventListener('DOMContentLoaded', () => {
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
});

const observer = new IntersectionObserver((entries)=>{
  for (const e of entries){
    if (e.isIntersecting){ e.target.classList.add('show'); observer.unobserve(e.target); }
  }
},{threshold:0.15});
document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));

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

const navToggle = document.getElementById('nav-toggle');
const backdrop = document.querySelector('.backdrop');
if (backdrop){
  backdrop.addEventListener('click', ()=>{ navToggle.checked = false; });
}

// WebGL background fallback
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
    const c1 = [0.33, 1.0, 0.88];
    const c2 = [0.55, 0.64, 1.0];
    gl.uniform3f(u_c1, c1[0], c1[1], c1[2]);
    gl.uniform3f(u_c2, c2[0], c2[1], c2[2]);
    gl.uniform1f(u_t, time);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(loop);
  }
  loop();
}

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

// Neon Flow-Field
const F = document.getElementById('flowgame');
if (F){
  const ctx = F.getContext('2d');
  let W,H,DPR; let t=0;
  let pointer = {x:0,y:0,down:false,pulse:0};
  const PNUM = 700;
  const parts = [];
  function resize(){
    DPR = Math.min(window.devicePixelRatio||1, 2);
    const r = F.getBoundingClientRect();
    W=r.width; H=r.height;
    F.width = Math.floor(W*DPR); F.height = Math.floor(H*DPR);
    ctx.setTransform(DPR,0,0,DPR,0,0);
  }
  window.addEventListener('resize', resize, {passive:true}); resize();
  function rnd(a,b){ return a + Math.random()*(b-a); }
  for(let i=0;i<PNUM;i++){ parts.push({x:rnd(0,W), y:rnd(0,H), v:rnd(.2,.8), a:rnd(0,Math.PI*2)}); }
  function field(x,y){
    const s=0.0025, n = Math.sin(x*s + t)*Math.cos(y*s*1.2 - t*0.7);
    const m = Math.cos(x*s*0.7 - t*0.4)*Math.sin(y*s + t*0.9);
    let ang = Math.atan2(m, n);
    const dx = x - pointer.x, dy = y - pointer.y;
    const d2 = dx*dx + dy*dy + 1;
    ang += (pointer.down? 1.2:0.6) * Math.exp(-d2/12000) * Math.atan2(dy, dx);
    ang += pointer.pulse * Math.exp(-d2/8000);
    return ang;
  }
  function step(){
    t += 0.016;
    ctx.fillStyle = 'rgba(10,13,18,0.14)';
    ctx.fillRect(0,0,W,H);
    ctx.globalCompositeOperation='lighter';
    for(const p of parts){
      const a = field(p.x,p.y);
      p.a += (a - p.a)*0.2;
      p.x += Math.cos(p.a)*p.v*1.8;
      p.y += Math.sin(p.a)*p.v*1.8;
      if(p.x<0) p.x=W; if(p.x>W) p.x=0; if(p.y<0) p.y=H; if(p.y>H) p.y=0;
      ctx.beginPath();
      ctx.arc(p.x,p.y,0.9,0,Math.PI*2);
      ctx.fillStyle='rgba(141,162,255,0.9)';
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(p.x,p.y);
      ctx.lineTo(p.x - Math.cos(p.a)*6, p.y - Math.sin(p.a)*6);
      ctx.strokeStyle='rgba(85,255,225,0.45)';
      ctx.lineWidth=1;
      ctx.stroke();
    }
    ctx.globalCompositeOperation='source-over';
    requestAnimationFrame(step);
  }
  step();
  function setPoint(e,down){
    const r=F.getBoundingClientRect();
    if(e.touches && e.touches.length){ pointer.x=e.touches[0].clientX-r.left; pointer.y=e.touches[0].clientY-r.top; }
    else { pointer.x=e.clientX-r.left; pointer.y=e.clientY-r.top; }
    pointer.down=down;
  }
  F.addEventListener('mousemove', e=>setPoint(e,true));
  F.addEventListener('mouseleave', e=>setPoint(e,false));
  F.addEventListener('touchstart', e=>{ setPoint(e,true); e.preventDefault(); }, {passive:false});
  F.addEventListener('touchmove', e=>{ setPoint(e,true); e.preventDefault(); }, {passive:false});
  F.addEventListener('touchend', e=>setPoint(e,false));
  let last=0;
  F.addEventListener('click', e=>{
    const now=performance.now();
    if(now-last<300){ pointer.pulse=2; setTimeout(()=>pointer.pulse=0,400); }
    last=now;
  });
}
