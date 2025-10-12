// footer year
document.addEventListener('DOMContentLoaded', ()=>{ const y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear(); });

// background subtle gradient motion (very light)
(function bg(){
  const c=document.getElementById('bg'); if(!c) return; const g=c.getContext('2d');
  let W,H,DPR; function rs(){DPR=window.devicePixelRatio||1; W=innerWidth; H=innerHeight; c.width=W*DPR; c.height=H*DPR; c.style.width=W+'px'; c.style.height=H+'px'; g.setTransform(DPR,0,0,DPR,0,0);} rs(); addEventListener('resize',rs,{passive:true});
  (function loop(){ const grd=g.createRadialGradient(W*0.5,W*0.1,50,W*0.5,W*1.0,Math.max(W,H)); grd.addColorStop(0,'#0e1320'); grd.addColorStop(0.45,'#0b0f16'); grd.addColorStop(0.8,'#120e1d'); grd.addColorStop(1,'#1a1130'); g.fillStyle=grd; g.fillRect(0,0,W,H); requestAnimationFrame(loop); })();
})();

// mobile drawer backdrop close
const navToggle=document.getElementById('nav-toggle'); const backdrop=document.querySelector('.backdrop'); if(backdrop){backdrop.addEventListener('click',()=>{navToggle.checked=false;});}

// -------- Orbit Particles Playground (inside the square) --------
(function game(){
  const C=document.getElementById('play'); if(!C) return; const ctx=C.getContext('2d');
  let W=300,H=300,DPR=1; const PNUM=1000, parts=[]; let pointer={x:0,y:0,active:false,burst:0}; let lastMove=performance.now(); const IDLE_MS=3000;
  function size(){ const r=C.getBoundingClientRect(); DPR=Math.min(window.devicePixelRatio||1,1.8); W=Math.max(160,Math.floor(r.width)); H=Math.max(160,Math.floor(r.height)); C.width=W*DPR; C.height=H*DPR; ctx.setTransform(DPR,0,0,DPR,0,0); }
  new ResizeObserver(size).observe(C); setTimeout(size,0); addEventListener('resize',size,{passive:true});

  function rnd(a,b){ return a+Math.random()*(b-a); }
  for(let i=0;i<PNUM;i++){ parts.push({x:rnd(0,400),y:rnd(0,400),vx:rnd(-.2,.2),vy:rnd(-.2,.2)}); }

  // target points for INNOVRISE
  let targets=[];
  function buildTargets(){
    const off=document.createElement('canvas'); const g=off.getContext('2d');
    const scale=Math.min(W, H); off.width=Math.floor(scale*3); off.height=Math.floor(scale*1.4);
    g.clearRect(0,0,off.width,off.height); g.fillStyle='#fff'; g.textAlign='center'; g.textBaseline='middle';
    const fontSize=Math.floor(scale*0.32); g.font=`${fontSize}px "Space Grotesk", Inter, Arial`; g.fillText('INNOVRISE', off.width/2, off.height/2);
    const img=g.getImageData(0,0,off.width,off.height).data; const pts=[]; const step=Math.max(4, Math.floor(scale*0.02));
    for(let y=0;y<off.height;y+=step){ for(let x=0;x<off.width;x+=step){ const i=(y*off.width + x)*4; if(img[i+3]>128){ const tx=(W-off.width)/2 + x; const ty=(H-off.height)/2 + y; pts.push({x:tx,y:ty}); } } }
    targets=pts;
  }
  buildTargets();

  function field(x,y,t){
    const s=0.006, n=Math.sin(x*s + t*0.8)*Math.cos(y*s*1.3 - t*0.6), m=Math.cos(x*s*0.7 - t*0.4)*Math.sin(y*s + t*0.9);
    let fx=n*0.5 + m*0.4, fy=m*0.5 - n*0.4;
    const b = 0.5 + 0.5*Math.sin(t*0.25); fx*=b; fy*=b;
    if(pointer.active){ const dx=x-pointer.x, dy=y-pointer.y, d2=dx*dx+dy*dy+80; const k=1200/d2; fx -= dx*k; fy -= dy*k; }
    fx += (Math.random()-0.5)*0.015; fy += (Math.random()-0.5)*0.015; return {fx,fy};
  }
  let assignIndex=0; function targetFor(i){ if(!targets.length) return null; return targets[(i+assignIndex)%targets.length]; }

  function draw(ts){
    const t=ts/1000; ctx.fillStyle='rgba(10,14,20,0.22)'; ctx.fillRect(0,0,W,H); ctx.globalCompositeOperation='lighter';
    const idle = Math.max(0, Math.min(1, (performance.now()-lastMove - IDLE_MS)/1200 ));
    for(let i=0;i<parts.length;i++){
      const p=parts[i]; const f=field(p.x,p.y,t); p.vx += f.fx*0.55; p.vy += f.fy*0.55;
      if(idle>0 && targets.length){ const tgt=targetFor(i); const dx=tgt.x-p.x, dy=tgt.y-p.y; p.vx += dx*0.0022*idle; p.vy += dy*0.0022*idle; }
      if(pointer.burst>0){ const dx=p.x-pointer.x, dy=p.y-pointer.y; const d2=dx*dx+dy*dy+1; const imp=1600/d2*pointer.burst; p.vx += dx*imp; p.vy += dy*imp; }
      p.vx*=0.964; p.vy*=0.964; p.x+=p.vx; p.y+=p.vy; if(p.x<0)p.x+=W; if(p.x>W)p.x-=W; if(p.y<0)p.y+=H; if(p.y>H)p.y-=H;
      ctx.beginPath(); ctx.arc(p.x,p.y,0.8,0,Math.PI*2); ctx.fillStyle='rgba(141,162,255,0.9)'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(p.x - p.vx*6, p.y - p.vy*6); ctx.strokeStyle='rgba(85,255,225,0.5)'; ctx.lineWidth=1; ctx.stroke();
    }
    pointer.burst *= 0.9; ctx.globalCompositeOperation='source-over'; requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);

  function setPoint(e,active){
    const r=C.getBoundingClientRect();
    if(e.touches && e.touches.length){ pointer.x=e.touches[0].clientX - r.left; pointer.y=e.touches[0].clientY - r.top; }
    else { pointer.x=e.clientX - r.left; pointer.y=e.clientY - r.top; }
    pointer.active=active; lastMove=performance.now();
  }
  C.addEventListener('mousemove', e=>setPoint(e,true));
  C.addEventListener('mouseleave', e=>setPoint(e,false));
  C.addEventListener('touchstart', e=>{ setPoint(e,true); }, {passive:true});
  C.addEventListener('touchmove', e=>{ setPoint(e,true); }, {passive:true});
  C.addEventListener('touchend', e=>{ pointer.active=false; });
  let lastTap=0; C.addEventListener('click', e=>{ const n=performance.now(); if(n-lastTap<320){ pointer.burst=1.0; } lastTap=n; });
  addEventListener('resize', ()=>{ buildTargets(); }, {passive:true});
})();
