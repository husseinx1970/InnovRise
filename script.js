
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

// ---- WebGL Background (GLSL shader) with graceful fallback ----
const canvas = document.getElementById('bgGL');
let gl;
try { gl = canvas.getContext('webgl2', { antialias: true }); } catch(e){}
if (!gl){
  // No WebGL2, show fallback orbs
  document.getElementById('bgFallback').style.display = 'block';
  // Light noise fallback
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

  // Fragment shader: animated soft blobs + subtle lines using noise-ish functions
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
    // glow lines
    float g = abs(sin(uv.y*6.0 + t*0.6))*0.08 + abs(sin((uv.x+uv.y)*3.0 - t*0.5))*0.06;
    vec3 col = mix(c1, c2, b) + g;
    // vignette
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

  function resize(){
    const dpr = Math.min( window.devicePixelRatio || 1, 1.6);
    const w = Math.floor(innerWidth * dpr);
    const h = Math.floor(innerHeight * dpr);
    canvas.width = w; canvas.height = h;
    canvas.style.width = innerWidth + 'px';
    canvas.style.height = innerHeight + 'px';
    gl.viewport(0,0,w,h);
    gl.uniform2f(u_r, w, h);
  }
  window.addEventListener('resize', resize, {passive:true}); resize();

  let start = performance.now();
  function loop(){
    const time = (performance.now()-start)/1000;
    // theme colors from CSS variables
    const styles = getComputedStyle(document.documentElement);
    let c1 = styles.getPropertyValue('--accent').trim() || '#55ffe1';
    let c2 = styles.getPropertyValue('--accent-2').trim() || '#8da2ff';
    function hex3(s){ // convert hex -> vec3
      if (s[0]==='#') s=s.slice(1);
      const r=parseInt(s.slice(0,2),16)/255;
      const g=parseInt(s.slice(2,4),16)/255;
      const b=parseInt(s.slice(4,6),16)/255;
      return [r,g,b];
    }
    const a=hex3(c1), b=hex3(c2);
    gl.uniform3f(u_c1, a[0], a[1], a[2]);
    gl.uniform3f(u_c2, b[0], b[1], b[2]);

    gl.uniform1f(u_t, time);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(loop);
  }
  loop();
}
