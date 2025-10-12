
// year
document.addEventListener('DOMContentLoaded', () => {
  const y = document.getElementById('year'); if (y) y.textContent = new Date().getFullYear();
});
// reveal
const observer = new IntersectionObserver((entries)=>{ for (const e of entries){ if (e.isIntersecting){ e.target.classList.add('show'); observer.unobserve(e.target);} } },{threshold:0.15});
document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));
// close menu on backdrop
const navToggle = document.getElementById('nav-toggle'); const backdrop = document.querySelector('.backdrop'); if (backdrop){ backdrop.addEventListener('click', ()=>{ navToggle.checked=false; }); }
// KPI counters
const kpis = document.querySelectorAll('.kpi span[data-kpi]'); const kpiObs = new IntersectionObserver((entries)=>{ for(const e of entries){ if(e.isIntersecting){ const el=e.target; const target=+el.dataset.kpi; let cur=0; const step=Math.max(1, Math.floor(target/60)); const id=setInterval(()=>{ cur+=step; if(cur>=target){cur=target; clearInterval(id);} el.textContent=cur.toLocaleString(); },18); kpiObs.unobserve(el);} } },{threshold:0.6}); kpis.forEach(el=>kpiObs.observe(el));

// Hyperspace WebGL
const H = document.getElementById('hyperspace');
if (H){
  const gl = H.getContext('webgl2');
  const vert = `#version 300 es
  in vec2 a; void main(){ gl_Position = vec4(a,0.0,1.0); }`;
  const frag = `#version 300 es
  precision highp float; out vec4 o; uniform vec2 r; uniform float t; uniform vec2 mouse; uniform float boost;
  float hash(float n){ return fract(sin(n)*43758.5453123); }
  float noise(vec3 x){ vec3 p=floor(x), f=fract(x); f=f*f*(3.0-2.0*f); float n=p.x+p.y*57.0+113.0*p.z;
    return mix(mix(mix(hash(n+0.0),hash(n+1.0),f.x), mix(hash(n+57.0),hash(n+58.0),f.x), f.y),
               mix(mix(hash(n+113.0),hash(n+114.0),f.x), mix(hash(n+170.0),hash(n+171.0),f.x), f.y), f.z); }
  void main(){ vec2 uv=(gl_FragCoord.xy-0.5*r)/r.y; vec2 m=(mouse-0.5)*1.6; uv+=m*0.25; float spd=0.8+boost*1.6;
    float ang=atan(uv.y,uv.x); float rad=length(uv); float stripes=sin(10.0*ang + t*4.0*spd)*0.04; float depth=1.0/(rad+0.15+stripes);
    float st=noise(vec3(uv*12.0, t*2.0))*0.7;
    vec3 col=mix(vec3(0.05,0.07,0.11), vec3(0.53,0.66,1.0), depth*0.4);
    col += vec3(0.33,1.0,0.88)*depth*0.55; col += st*0.15; col *= smoothstep(1.4,0.2,rad); o=vec4(col,1.0); }`;
  function compile(type,src){ const s=gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s); if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw gl.getShaderInfoLog(s); return s; }
  function program(vs,fs){ const p=gl.createProgram(); gl.attachShader(p,vs); gl.attachShader(p,fs); gl.linkProgram(p); if(!gl.getProgramParameter(p,gl.LINK_STATUS)) throw gl.getProgramInfoLog(p); return p; }
  const vs=compile(gl.VERTEX_SHADER,vert); const fs=compile(gl.FRAGMENT_SHADER,frag); const P=program(vs,fs); gl.useProgram(P);
  const quad=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,quad); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  const loc=gl.getAttribLocation(P,'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
  const u_r=gl.getUniformLocation(P,'r'), u_t=gl.getUniformLocation(P,'t'), u_m=gl.getUniformLocation(P,'mouse'), u_b=gl.getUniformLocation(P,'boost');
  function resize(){ const dpr=Math.min(window.devicePixelRatio||1,1.7); const rect=H.getBoundingClientRect(); H.width=Math.floor(rect.width*dpr); H.height=Math.floor(rect.height*dpr); gl.viewport(0,0,H.width,H.height); gl.uniform2f(u_r,H.width,H.height); }
  addEventListener('resize', resize, {passive:true}); resize();
  let mx=0.5,my=0.5, start=performance.now(), boost=0.0;
  function loop(){ const time=(performance.now()-start)/1000; gl.uniform1f(u_t,time); gl.uniform2f(u_m,mx,my); gl.uniform1f(u_b,boost); gl.drawArrays(gl.TRIANGLE_STRIP,0,4); boost*=0.96; requestAnimationFrame(loop); } loop();
  function setM(e){ const r=H.getBoundingClientRect(); if(e.touches&&e.touches.length){ mx=(e.touches[0].clientX-r.left)/r.width; my=1.0-(e.touches[0].clientY-r.top)/r.height; } else { mx=(e.clientX-r.left)/r.width; my=1.0-(e.clientY-r.top)/r.height; } }
  H.addEventListener('mousemove', setM); H.addEventListener('touchstart', e=>{setM(e); e.preventDefault();},{passive:false}); H.addEventListener('touchmove', e=>{setM(e); e.preventDefault();},{passive:false});
  let last=0; H.addEventListener('click', ()=>{ const n=performance.now(); if(n-last<320){ boost=1.0; } last=n; });
}
