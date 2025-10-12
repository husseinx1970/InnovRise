
// year
document.addEventListener('DOMContentLoaded', () => {
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
});

// Grain noise (GPU-safe)
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
      img.data[i+3]=40; // alpha
    }
    gctx.putImageData(img,0,0);
    requestAnimationFrame(draw);
  }
  draw();
}

// Intersection reveal
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
