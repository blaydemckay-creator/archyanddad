/* Archy & Dad Cactus Co. — "San Pedro Sprint" runner
   Rewards: reward icon = 5% off · collect 25 water + 15 sun = +5% (10% max)
            beat the high score = free shipping. */
(function(){
  const canvas = document.getElementById('game');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = 900, H = 506;
  function resize(){
    const dpr = Math.min(window.devicePixelRatio||1, 2);
    canvas.width = W*dpr; canvas.height = H*dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  resize(); window.addEventListener('resize', resize);

  const C = {
    skyTop:'#fbe6cf', skyBot:'#bfe0e4', hillFar:'#cdb8d4', hillMid:'#9fb88f',
    sand:'#e7cf9f', sandDark:'#d8b87f', groundLine:'#b89a63',
    cactus:'#5a8a4e', cactusDark:'#3f6b3a', cactusLight:'#7aa86a', rib:'#436b3c',
    pot:'#c87a4e', potRim:'#b3683f', water:'#52b4e0', sun:'#f6cf57',
    flower:'#fbfaf4', flowerEdge:'#e6e2d2'
  };

  const FIVE_AT = 550, FLOWER_AT = 700, MOTH_AT = 900;
  const COMBO_WATER = 25, COMBO_SUN = 15, MAX_DISCOUNT = 10;
  const START_LINES = [
    "Press SPACE to begin! Collect 💧 & ☀️ for discounts.",
    "Grab the 🏷️ tag for 5% off — beat my score for free shipping!",
    "Press SPACE to play — jump the roos, emus & crocs!"
  ];
  const DIE_LINES = [
    "Try again — but watch out for the moths! 🦋",
    "The flower gives you flying powers — keep pressing the space bar to fly! 🕊️",
    "So close! Collect 25 💧 + 15 ☀️ in a run for another 5% off.",
    "Have another go — beat the high score for free shipping! 🚚",
    "Fly over the low moths and duck under the high ones!"
  ];

  const ground = H - 80;
  const state = { mode:'start', t:0, speed:300, dist:0, water:0, sun:0, score:0, speedLock:0,
    fiveSpawned:false, fiveGot:false, comboGot:false, bloomed:false, hintShown:false, mothWarned:false };
  let best = 0;
  try{ best = parseInt(localStorage.getItem('sps_best')||'0',10)||0; }catch(e){}

  const player = { x:130, y:ground, vy:0, w:46, h:78, onGround:true, jumps:0, squash:0 };
  const GRAV = 1900, JUMP = 660;
  const OB_TYPES=[
    {type:'kangaroo', w:58, h:64},{type:'emu', w:46, h:74},{type:'croc', w:94, h:30},
    {type:'koala', w:48, h:46},{type:'ranger', w:42, h:70}
  ];
  let obstacles=[], collects=[], clouds=[], bgCacti=[], spawnT=0, collectT=0, mothT=0, tipT=0;
  let bannerTimer=null, bubbleTimer=null;

  const $ = id => document.getElementById(id);
  function showBanner(text, ms){
    const el=$('banner'); if(!el) return;
    el.textContent=text; el.classList.add('show');
    if(bannerTimer) clearTimeout(bannerTimer);
    bannerTimer=setTimeout(()=>el.classList.remove('show'), ms||3500);
  }
  function showBubble(text, ms){
    const el=$('archyBubble'); if(!el) return;
    el.innerHTML='<span class="who">Archy:</span> '+text;
    el.classList.add('show');
    if(bubbleTimer) clearTimeout(bubbleTimer);
    if(ms) bubbleTimer=setTimeout(()=>el.classList.remove('show'), ms);
  }

  function reset(arm){
    Object.assign(state,{mode:'play',t:0,speed:300,dist:0,water:0,sun:0,score:0,armed:!!arm,speedLock:0,
      fiveSpawned:false,fiveGot:false,comboGot:false,bloomed:false,hintShown:false,mothWarned:false});
    player.y=ground; player.vy=0; player.onGround=true; player.jumps=0; player.squash=0;
    obstacles=[]; collects=[]; spawnT=0.8; collectT=0.5; mothT=1.2; tipT=4.5;
    bgCacti=[]; for(let i=0;i<5;i++) bgCacti.push({x:Math.random()*W, s:0.5+Math.random()*0.5});
    clouds=[]; for(let i=0;i<4;i++) clouds.push({x:Math.random()*W, y:40+Math.random()*120, s:0.4+Math.random()*0.6});
    if($('banner')) $('banner').classList.remove('show');
    if($('archyBubble')) $('archyBubble').classList.remove('show');
    if($('startScreen')) $('startScreen').classList.toggle('hidden', !!arm);
    if($('overScreen')) $('overScreen').classList.add('hidden');
    if(!arm) showBubble(START_LINES[Math.floor(Math.random()*START_LINES.length)], 0);
  }

  function jump(){
    if(state.mode!=='play') return;
    if(!state.armed){ state.armed=true; if($('startScreen')) $('startScreen').classList.add('hidden'); if($('archyBubble')) $('archyBubble').classList.remove('show'); }
    if(state.bloomed){
      // flower power: flap to fly — every tap lifts the cactus
      player.vy = -JUMP*0.72; player.onGround=false; player.squash=-0.2;
      return;
    }
    if(player.onGround){ player.vy=-JUMP; player.onGround=false; player.jumps=1; player.squash=-0.25; }
    else if(player.jumps<2){ player.vy=-JUMP*0.85; player.jumps=2; player.squash=-0.25; }
  }

  function currentDiscount(){ return Math.min(MAX_DISCOUNT, (state.fiveGot?5:0)+(state.comboGot?5:0)); }

  function saveReward(discount, freeShipping){
    let prev={discount:0,freeShipping:false};
    try{ prev = JSON.parse(localStorage.getItem('sps_reward')||'{}'); }catch(e){}
    const merged = {
      discount: Math.max(prev.discount||0, discount),
      freeShipping: !!(prev.freeShipping || freeShipping),
      ts: Date.now()
    };
    try{ localStorage.setItem('sps_reward', JSON.stringify(merged)); }catch(e){}
  }

  function gameOver(){
    state.mode='over';
    const prevBest = best;
    const newRecord = state.score > prevBest && state.score>0;
    if(newRecord){ best=state.score; try{localStorage.setItem('sps_best',best);}catch(e){} }
    const discount = currentDiscount();
    const freeShip = newRecord;
    saveReward(discount, freeShip);

    if($('finalScore')) $('finalScore').textContent=state.score;
    if($('finalWater')) $('finalWater').textContent=state.water;
    if($('finalSun')) $('finalSun').textContent=state.sun;
    if($('bestLine')) $('bestLine').textContent=(newRecord?'🏆 New high score! Best: ':'Best: ')+best;

    let rewards=[];
    if(discount>0) rewards.push('🏷️ '+discount+'% off unlocked');
    if(freeShip)   rewards.push('🚚 Free shipping unlocked!');
    if(!rewards.length) rewards.push('Keep running to unlock rewards!');
    if($('rewardLine')) $('rewardLine').innerHTML = rewards.join('<br>');

    if($('overScreen')) $('overScreen').classList.remove('hidden');
    const sm=$('saveMsg'); if(sm) sm.textContent='';
    const ni=$('nameInput'); if(ni){ ni.value=ni.value||''; }
    if(window.SPS && typeof window.SPS.onGameOver==='function'){
      window.SPS.onGameOver({score:state.score, discount, freeShipping:freeShip, newRecord});
    }
    showBubble(DIE_LINES[Math.floor(Math.random()*DIE_LINES.length)], 0);
  }

  function press(e){
    if(e) e.preventDefault();
    if(state.mode==='over'){ reset(true); return; }
    jump();
  }
  window.addEventListener('keydown', e=>{ if(e.code==='Space'||e.code==='ArrowUp'){
    if(document.activeElement && document.activeElement.tagName==='INPUT') return;
    press(e);
  }});
  canvas.addEventListener('mousedown', press);
  canvas.addEventListener('touchstart', press, {passive:false});
  if($('startBtn')) $('startBtn').addEventListener('click', e=>{e.stopPropagation();reset(true);});
  if($('againBtn')) $('againBtn').addEventListener('click', e=>{e.stopPropagation();reset(true);});
  if($('startScreen')){
    $('startScreen').addEventListener('mousedown', e=>{ e.preventDefault(); jump(); });
    $('startScreen').addEventListener('touchstart', e=>{ e.preventDefault(); jump(); }, {passive:false});
  }

  function update(dt){
    if(state.mode!=='play') return;
    state.t+=dt;
    state.speed = state.speedLock ? state.speedLock : (300 + state.t*9);
    const move = state.speed*dt;

    // the cactus runs (and can jump) even before play begins
    player.vy += GRAV*dt; player.y += player.vy*dt;
    if(player.y<90){ player.y=90; if(player.vy<0) player.vy=0; }
    if(player.y>=ground){ player.y=ground; player.vy=0; if(!player.onGround){player.squash=0.3;} player.onGround=true; player.jumps=0; }
    player.squash += (0 - player.squash)*Math.min(1,dt*10);

    // scenery always scrolls so the screen feels alive on load
    bgCacti.forEach(c=>{ c.x-=move*0.35*c.s; if(c.x<-60){c.x=W+Math.random()*120; c.s=0.5+Math.random()*0.5;} });
    clouds.forEach(c=>{ c.x-=move*0.12*c.s; if(c.x<-120){c.x=W+80; c.y=40+Math.random()*120;} });

    if(!state.armed){ return; }   // waiting on the instructions screen

    state.dist += move/26;
    state.score = Math.floor(state.dist) + (state.water+state.sun)*10;

    spawnT -= dt;
    if(spawnT<=0){
      const tp = OB_TYPES[Math.floor(Math.random()*OB_TYPES.length)];
      obstacles.push({x:W+40, w:tp.w, h:tp.h, type:tp.type});
      spawnT = (0.95 + Math.random()*0.85) * (300/state.speed) + 0.4;
    }
    collectT -= dt;
    if(collectT<=0){
      const isSun = Math.random()<0.4;
      collects.push({x:W+30, y:ground-(50+Math.random()*150), type:isSun?'sun':'water', r:14, got:false, bob:Math.random()*6});
      collectT = 0.6 + Math.random()*0.7;
    }
    if(!state.fiveSpawned && state.score>=FIVE_AT){
      state.fiveSpawned=true;
      collects.push({x:W+30, y:ground-58, type:'five', r:24, got:false, bob:0});
    }
    if(state.score>=MOTH_AT){
      if(!state.mothWarned){
        state.mothWarned=true;
        state.speedLock = state.speed*0.82;   // ease off, then hold constant
        showBanner('🦋 Angry cactus moths! Fly over the low ones, duck under the high ones.', 3800);
      }
      mothT -= dt;
      if(mothT<=0){
        obstacles.push({x:W+40, w:40, h:26, type:'moth', ay:25+Math.random()*(ground-95), bob:Math.random()*6});
        mothT = (1.5 + Math.random()*1.3) * (300/state.speed) + 0.5;
      }
    }

    obstacles.forEach(o=>o.x-=move);
    collects.forEach(c=>c.x-=move);
    obstacles=obstacles.filter(o=>o.x>-90);
    collects=collects.filter(c=>c.x>-50 && !c.got);

    const px=player.x-player.w/2+6, py=player.y-player.h, pw=player.w-12, ph=player.h;
    for(const o of obstacles){
      const oy=(o.type==='moth')?o.ay:ground-o.h;
      const pad=(o.type==='moth')?3:6;
      if(px<o.x+o.w-pad && px+pw>o.x+pad && py<oy+o.h && py+ph>oy+pad){ gameOver(); return; }
    }
    for(const c of collects){
      const dx=player.x-c.x, dy=(player.y-player.h/2)-c.y;
      if(Math.hypot(dx,dy)<c.r+30){
        c.got=true;
        if(c.type==='sun') state.sun++;
        else if(c.type==='water') state.water++;
        else if(c.type==='five'){ state.fiveGot=true; showBanner('🏷️ 5% off unlocked! Collect '+COMBO_WATER+'💧 + '+COMBO_SUN+'☀️ for another 5%.', 4200); }
      }
    }
    if(!state.comboGot && state.water>=COMBO_WATER && state.sun>=COMBO_SUN){
      state.comboGot=true;
      showBanner('🏷️ +5% off! You’ve maxed the 10% discount 🎉', 4200);
    }
    if(!state.bloomed && state.score>=FLOWER_AT){ state.bloomed=true; showBanner('🌼 Bloomed! Flower power — keep tapping to FLY! 🕊️', 3800); }

    if($('score')) $('score').textContent=state.score;
    if($('water')) $('water').textContent=state.water;
    if($('sun')) $('sun').textContent=state.sun;
  }

  function roundRect(x,y,w,h,r){
    ctx.beginPath(); ctx.moveTo(x+r,y);
    ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath();
  }
  function drawCactus(){
    const bob = Math.sin(state.t*12)*(player.onGround?2.5:0);
    const sq = player.squash;
    const w = player.w*(1-sq*0.4), h=player.h*(1+sq*0.5);
    const cx = player.x, baseY=player.y+bob;
    ctx.save();
    const potW=w*1.05, potH=26;
    ctx.fillStyle=C.pot; roundRect(cx-potW/2, baseY-potH, potW, potH, 5); ctx.fill();
    ctx.fillStyle=C.potRim; roundRect(cx-potW/2-3, baseY-potH-7, potW+6, 10, 4); ctx.fill();
    const bodyH=h-potH+4, bodyY=baseY-potH-bodyH+6;
    ctx.fillStyle=C.cactus; roundRect(cx-w/2, bodyY, w, bodyH, w/2); ctx.fill();
    ctx.fillStyle=C.cactusDark; roundRect(cx+w*0.12, bodyY+4, w*0.3, bodyH-10, w*0.2); ctx.fill();
    ctx.fillStyle=C.cactusLight; roundRect(cx-w*0.42, bodyY+4, w*0.22, bodyH-10, w*0.18); ctx.fill();
    ctx.strokeStyle=C.rib; ctx.lineWidth=2; ctx.globalAlpha=.5;
    for(let i=-1;i<=1;i++){ ctx.beginPath(); ctx.moveTo(cx+i*w*0.22, bodyY+8); ctx.lineTo(cx+i*w*0.22, bodyY+bodyH-8); ctx.stroke(); }
    ctx.globalAlpha=1;
    ctx.fillStyle=C.cactus;
    roundRect(cx-w/2-12, bodyY+bodyH*0.45, 14, bodyH*0.32, 7); ctx.fill();
    roundRect(cx-w/2-12, bodyY+bodyH*0.18, 12, bodyH*0.32, 6); ctx.fill();
    roundRect(cx+w/2-2, bodyY+bodyH*0.3, 14, bodyH*0.34, 7); ctx.fill();
    roundRect(cx+w/2+0, bodyY+bodyH*0.05, 12, bodyH*0.3, 6); ctx.fill();
    if(state.score>=FLOWER_AT){
      const grow = Math.min(1,(state.score-FLOWER_AT)/40+0.2);
      const pr=8*grow, pw2=5*grow, ph2=9*grow;
      ctx.fillStyle=C.flower; ctx.strokeStyle=C.flowerEdge; ctx.lineWidth=1;
      for(let i=0;i<8;i++){ const a=i/8*Math.PI*2 + state.t*0.6; ctx.beginPath(); ctx.ellipse(cx+Math.cos(a)*pr, bodyY-2+Math.sin(a)*pr, pw2,ph2, a, 0, Math.PI*2); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle='#f6cf57'; ctx.beginPath(); ctx.arc(cx, bodyY-2, 5.5*grow, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle='#d9a93a'; ctx.beginPath(); ctx.arc(cx, bodyY-2, 2.5*grow, 0, Math.PI*2); ctx.fill();
    }
    ctx.fillStyle='#2f3b30';
    const ey=bodyY+bodyH*0.4;
    ctx.beginPath(); ctx.arc(cx-9, ey, 3.2, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx+9, ey, 3.2, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle='#2f3b30'; ctx.lineWidth=2.4; ctx.lineCap='round';
    ctx.beginPath(); ctx.arc(cx, ey+6, 6, 0.15*Math.PI, 0.85*Math.PI); ctx.stroke();
    ctx.fillStyle='rgba(244,155,193,.55)';
    ctx.beginPath(); ctx.arc(cx-13, ey+5, 3.5,0,Math.PI*2); ctx.arc(cx+13, ey+5, 3.5,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }
  function drawBgCactus(x,s){
    const h=70*s, w=20*s, y=ground;
    ctx.fillStyle='rgba(95,130,100,.55)';
    roundRect(x-w/2, y-h, w, h, w/2); ctx.fill();
    roundRect(x-w/2-7*s, y-h*0.55, 8*s, h*0.4, 4); ctx.fill();
    roundRect(x+w/2-1, y-h*0.65, 8*s, h*0.4, 4); ctx.fill();
  }
  function drawKangaroo(x,w,h){
    const y=ground, col='#b97a45', dk='#8f5a30'; ctx.fillStyle=col;
    ctx.beginPath(); ctx.moveTo(x+w*0.55,y); ctx.quadraticCurveTo(x+w*1.08,y, x+w*0.92,y-h*0.22);
    ctx.quadraticCurveTo(x+w*0.72,y-h*0.12, x+w*0.55,y-h*0.18); ctx.closePath(); ctx.fill();
    roundRect(x+w*0.42,y-h*0.42,w*0.26,h*0.42,6); ctx.fill(); ctx.fillRect(x+w*0.3,y-9,w*0.34,9);
    ctx.beginPath(); ctx.ellipse(x+w*0.44,y-h*0.52,w*0.25,h*0.3,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x+w*0.3,y-h*0.66,w*0.15,h*0.22,-0.3,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x+w*0.2,y-h*0.82,w*0.14,h*0.12,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x+w*0.07,y-h*0.8,w*0.08,h*0.06,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=dk;
    ctx.beginPath(); ctx.ellipse(x+w*0.22,y-h*0.97,w*0.035,h*0.09,0.15,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x+w*0.29,y-h*0.97,w*0.035,h*0.09,0.15,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=col; roundRect(x+w*0.24,y-h*0.62,w*0.14,h*0.06,3); ctx.fill();
    ctx.fillStyle='#2f2a25'; ctx.beginPath(); ctx.arc(x+w*0.18,y-h*0.84,2.2,0,Math.PI*2); ctx.fill();
  }
  function drawEmu(x,w,h){
    const y=ground, col='#7d6450', dk='#5a4636', fluff='#9c8268';
    ctx.strokeStyle=dk; ctx.lineWidth=4; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(x+w*0.46,y-h*0.42); ctx.lineTo(x+w*0.4,y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+w*0.62,y-h*0.42); ctx.lineTo(x+w*0.64,y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+w*0.4,y); ctx.lineTo(x+w*0.3,y); ctx.moveTo(x+w*0.64,y); ctx.lineTo(x+w*0.56,y); ctx.stroke();
    ctx.fillStyle=fluff; ctx.beginPath(); ctx.ellipse(x+w*0.56,y-h*0.54,w*0.32,h*0.26,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=col; roundRect(x+w*0.2,y-h*0.92,w*0.12,h*0.5,6); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x+w*0.23,y-h*0.95,w*0.1,h*0.08,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=dk; ctx.beginPath(); ctx.moveTo(x+w*0.13,y-h*0.95); ctx.lineTo(x+w*0.02,y-h*0.93); ctx.lineTo(x+w*0.13,y-h*0.9); ctx.closePath(); ctx.fill();
    ctx.fillStyle='#2f2a25'; ctx.beginPath(); ctx.arc(x+w*0.21,y-h*0.97,2,0,Math.PI*2); ctx.fill();
  }
  function drawCroc(x,w,h){
    const y=ground, col='#6e8a4f', dk='#54703c'; ctx.fillStyle=col;
    roundRect(x+w*0.12,y-h*0.6,w*0.66,h*0.6,7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x+w*0.72,y); ctx.lineTo(x+w,y-h*0.55); ctx.lineTo(x+w*0.78,y-h*0.55); ctx.closePath(); ctx.fill();
    roundRect(x-w*0.02,y-h*0.46,w*0.34,h*0.36,5); ctx.fill();
    ctx.fillRect(x+w*0.2,y-7,w*0.08,9); ctx.fillRect(x+w*0.52,y-7,w*0.08,9);
    ctx.fillStyle=dk;
    for(let i=0;i<4;i++){ const bx=x+w*(0.22+i*0.13); ctx.beginPath(); ctx.moveTo(bx,y-h*0.6); ctx.lineTo(bx+w*0.04,y-h*0.82); ctx.lineTo(bx+w*0.08,y-h*0.6); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle='#fff';
    for(let i=0;i<5;i++){ const tx=x+w*0.02+i*w*0.055; ctx.beginPath(); ctx.moveTo(tx,y-h*0.12); ctx.lineTo(tx+w*0.03,y-h*0.12); ctx.lineTo(tx+w*0.015,y-h*0.02); ctx.closePath(); ctx.fill(); }
    ctx.beginPath(); ctx.arc(x+w*0.14,y-h*0.52,3.4,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#2f2a25'; ctx.beginPath(); ctx.arc(x+w*0.14,y-h*0.52,1.7,0,Math.PI*2); ctx.fill();
  }
  function drawKoala(x,w,h){
    const y=ground, grey='#9aa1a8', dk='#7c838b', nose='#3a3530'; ctx.fillStyle=grey;
    ctx.beginPath(); ctx.ellipse(x+w*0.5,y-h*0.36,w*0.3,h*0.36,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x+w*0.3,y-h*0.72,w*0.16,0,Math.PI*2); ctx.arc(x+w*0.7,y-h*0.72,w*0.16,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=dk; ctx.beginPath(); ctx.arc(x+w*0.3,y-h*0.72,w*0.08,0,Math.PI*2); ctx.arc(x+w*0.7,y-h*0.72,w*0.08,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=grey; ctx.beginPath(); ctx.arc(x+w*0.5,y-h*0.62,w*0.24,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=nose; ctx.beginPath(); ctx.ellipse(x+w*0.5,y-h*0.58,w*0.1,h*0.1,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#2f2a25'; ctx.beginPath(); ctx.arc(x+w*0.39,y-h*0.7,2,0,Math.PI*2); ctx.arc(x+w*0.61,y-h*0.7,2,0,Math.PI*2); ctx.fill();
  }
  function drawRanger(x,w,h){
    const y=ground, khaki='#cabd83', dk='#a89a5f', skin='#e7b78d', hair='#e3cf86', boot='#5b4632';
    ctx.fillStyle=skin; ctx.fillRect(x+w*0.3,y-h*0.3,w*0.13,h*0.3); ctx.fillRect(x+w*0.57,y-h*0.3,w*0.13,h*0.3);
    ctx.fillStyle=boot; ctx.fillRect(x+w*0.27,y-7,w*0.19,9); ctx.fillRect(x+w*0.54,y-7,w*0.19,9);
    ctx.fillStyle=khaki; ctx.fillRect(x+w*0.26,y-h*0.45,w*0.48,h*0.18);
    roundRect(x+w*0.23,y-h*0.78,w*0.54,h*0.36,5); ctx.fill();
    ctx.fillStyle=skin; ctx.fillRect(x+w*0.13,y-h*0.7,w*0.12,h*0.28); ctx.fillRect(x+w*0.75,y-h*0.7,w*0.12,h*0.28);
    ctx.strokeStyle=dk; ctx.lineWidth=1.4; ctx.strokeRect(x+w*0.31,y-h*0.66,w*0.15,h*0.12); ctx.strokeRect(x+w*0.54,y-h*0.66,w*0.15,h*0.12);
    ctx.fillStyle=skin; ctx.beginPath(); ctx.arc(x+w*0.5,y-h*0.86,w*0.16,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=hair; ctx.beginPath(); ctx.arc(x+w*0.5,y-h*0.9,w*0.17,Math.PI,0); ctx.fill();
    ctx.fillStyle='#2f2a25'; ctx.beginPath(); ctx.arc(x+w*0.45,y-h*0.86,1.6,0,Math.PI*2); ctx.arc(x+w*0.55,y-h*0.86,1.6,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#2f2a25'; ctx.lineWidth=1.4; ctx.lineCap='round'; ctx.beginPath(); ctx.arc(x+w*0.5,y-h*0.83,3,0.1*Math.PI,0.9*Math.PI); ctx.stroke();
  }
  function drawMoth(x,ay,w,h,bob){
    const cx=x+w/2, cy=ay+h/2 + Math.sin(state.t*6+(bob||0))*3;
    const flap=Math.sin(state.t*18)*0.4;
    ctx.save(); ctx.translate(cx,cy); ctx.fillStyle='#8a7d5e';
    ctx.save(); ctx.rotate(-0.5-flap); ctx.beginPath(); ctx.ellipse(-8,0,16,10,0,0,Math.PI*2); ctx.fill(); ctx.restore();
    ctx.save(); ctx.rotate(0.5+flap); ctx.beginPath(); ctx.ellipse(8,0,16,10,0,0,Math.PI*2); ctx.fill(); ctx.restore();
    ctx.fillStyle='#6f6347';
    ctx.save(); ctx.rotate(-0.5-flap); ctx.beginPath(); ctx.ellipse(-13,0,5,6,0,0,Math.PI*2); ctx.fill(); ctx.restore();
    ctx.save(); ctx.rotate(0.5+flap); ctx.beginPath(); ctx.ellipse(13,0,5,6,0,0,Math.PI*2); ctx.fill(); ctx.restore();
    ctx.restore();
    ctx.fillStyle='#4a4030'; ctx.beginPath(); ctx.ellipse(cx,cy,5,11,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx,cy-11,4,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#4a4030'; ctx.lineWidth=1.5; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(cx-1,cy-14); ctx.lineTo(cx-5,cy-20); ctx.moveTo(cx+1,cy-14); ctx.lineTo(cx+5,cy-20); ctx.stroke();
    ctx.fillStyle='#e23b3b'; ctx.beginPath(); ctx.arc(cx-2,cy-11,1.7,0,Math.PI*2); ctx.arc(cx+2,cy-11,1.7,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#2f2a25'; ctx.lineWidth=1.4;
    ctx.beginPath(); ctx.moveTo(cx-4.5,cy-14); ctx.lineTo(cx-1,cy-12); ctx.moveTo(cx+4.5,cy-14); ctx.lineTo(cx+1,cy-12); ctx.stroke();
  }
  function drawObstacle(o){
    const x=o.x;
    switch(o.type){
      case 'emu': drawEmu(x,o.w,o.h); break;
      case 'croc': drawCroc(x,o.w,o.h); break;
      case 'koala': drawKoala(x,o.w,o.h); break;
      case 'ranger': drawRanger(x,o.w,o.h); break;
      case 'moth': drawMoth(x,o.ay,o.w,o.h,o.bob); break;
      default: drawKangaroo(x,o.w,o.h);
    }
  }
  function drawFive(x,y){
    ctx.fillStyle='rgba(246,207,87,.3)'; ctx.beginPath(); ctx.arc(x,y,30,0,Math.PI*2); ctx.fill();
    ctx.save(); ctx.translate(x,y); ctx.rotate(-0.25); ctx.fillStyle='#f0a83d';
    ctx.beginPath(); ctx.moveTo(-20,-14); ctx.lineTo(10,-14); ctx.lineTo(22,0); ctx.lineTo(10,14); ctx.lineTo(-20,14); ctx.closePath(); ctx.fill();
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(12,0,3.2,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#fff'; ctx.font='bold 13px Quicksand,Segoe UI,sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('5%', -6, 0); ctx.restore();
  }
  function draw(){
    const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,C.skyTop); g.addColorStop(1,C.skyBot);
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='rgba(246,207,87,.5)'; ctx.beginPath(); ctx.arc(W-120,90,55,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(246,207,87,.85)'; ctx.beginPath(); ctx.arc(W-120,90,38,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.7)';
    clouds.forEach(c=>{ const s=c.s*22; ctx.beginPath(); ctx.arc(c.x,c.y,s,0,Math.PI*2); ctx.arc(c.x+s,c.y+4,s*0.8,0,Math.PI*2); ctx.arc(c.x-s,c.y+5,s*0.7,0,Math.PI*2); ctx.fill(); });
    ctx.fillStyle=C.hillFar; ctx.beginPath(); ctx.moveTo(0,ground-30);
    for(let x=0;x<=W;x+=60){ ctx.lineTo(x, ground-30 - Math.sin((x+state.t*30)*0.01)*22 - 18); }
    ctx.lineTo(W,H); ctx.lineTo(0,H); ctx.fill();
    ctx.fillStyle=C.hillMid; ctx.beginPath(); ctx.moveTo(0,ground-10);
    for(let x=0;x<=W;x+=50){ ctx.lineTo(x, ground-10 - Math.sin((x+state.t*55)*0.014)*16); }
    ctx.lineTo(W,H); ctx.lineTo(0,H); ctx.fill();
    bgCacti.forEach(c=>drawBgCactus(c.x,c.s));
    const gg=ctx.createLinearGradient(0,ground,0,H); gg.addColorStop(0,C.sand); gg.addColorStop(1,C.sandDark);
    ctx.fillStyle=gg; ctx.fillRect(0,ground,W,H-ground);
    ctx.strokeStyle=C.groundLine; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(0,ground); ctx.lineTo(W,ground); ctx.stroke();
    ctx.strokeStyle='rgba(184,154,99,.5)'; ctx.lineWidth=2;
    const off=(state.dist*8)%40;
    for(let x=-off;x<W;x+=40){ ctx.beginPath(); ctx.moveTo(x,ground+22); ctx.lineTo(x+14,ground+22); ctx.stroke(); }
    collects.forEach(c=>{
      const by=c.y+Math.sin(state.t*4+c.bob)*4;
      if(c.type==='sun'){
        ctx.fillStyle=C.sun; ctx.strokeStyle='#e8b836'; ctx.lineWidth=2;
        ctx.beginPath(); for(let i=0;i<8;i++){ const a=i/8*Math.PI*2+state.t; ctx.lineTo(c.x+Math.cos(a)*c.r*1.5, by+Math.sin(a)*c.r*1.5); ctx.lineTo(c.x+Math.cos(a+0.39)*c.r, by+Math.sin(a+0.39)*c.r);} ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.arc(c.x,by,c.r*0.7,0,Math.PI*2); ctx.fillStyle='#fbe08a'; ctx.fill();
      }else if(c.type==='water'){
        ctx.fillStyle=C.water; ctx.strokeStyle='#2e8fbf'; ctx.lineWidth=2;
        ctx.beginPath(); ctx.moveTo(c.x, by-c.r*1.3); ctx.bezierCurveTo(c.x+c.r, by-c.r*0.1, c.x+c.r, by+c.r, c.x, by+c.r); ctx.bezierCurveTo(c.x-c.r, by+c.r, c.x-c.r, by-c.r*0.1, c.x, by-c.r*1.3); ctx.fill();
        ctx.fillStyle='rgba(255,255,255,.6)'; ctx.beginPath(); ctx.ellipse(c.x-c.r*0.3, by+c.r*0.2, 3,5,0,0,Math.PI*2); ctx.fill();
      }else if(c.type==='five'){ drawFive(c.x, by); }
    });
    obstacles.forEach(o=>drawObstacle(o));
    drawCactus();
  }
  let last=performance.now();
  function frame(now){
    let dt=(now-last)/1000; last=now; if(dt>0.05) dt=0.05;
    update(dt); draw(); requestAnimationFrame(frame);
  }
  reset(false);  // open & running on load; first tap/space begins play
  requestAnimationFrame(frame);
})();
