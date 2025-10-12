
// Set year in footer
document.addEventListener('DOMContentLoaded', () => {
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
});

// Minimal particles on canvas (no deps)
const canvas = document.getElementById('bg');
const ctx = canvas.getContext('2d');
let particles = [];

function resize(){ canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.addEventListener('resize', resize); resize();

function spawnParticles(n){
  for(let i=0;i<n;i++){
    particles.push({
      x: Math.random()*canvas.width,
      y: Math.random()*canvas.height,
      r: Math.random()*1.6+0.4,
      vx: (Math.random()-.5)*0.3,
      vy: (Math.random()-.5)*0.3,
      a: Math.random()*0.6+0.2
    });
  }
}

function step(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  // glow halo
  const g = ctx.createRadialGradient(canvas.width*.8, canvas.height*.2, 0, canvas.width*.8, canvas.height*.2, canvas.width*.6);
  g.addColorStop(0,'rgba(122,92,255,.08)');
  g.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // particles
  for (const p of particles){
    p.x += p.vx; p.y += p.vy;
    if (p.x<0||p.x>canvas.width) p.vx*=-1;
    if (p.y<0||p.y>canvas.height) p.vy*=-1;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
    ctx.fillStyle = `rgba(145,210,255,${p.a})`;
    ctx.fill();
  }

  // connecting lines
  for (let i=0;i<particles.length;i++){
    for (let j=i+1;j<particles.length;j++){
      const a = particles[i], b = particles[j];
      const dx=a.x-b.x, dy=a.y-b.y;
      const d = Math.hypot(dx,dy);
      if (d<120){
        ctx.strokeStyle = `rgba(90,180,255,${(120-d)/120*0.08})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }

  requestAnimationFrame(step);
}

spawnParticles(90);
step();
