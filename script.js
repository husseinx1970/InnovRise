
// Footer year
document.addEventListener('DOMContentLoaded', () => {
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
});

// Mouse glow
const glow = document.getElementById('mouse-glow');
window.addEventListener('pointermove', (e)=>{
  const x = (e.clientX/window.innerWidth)*100;
  const y = (e.clientY/window.innerHeight)*100;
  glow.style.setProperty('--mx', x+'%');
  glow.style.setProperty('--my', y+'%');
});

// Starfield with parallax layers + twinkle + occasional shooting stars
const canvas = document.getElementById('bg');
const ctx = canvas.getContext('2d', { alpha: true });
let layers = [];
let mouse = {x: 0, y: 0};
let lastShoot = 0;

function resize(){
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  initLayers();
}
window.addEventListener('resize', resize);
resize();

function initLayers(){
  layers = [
    makeLayer(180, 0.06, 0.2), // far
    makeLayer(120, 0.12, 0.4), // mid
    makeLayer(70,  0.22, 0.7)  // near
  ];
}

function rand(a,b){return a+Math.random()*(b-a)}

function makeLayer(count, speed, twinkle){
  const stars = [];
  for(let i=0;i<count;i++){
    stars.push({
      x: Math.random()*canvas.width,
      y: Math.random()*canvas.height,
      r: rand(0.4,1.9),
      a: rand(0.25,0.85),
      s: speed*rand(0.8,1.4),
      t: Math.random()*Math.PI*2,
    });
  }
  return {stars, speed, twinkle};
}

window.addEventListener('pointermove', (e)=>{
  mouse.x = (e.clientX / window.innerWidth - 0.5);
  mouse.y = (e.clientY / window.innerHeight - 0.5);
});

function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // soft color halo
  const g = ctx.createRadialGradient(canvas.width*.8, canvas.height*.2, 0, canvas.width*.8, canvas.height*.2, canvas.width*.6);
  g.addColorStop(0,'rgba(122,92,255,.08)');
  g.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0,0,canvas.width,canvas.height);

  layers.forEach((L,i)=>{
    for (const p of L.stars){
      // movement
      p.x -= (L.speed*1.6) + mouse.x*0.8*(i+1);
      p.y += (L.speed*0.6) + mouse.y*0.6*(i+1);

      // wrap
      if (p.x < -5) p.x = canvas.width+5;
      if (p.y > canvas.height+5) p.y = -5;

      // twinkle
      p.t += 0.02 + L.twinkle*0.02;
      const tw = 0.5 + Math.sin(p.t)*0.5;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r*(0.7+tw*0.6), 0, Math.PI*2);
      ctx.fillStyle = `rgba(${140+tw*80|0},${200+tw*30|0},255,${p.a})`;
      ctx.fill();
    }
  });

  // shooting star every 3–6 seconds
  const now = performance.now();
  if (now - lastShoot > rand(3000,6000)){
    lastShoot = now;
    shoot();
  }

  requestAnimationFrame(draw);
}

function shoot(){
  // make a bright streak
  const sx = canvas.width * rand(0.3,1);
  const sy = canvas.height * rand(0,0.4);
  const len = rand(180,320);
  const ang = rand(Math.PI*0.9, Math.PI*1.2); // leaning to left/down
  const vx = Math.cos(ang)*6;
  const vy = Math.sin(ang)*6;
  let life = 0;
  function step(){
    life += 1;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(140,220,255,'+(1-life/40)+')';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx + vx*life, sy + vy*life);
    ctx.lineTo(sx + vx*life - Math.cos(ang)*len, sy + vy*life - Math.sin(ang)*len);
    ctx.stroke();
    ctx.restore();
    if (life<40) requestAnimationFrame(step);
  }
  step();
}
draw();

// Tilt cards (subtle 3D)
const tilts = document.querySelectorAll('.tilt');
tilts.forEach(el=>{
  el.addEventListener('pointermove', (e)=>{
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left)/r.width - 0.5;
    const y = (e.clientY - r.top)/r.height - 0.5;
    el.style.transform = `rotateY(${x*8}deg) rotateX(${-y*8}deg) translateY(-2px)`;
  });
  el.addEventListener('pointerleave', ()=>{
    el.style.transform = 'rotateY(0deg) rotateX(0deg) translateY(0)';
  });
});
