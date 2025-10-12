
// Footer year
document.addEventListener('DOMContentLoaded', () => {
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
});

// Subtle tech background
const bg = document.getElementById('bgGL');
const gl = bg.getContext('2d');
function resizeBG(){ bg.width = innerWidth; bg.height = innerHeight; }
addEventListener('resize', resizeBG, {passive:true}); resizeBG();
let t=0;
(function loop(){
  t+=0.006;
  const g = gl.createLinearGradient(0,0, bg.width, bg.height);
  g.addColorStop(0, `rgba(141,162,255,0.08)`);
  g.addColorStop(1, `rgba(85,255,225,0.06)`);
  gl.fillStyle = g; gl.fillRect(0,0,bg.width,bg.height);
  requestAnimationFrame(loop);
})();

// Constant "InnovRise" particles
const canvas = document.getElementById('playground');
if (canvas){
  const ctx = canvas.getContext('2d');
  let W, H, DPR;
  const particles = [];
  const N = 1100;
  let targets = [];
  let jitter = 0;

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
    particles.push({x:rand(0,W), y:rand(0,H), vx:0, vy:0, r:rand(1.2,2.3), t: i});
  }

  function buildTextTargets(){
    const off = document.createElement('canvas');
    off.width = Math.floor(W); off.height = Math.floor(H);
    const octx = off.getContext('2d');
    octx.clearRect(0,0,off.width,off.height);
    octx.fillStyle = '#fff';
    octx.textBaseline = 'middle';

    // Fit-to-box
    const text = 'InnovRise';
    let size = Math.min(W*0.9, H*0.55);
    const PAD = W*0.06;
    octx.font = `800 ${size}px "Space Grotesk", Inter, system-ui`;
    let tw = octx.measureText(text).width;
    while ((tw + PAD*2) > W && size > 8){
      size *= 0.96;
      octx.font = `800 ${size}px "Space Grotesk", Inter, system-ui`;
      tw = octx.measureText(text).width;
    }
    const x = (W - tw)/2;
    const y = H/2;
    octx.fillText(text, x, y);

    const step = Math.max(3, Math.floor(size/26));
    targets = [];
    const img = octx.getImageData(0,0,off.width,off.height).data;
    for (let j=0;j<off.height;j+=step){
      for (let i=0;i<off.width;i+=step){
        const idx = (j*off.width + i)*4 + 3;
        if (img[idx] > 0){
          targets.push({x:i + rand(-0.5,0.5), y:j + rand(-0.5,0.5)});
        }
      }
    }
    for (let i=0;i<particles.length;i++){
      particles[i].t = i % targets.length;
    }
  }

  function draw(){
    ctx.clearRect(0,0,W,H);

    // soft glow background inside the card
    const g = ctx.createRadialGradient(W/2,H/2,10,W/2,H/2,Math.max(W,H)/1.2);
    g.addColorStop(0,'rgba(141,162,255,0.14)');
    g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);

    jitter += 0.004;
    for (let i=0;i<particles.length;i++){
      const p = particles[i];
      const T = targets[p.t % targets.length];
      if (T){
        const dx = (T.x + Math.sin(jitter + i*0.02)*0.8) - p.x;
        const dy = (T.y + Math.cos(jitter*1.3 + i*0.02)*0.8) - p.y;
        p.vx += dx * 0.06; p.vy += dy * 0.06;
      }
      p.vx *= 0.85; p.vy *= 0.85;
      p.x += p.vx; p.y += p.vy;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(85,255,225,0.95)';
      ctx.fill();
    }

    // linking (light)
    for (let i=0;i<particles.length; i+=6){
      const p = particles[i];
      for (let j=i+6;j<particles.length; j+=24){
        const q = particles[j];
        const dx = p.x - q.x, dy = p.y - q.y;
        const d2 = dx*dx + dy*dy;
        if (d2 < 130*130){
          ctx.globalAlpha = Math.max(0, 1 - d2/(130*130)) * 0.35;
          ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(q.x,q.y);
          ctx.strokeStyle = '#8da2ff'; ctx.lineWidth = 1;
          ctx.stroke(); ctx.globalAlpha=1;
        }
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
}
