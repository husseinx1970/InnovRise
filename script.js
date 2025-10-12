
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
if (backdrop){ backdrop.addEventListener('click', ()=>{ navToggle.checked = false; }); }

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

// ---- Neural Particle Playground (Canvas 2D, mobile-friendly) ----
const C = document.getElementById('playground');
if (C){
  const ctx = C.getContext('2d');
  let W,H,DPR;
  let pointer = {x:0,y:0,active:false, burst:0};
  const PNUM = 1200;
  const parts = [];
  function resize(){
    DPR = Math.min(window.devicePixelRatio||1, 1.7);
    W = Math.floor(innerWidth); H = Math.floor(innerHeight);
    C.width = Math.floor(W*DPR); C.height = Math.floor(H*DPR);
    C.style.width = W+'px'; C.style.height = H+'px';
    ctx.setTransform(DPR,0,0,DPR,0,0);
  }
  window.addEventListener('resize', resize, {passive:true}); resize();
  function rnd(a,b){ return a + Math.random()*(b-a); }
  for(let i=0;i<PNUM;i++){ parts.push({x:rnd(0,W), y:rnd(0,H), vx:rnd(-.2,.2), vy:rnd(-.2,.2), life:rnd(60,180)}); }

  let lastMove = performance.now();
  function field(x,y,t){
    const s = 0.0018;
    const n = Math.sin(x*s + t*0.8)*Math.cos(y*s*1.3 - t*0.6);
    const m = Math.cos(x*s*0.7 - t*0.4)*Math.sin(y*s + t*0.9);
    let fx = n*0.6 + m*0.4;
    let fy = m*0.6 - n*0.4;
    if(pointer.active){
      const dx = x - pointer.x, dy = y - pointer.y, d2 = dx*dx + dy*dy + 1;
      const k = 2200/d2;
      fx -= dx * k; fy -= dy * k;
    }
    fx += (Math.random()-0.5)*0.02; fy += (Math.random()-0.5)*0.02;
    return {fx,fy};
  }

  function draw(t){
    t/=1000;
    ctx.fillStyle = 'rgba(11,15,22,0.18)'; // motion trail
    ctx.fillRect(0,0,W,H);
    ctx.globalCompositeOperation='lighter';

    // idle: morph to rings after 12s
    const idle = Math.max(0, Math.min(1, (performance.now()-lastMove - 12000)/3000 ));
    const cx = W/2, cy = H/2;

    for(const p of parts){
      const f = field(p.x,p.y,t);
      p.vx += f.fx*0.6; p.vy += f.fy*0.6;
      p.vx *= 0.96; p.vy *= 0.96;
      p.x += p.vx; p.y += p.vy;
      if(p.x<0) p.x+=W; if(p.x>W) p.x-=W;
      if(p.y<0) p.y+=H; if(p.y>H) p.y-=H;

      // idle pull to rings
      if(idle>0){
        const dx = p.x - cx, dy = p.y - cy;
        const r = Math.sqrt(dx*dx+dy*dy)+0.0001;
        const targetR = (Math.sin((p.x+p.y)*0.01)+1)*0.5>0.5 ? Math.min(W,H)*0.22 : Math.min(W,H)*0.42;
        const pull = (targetR - r)*0.0008*idle;
        p.vx += (dx/r)*pull; p.vy += (dy/r)*pull;
      }

      // burst impulse
      if(pointer.burst>0){
        const dx = p.x - pointer.x, dy = p.y - pointer.y;
        const d2 = dx*dx + dy*dy + 1;
        const imp = 1800/d2 * pointer.burst;
        p.vx += dx*imp; p.vy += dy*imp;
      }

      // draw particle & trail line
      ctx.beginPath();
      ctx.arc(p.x,p.y,0.8,0,Math.PI*2);
      ctx.fillStyle='rgba(141,162,255,0.85)';
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(p.x,p.y);
      ctx.lineTo(p.x - p.vx*6, p.y - p.vy*6);
      ctx.strokeStyle='rgba(85,255,225,0.5)';
      ctx.lineWidth=1;
      ctx.stroke();
    }
    pointer.burst *= 0.9;
    ctx.globalCompositeOperation='source-over';
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);

  function setPoint(e,active){
    const r = C.getBoundingClientRect();
    if(e.touches && e.touches.length){ pointer.x = e.touches[0].clientX - r.left; pointer.y = e.touches[0].clientY - r.top; }
    else { pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top; }
    pointer.active = active;
    lastMove = performance.now();
  }
  C.addEventListener('mousemove', e=>setPoint(e,true));
  C.addEventListener('mouseleave', e=>setPoint(e,false));
  C.addEventListener('touchstart', e=>{ setPoint(e,true); }, {passive:true});
  C.addEventListener('touchmove', e=>{ setPoint(e,true); }, {passive:true});
  C.addEventListener('touchend', e=>{ pointer.active=false; });
  // click burst
  let last=0;
  C.addEventListener('click', e=>{ const n=performance.now(); if(n-last<320){ pointer.burst=1.0; } last=n; });
}
