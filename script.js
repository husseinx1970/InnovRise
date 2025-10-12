// Footer year
document.addEventListener('DOMContentLoaded', () => {
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
});

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

// WebGL background (soft shader) with graceful fallback
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
  in vec2 a; void main(){ gl_Position = vec4(a,0.0,1.0); }`;
  const frag = `#version 300 es
  precision highp float; out vec4 o;
  uniform vec2 r; uniform float t; uniform vec3 c1; uniform vec3 c2;
  float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
  float n(vec2 p){ vec2 i=floor(p), f=fract(p);
    float a=h(i), b=h(i+vec2(1,0)), c=h(i+vec2(0,1)), d=h(i+vec2(1,1));
    vec2 u=f*f*(3.0-2.0*f);
    return mix(a,b,u.x)+ (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
  }
  float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<5;i++){ v+=a*n(p); p*=2.02; a*=0.5;} return v; }
  void main(){
    vec2 uv=(gl_FragCoord.xy-0.5*r)/r.y;
    float m=fbm(uv*1.5+vec2(0.1*t,0.07*t)); float b=smoothstep(0.35,0.85,m);
    float g=abs(sin(uv.y*6.0+t*0.6))*0.08+abs(sin((uv.x+uv.y)*3.0-t*0.5))*0.06;
    vec3 col=mix(c1,c2,b)+g; float v=smoothstep(1.2,0.2,length(uv)); col*=v; o=vec4(col,1.0);
  }`;
  function compile(type, src){ const s=gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s);
    if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw gl.getShaderInfoLog(s); return s; }
  function program(vs, fs){ const p=gl.createProgram(); gl.attachShader(p,vs); gl.attachShader(p,fs); gl.linkProgram(p);
    if(!gl.getProgramParameter(p, gl.LINK_STATUS)) throw gl.getProgramInfoLog(p); return p; }
  const vs=compile(gl.VERTEX_SHADER, vert), fs=compile(gl.FRAGMENT_SHADER, frag), prog=program(vs,fs); gl.useProgram(prog);
  const buf=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
  const loc=gl.getAttribLocation(prog,'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
  const u_r=gl.getUniformLocation(prog,'r'), u_t=gl.getUniformLocation(prog,'t'), u_c1=gl.getUniformLocation(prog,'c1'), u_c2=gl.getUniformLocation(prog,'c2');
  function resizeBG(){ const dpr=Math.min(window.devicePixelRatio||1,1.6); const w=Math.floor(innerWidth*dpr), h=Math.floor(innerHeight*dpr);
    canvasBG.width=w; canvasBG.height=h; canvasBG.style.width=innerWidth+'px'; canvasBG.style.height=innerHeight+'px';
    gl.viewport(0,0,w,h); gl.uniform2f(u_r,w,h); }
  addEventListener('resize', resizeBG, {passive:true}); resizeBG();
  let start=performance.now();
  function loop(){ const time=(performance.now()-start)/1000;
    const a=[0.333,1.0,0.882], b=[0.553,0.635,1.0]; gl.uniform3f(u_c1,a[0],a[1],a[2]); gl.uniform3f(u_c2,b[0],b[1],b[2]);
    gl.uniform1f(u_t,time); gl.drawArrays(gl.TRIANGLE_STRIP,0,4); requestAnimationFrame(loop); }
  loop();
}

// ---- Interactive "InnovRise Particles" mini-game ----
const canvas = document.getElementById('playground');
if (canvas){
  const ctx = canvas.getContext('2d');
  let W, H, DPR;
  let lastInteraction = performance.now();
  const particles = [];
  const N = 1500; // زيادة عدد الجسيمات
  let targets = [];
  let pointer = {x:0, y:0, active:false};
  let explodeUntil = 0;
  let lastTap = 0;
  const IDLE_DELAY = 3000; // 3 seconds

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
  
  // تهيئة الجسيمات
  for(let i=0;i<N;i++){
    particles.push({
      x:rand(0,W), 
      y:rand(0,H), 
      vx:rand(-0.3,0.3), 
      vy:rand(-0.3,0.3), 
      r:rand(1.0,2.0), 
      t: -1,
      baseRadius: rand(1.0,2.0),
      opacity: rand(0.7, 1.0)
    });
  }

  function buildTextTargets(){
    const off = document.createElement('canvas');
    const padding = 40; // هامش حول النص
    off.width = Math.floor(W); 
    off.height = Math.floor(H);
    const octx = off.getContext('2d');
    
    // تنظيف canvas
    octx.clearRect(0,0,off.width,off.height);
    
    // إعداد النص
    octx.fillStyle = '#ffffff';
    octx.textBaseline = 'middle';
    octx.textAlign = 'center';
    
    const text = 'InnovRise';
    const maxWidth = W - (padding * 2);
    const maxHeight = H - (padding * 2);
    
    // تحديد حجم الخط المناسب
    let fontSize = 100;
    let textWidth, textHeight;
    
    do {
      fontSize -= 2;
      octx.font = `900 ${fontSize}px "Space Grotesk", Arial, sans-serif`;
      textWidth = octx.measureText(text).width;
      textHeight = fontSize;
    } while ((textWidth > maxWidth || textHeight > maxHeight) && fontSize > 20);
    
    console.log('Font size:', fontSize, 'Text width:', textWidth);
    
    const x = W / 2;
    const y = H / 2;
    
    // رسم النص
    octx.fillText(text, x, y);
    
    // استخراج بيانات البكسل
    const imageData = octx.getImageData(0, 0, off.width, off.height);
    const data = imageData.data;
    
    targets = [];
    const step = 2; // كثافة عالية
    
    for (let y = 0; y < off.height; y += step) {
      for (let x = 0; x < off.width; x += step) {
        const index = (y * off.width + x) * 4;
        const alpha = data[index + 3];
        
        if (alpha > 128) { // إذا كان البكسل جزء من النص
          targets.push({x, y});
        }
      }
    }
    
    console.log('Targets found:', targets.length);
    
    // إذا كان لدينا عدد كبير من النقاط، نأخذ عينة عشوائية
    if (targets.length > N) {
      const shuffled = [...targets].sort(() => Math.random() - 0.5);
      targets = shuffled.slice(0, N);
    }
    
    // إذا كان عدد النقاط أقل من الجسيمات، نكرر النقاط
    while (targets.length < N) {
      targets = targets.concat(targets);
    }
    targets = targets.slice(0, N);
    
    console.log('Final targets:', targets.length);
  }

  function draw(){
    const now = performance.now();
    const idle = (!pointer.active && (now - lastInteraction) > IDLE_DELAY);
    
    // مسح الخلفية مع شفافية قليلة لتأثير الذيل
    ctx.fillStyle = 'rgba(10, 15, 30, 0.1)';
    ctx.fillRect(0, 0, W, H);

    // خلفية متدرجة
    const gradient = ctx.createRadialGradient(
      W/2, H/2, 50,
      W/2, H/2, Math.max(W, H)/2
    );
    gradient.addColorStop(0, 'rgba(100, 120, 255, 0.15)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);

    // التحكم في سلوك الجسيمات
    if (idle && targets.length > 0) {
      // وضع الخمول: تشكيل اسم الشركة
      for (let i = 0; i < particles.length; i++) {
        if (i < targets.length) {
          particles[i].t = i;
        } else {
          particles[i].t = -1;
        }
      }
    } else {
      // الوضع التفاعلي
      for (let p of particles) p.t = -1;
    }

    // رسم وتحديث الجسيمات
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      
      if (p.t >= 0 && explodeUntil < now && targets[p.t]) {
        // جذب الجسيم نحو موقعه في النص
        const target = targets[p.t];
        const dx = target.x - p.x;
        const dy = target.y - p.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 1) {
          const force = Math.min(distance * 0.05, 2);
          p.vx += (dx / distance) * force;
          p.vy += (dy / distance) * force;
        }
        
        p.r = p.baseRadius * 1.3;
      } else {
        p.r = p.baseRadius;
        
        // تفاعل مع المؤشر
        if (pointer.active) {
          const dx = pointer.x - p.x;
          const dy = pointer.y - p.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 150) {
            const force = (150 - distance) * 0.0005;
            p.vx += dx * force;
            p.vy += dy * force;
          }
        } else {
          // جذب خفيف نحو المركز
          const dx = W/2 - p.x;
          const dy = H/2 - p.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance > 100) {
            p.vx += dx * 0.0001;
            p.vy += dy * 0.0001;
          }
        }
      }
      
      // تطبيق الاحتكاك
      p.vx *= 0.95;
      p.vy *= 0.95;
      
      // تحديث الموقع
      p.x += p.vx;
      p.y += p.vy;
      
      // ارتداد من الحواف
      const margin = 20;
      if (p.x < margin) { p.x = margin; p.vx *= -0.8; }
      if (p.x > W - margin) { p.x = W - margin; p.vx *= -0.8; }
      if (p.y < margin) { p.y = margin; p.vy *= -0.8; }
      if (p.y > H - margin) { p.y = H - margin; p.vy *= -0.8; }

      // رسم الجسيم
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(100, 200, 255, ${p.opacity})`;
      ctx.fill();
    }

    // رسم الروابط بين الجسيمات القريبة
    ctx.strokeStyle = 'rgba(100, 150, 255, 0.3)';
    ctx.lineWidth = 0.5;
    
    for (let i = 0; i < particles.length; i += 3) {
      const p1 = particles[i];
      
      for (let j = i + 3; j < particles.length; j += 6) {
        const p2 = particles[j];
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const distance = dx * dx + dy * dy;
        
        if (distance < 2500) { // 50px
          ctx.globalAlpha = (1 - distance / 2500) * 0.4;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
    
    requestAnimationFrame(draw);
  }

  // بدء الرسم
  setTimeout(() => {
    draw();
  }, 100);

  function setPointer(e, active){
    const rect = canvas.getBoundingClientRect();
    if (e.touches && e.touches.length>0){
      pointer.x = e.touches[0].clientX - rect.left;
      pointer.y = e.touches[0].clientY - rect.top;
    } else {
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
    }
    pointer.active = active;
    lastInteraction = performance.now();
  }

  function explode(){
    const now = performance.now();
    explodeUntil = now + 1000;
    for (const p of particles){
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.t = -1;
    }
    lastInteraction = now;
  }

  // أحداث الماوس
  canvas.addEventListener('mousemove', e => setPointer(e, true));
  canvas.addEventListener('mouseleave', e => setPointer(e, false));
  canvas.addEventListener('mousedown', e => setPointer(e, true));
  canvas.addEventListener('mouseup', e => setPointer(e, false));
  canvas.addEventListener('dblclick', explode);
  
  // أحداث اللمس
  canvas.addEventListener('touchstart', e => {
    const now = Date.now();
    if (now - lastTap < 300) explode();
    lastTap = now;
    setPointer(e, true);
    e.preventDefault();
  }, {passive: false});
  
  canvas.addEventListener('touchmove', e => {
    setPointer(e, true);
    e.preventDefault();
  }, {passive: false});
  
  canvas.addEventListener('touchend', e => setPointer(e, false));

  // اختبار: إظهار النص بعد تحميل الصفحة
  setTimeout(() => {
    lastInteraction = performance.now() - IDLE_DELAY - 1000;
  }, 2000);
}

// Mobile menu
const navToggle = document.getElementById('nav-toggle');
const backdrop = document.querySelector('.backdrop');
document.querySelectorAll('.nav-links a').forEach(a => a.addEventListener('click', ()=>{ 
  if(navToggle) navToggle.checked=false; 
}));
if (backdrop) backdrop.addEventListener('click', ()=>{ 
  if(navToggle) navToggle.checked=false; 
});