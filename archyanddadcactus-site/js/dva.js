/* Archy & Dad — DAD VS ARCHY, a 2-player hotseat tank duel (just for fun)
   Weapons (press B / button to cycle): Normal · 💣 Bouncy Bomb · ✸ Cluster Bomb */
(function(){
  const cv = document.getElementById('dvaCanvas');
  if(!cv) return;
  const ctx = cv.getContext('2d');
  const W = 900, H = 506;
  cv.width = W; cv.height = H;

  const WIN_TO = 3;
  const ARCHY = { name:'Archy', x:120, body:'#e0473c', cap:'#2c2c2c', dir:1 };
  const DAD   = { name:'Dad',   x:W-120, body:'#f08a24', cap:'#e07b16', dir:-1 };
  const WEAPONS=['normal','bounce','cluster','nuke','mg'];

  let terrain = [];
  const S = {
    mode:'start',           // start | aim | fire | resolve | over
    turn:'archy',
    angle:45, power:55, wind:0,
    scoreA:0, scoreD:0,
    shots:[], flashes:[], turnHit:false,
    winner:'', weapon:'normal', nuke:null, nukeResult:null,
    aDir:0, pDir:0
  };

  function genTerrain(){
    terrain = new Array(W);
    const base = H-70;
    const a1=18+Math.random()*14, a2=10+Math.random()*10;
    const p1=0.006+Math.random()*0.003, p2=0.013+Math.random()*0.004, ph=Math.random()*6;
    const hillH = 80+Math.random()*40;
    for(let x=0;x<W;x++){
      let y = base - Math.sin(x*p1+ph)*a1 - Math.sin(x*p2)*a2;
      const d=(x-W/2)/150; y -= hillH*Math.exp(-d*d);
      terrain[x]=y;
    }
  }
  function groundY(x){ x=Math.max(0,Math.min(W-1,Math.round(x))); return terrain[x]; }
  function placeTanks(){ ARCHY.y=groundY(ARCHY.x); DAD.y=groundY(DAD.x); }
  function carveCrater(cx,cy,r){
    const x0=Math.max(0,Math.floor(cx-r)), x1=Math.min(W-1,Math.ceil(cx+r));
    for(let x=x0;x<=x1;x++){
      const dx=x-cx, dd=r*r-dx*dx; if(dd<=0) continue;
      const bottom=cy+Math.sqrt(dd);
      if(bottom>terrain[x]) terrain[x]=Math.min(H-4, bottom);
    }
  }
  function newWind(){ S.wind = Math.round((Math.random()*2-1)*90); }

  function activeTank(){ return S.turn==='archy'?ARCHY:DAD; }
  function enemyTank(){ return S.turn==='archy'?DAD:ARCHY; }

  function startMatch(){
    S.scoreA=0; S.scoreD=0; S.turn='archy'; S.winner='';
    genTerrain(); placeTanks(); newWind();
    S.angle=45; S.power=55; S.shots=[]; S.flashes=[]; S.turnHit=false; S.weapon='normal'; S.nuke=null; S.nukeResult=null;
    S.mode='aim';
  }

  function barrelTip(t){
    const rad = S.angle*Math.PI/180; const len = 30;
    return { x: t.x + Math.cos(rad)*len*t.dir, y: t.y-22 - Math.sin(rad)*len,
             ux: Math.cos(rad)*t.dir, uy: -Math.sin(rad) };
  }

  function fire(){
    if(S.mode!=='aim') return;
    const t=activeTank(); const b=barrelTip(t); const v=S.power*9;
    S.turnHit=false;
    if(S.weapon==='mg'){ S.shots=[]; S.mgTime=0; S.mgCD=0; S.mode='mg'; return; }
    const base={ x:b.x, y:b.y, vx:b.ux*v, vy:b.uy*v };
    if(S.weapon==='bounce') S.shots=[Object.assign({},base,{kind:'bounce',bounces:0})];
    else if(S.weapon==='cluster') S.shots=[Object.assign({},base,{kind:'cluster',split:false})];
    else if(S.weapon==='nuke') S.shots=[Object.assign({},base,{kind:'nuke'})];
    else S.shots=[Object.assign({},base,{kind:'normal'})];
    S.mode='fire';
  }

  function explode(x,y,max,hit){ S.flashes.push({x:x,y:y,r:4,max:max}); carveCrater(x,y,max); if(hit) S.turnHit=true; }

  function toggleWeapon(){ if(S.mode!=='aim') return; const i=WEAPONS.indexOf(S.weapon); S.weapon=WEAPONS[(i+1)%WEAPONS.length]; }
  function weaponLabel(w){ return w==='bounce'?'💣 Bouncy Bomb':(w==='cluster'?'✸ Cluster Bomb':(w==='nuke'?'☢️ Nuke (hit=win, miss=both lose!)':(w==='mg'?'🔫 Machine Gun (4s burst)':'Normal'))); }

  function endShot(hit){
    if(hit){
      if(S.turn==='archy') S.scoreA++; else S.scoreD++;
      if(S.scoreA>=WIN_TO || S.scoreD>=WIN_TO){
        S.winner = S.scoreA>S.scoreD?'Archy':'Dad'; S.mode='over'; return;
      }
    }
    S.turn = S.turn==='archy'?'dad':'archy';
    newWind(); S.angle=45; S.power=55; S.shots=[];
    S.mode='aim';
  }

  // ---------- input ----------
  function press(code,down){
    if(code==='Space'){
      if(down){ if(S.mode==='start'||S.mode==='over') startMatch(); else if(S.mode==='aim') fire(); }
      return;
    }
    if(code==='KeyB'){ if(down) toggleWeapon(); return; }
    if(code==='ArrowLeft'||code==='KeyA') S.aDir=down?-1:(S.aDir<0?0:S.aDir);
    else if(code==='ArrowRight'||code==='KeyD') S.aDir=down?1:(S.aDir>0?0:S.aDir);
    else if(code==='ArrowUp'||code==='KeyW') S.pDir=down?1:(S.pDir>0?0:S.pDir);
    else if(code==='ArrowDown'||code==='KeyS') S.pDir=down?-1:(S.pDir<0?0:S.pDir);
  }
  window.addEventListener('keydown', e=>{ if(['Space','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].indexOf(e.code)>=0) e.preventDefault(); press(e.code,true); });
  window.addEventListener('keyup', e=>press(e.code,false));
  cv.addEventListener('pointerdown', ()=>{ if(S.mode==='start'||S.mode==='over') startMatch(); else if(S.mode==='aim') fire(); });
  window.DVA = {
    aim:d=>{ S.aDir=d; }, aimStop:()=>{ S.aDir=0; },
    pow:d=>{ S.pDir=d; }, powStop:()=>{ S.pDir=0; },
    fire:()=>{ if(S.mode==='start'||S.mode==='over') startMatch(); else fire(); },
    weapon:()=>{ toggleWeapon(); return S.weapon; }
  };

  // ---------- update ----------
  let last=performance.now();
  function stepShots(dt){
    const next=[];
    for(const sh of S.shots){
      sh.vy += 560*dt; sh.vx += S.wind*dt; sh.x += sh.vx*dt; sh.y += sh.vy*dt;
      if(sh.kind==='cluster' && !sh.split && sh.vy>=0){
        for(let k=-2;k<=2;k++) next.push({kind:'frag', x:sh.x, y:sh.y, vx:sh.vx*0.6+k*70, vy:sh.vy-60});
        continue;
      }
      const en=enemyTank();
      const hitR = sh.kind==='bounce' ? (12+sh.bounces*5) : (sh.kind==='frag'?18:(sh.kind==='nuke'?30:(sh.kind==='mg'?13:24)));
      if(Math.hypot(sh.x-en.x, sh.y-(en.y-14))<hitR){
        const max = sh.kind==='bounce'?Math.min(100,22+sh.bounces*9):(sh.kind==='frag'?26:(sh.kind==='nuke'?120:(sh.kind==='mg'?10:42)));
        explode(sh.x, sh.y, max, true); if(sh.kind==='nuke') S.nuke='win'; continue;
      }
      if(sh.x<-30||sh.x>W+30){ if(sh.kind==='nuke') S.nuke='miss'; continue; }
      if(sh.y>=groundY(sh.x)){
        if(sh.kind==='bounce'){
          sh.bounces++;
          const xi=Math.round(sh.x);
          let nx=(groundY(Math.min(W-1,xi+3))-groundY(Math.max(0,xi-3)))/6, ny=-1;
          const nl=Math.hypot(nx,ny)||1; nx/=nl; ny/=nl;
          const dot=sh.vx*nx+sh.vy*ny;
          sh.vx=(sh.vx-2*dot*nx)*0.68; sh.vy=(sh.vy-2*dot*ny)*0.68;
          sh.y=groundY(sh.x)-4;
          if(Math.hypot(sh.vx,sh.vy)<60 || sh.bounces>16){ explode(sh.x,groundY(sh.x),16,false); continue; }
          next.push(sh); continue;
        } else {
          const max=(sh.kind==='frag'?26:(sh.kind==='nuke'?70:(sh.kind==='mg'?8:42)));
          explode(sh.x, Math.min(sh.y,groundY(sh.x)), max, false); if(sh.kind==='nuke') S.nuke='miss'; continue;
        }
      }
      next.push(sh);
    }
    S.shots=next;
  }
  function spawnMG(){
    const t=activeTank(); const b=barrelTip(t); const v=Math.max(60,S.power*9);
    const j=(Math.random()*2-1)*0.05;
    const ux=b.ux*Math.cos(j)-b.uy*Math.sin(j), uy=b.ux*Math.sin(j)+b.uy*Math.cos(j);
    S.shots.push({kind:'mg', x:b.x, y:b.y, vx:ux*v, vy:uy*v});
  }
  function step(now){
    const dt=Math.min(0.04,(now-last)/1000); last=now;

    for(let i=S.flashes.length-1;i>=0;i--){ const f=S.flashes[i]; f.r+=150*dt; if(f.r>=f.max) S.flashes.splice(i,1); }

    if(S.mode==='aim'){
      S.angle=Math.max(15,Math.min(85,S.angle+S.aDir*55*dt));
      S.power=Math.max(10,Math.min(100,S.power+S.pDir*42*dt));
    } else if(S.mode==='mg'){
      S.angle=Math.max(15,Math.min(85,S.angle+S.aDir*55*dt));
      S.power=Math.max(10,Math.min(100,S.power+S.pDir*42*dt));
      S.mgTime+=dt;
      if(S.mgTime<4){ S.mgCD-=dt; if(S.mgCD<=0){ spawnMG(); S.mgCD=0.08; } }
      stepShots(dt);
      if(S.mgTime>=4 && S.shots.length===0) S.mode='resolve';
    } else if(S.mode==='fire'){
      stepShots(dt);
      if(S.shots.length===0) S.mode='resolve';
    } else if(S.mode==='resolve'){
      if(S.flashes.length===0){
        placeTanks();
        if(S.nuke==='win'){ S.winner=(S.turn==='archy'?'Archy':'Dad'); S.nukeResult='win'; S.nuke=null; S.mode='over'; }
        else if(S.nuke==='miss'){ S.winner='Nobody'; S.nukeResult='miss'; S.nuke=null; S.mode='over'; }
        else endShot(S.turnHit);
      }
    }
    draw();
    requestAnimationFrame(step);
  }

  // ---------- draw ----------
  function sky(){ const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'#bfe0f5'); g.addColorStop(1,'#e9f6ff'); ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='rgba(255,255,255,.85)'; cloud(180,80,1); cloud(680,60,.8); }
  function cloud(x,y,s){ ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.beginPath();ctx.arc(0,0,22,0,7);ctx.arc(26,5,18,0,7);ctx.arc(-22,6,15,0,7);ctx.fill();ctx.restore(); }
  function drawTerrain(){ ctx.beginPath(); ctx.moveTo(0,H); for(let x=0;x<W;x++) ctx.lineTo(x,terrain[x]); ctx.lineTo(W,H); ctx.closePath();
    ctx.fillStyle='#7fb86a'; ctx.fill();
    ctx.strokeStyle='#5f9a4e'; ctx.lineWidth=4; ctx.beginPath(); for(let x=0;x<W;x++){ if(x===0)ctx.moveTo(x,terrain[x]); else ctx.lineTo(x,terrain[x]); } ctx.stroke(); }
  function roundRect(x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
  function drawTank(t,active){
    ctx.save();
    ctx.fillStyle=t.body; ctx.strokeStyle='rgba(0,0,0,.35)'; ctx.lineWidth=3;
    roundRect(t.x-22,t.y-18,44,18,7); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#444'; roundRect(t.x-24,t.y-6,48,8,4); ctx.fill();
    ctx.fillStyle=t.cap; ctx.beginPath(); ctx.arc(t.x,t.y-20,11,Math.PI,0); ctx.fill();
    const ang = active ? S.angle : 30; const rad = ang*Math.PI/180;
    ctx.strokeStyle=t.cap; ctx.lineWidth=6; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(t.x,t.y-22); ctx.lineTo(t.x+Math.cos(rad)*26*t.dir, t.y-22-Math.sin(rad)*26); ctx.stroke();
    ctx.fillStyle='#33402e'; ctx.font='800 13px Quicksand, sans-serif'; ctx.textAlign='center'; ctx.fillText(t.name, t.x, t.y+16);
    ctx.restore();
  }
  function drawShot(sh){
    if(sh.kind==='bounce'){ ctx.fillStyle='#3a7bd5'; ctx.beginPath(); ctx.arc(sh.x,sh.y,6,0,7); ctx.fill(); ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.stroke();
      ctx.fillStyle='#2f6fb0'; ctx.font='800 12px Quicksand,sans-serif'; ctx.textAlign='center'; ctx.fillText('×'+sh.bounces, sh.x, sh.y-12); }
    else if(sh.kind==='cluster'){ ctx.fillStyle='#5a3a8a'; ctx.beginPath(); ctx.arc(sh.x,sh.y,7,0,7); ctx.fill(); ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.stroke(); }
    else if(sh.kind==='frag'){ ctx.fillStyle='#7a4fae'; ctx.beginPath(); ctx.arc(sh.x,sh.y,4,0,7); ctx.fill(); }
    else if(sh.kind==='mg'){ ctx.fillStyle='#f4c95d'; ctx.beginPath(); ctx.arc(sh.x,sh.y,3,0,7); ctx.fill(); }
    else if(sh.kind==='nuke'){ ctx.fillStyle='#c62828'; ctx.beginPath(); ctx.arc(sh.x,sh.y,8,0,7); ctx.fill(); ctx.strokeStyle='#ffd43b'; ctx.lineWidth=2.5; ctx.stroke(); ctx.fillStyle='#fff'; ctx.font='800 11px Quicksand,sans-serif'; ctx.textAlign='center'; ctx.fillText('☢', sh.x, sh.y+4); }
    else { ctx.fillStyle='#333'; ctx.beginPath(); ctx.arc(sh.x,sh.y,5,0,7); ctx.fill(); }
  }
  function hud(){
    ctx.textAlign='left'; ctx.font='800 16px Quicksand, sans-serif';
    ctx.fillStyle=ARCHY.body; ctx.fillText('Archy  '+S.scoreA, 16, 26);
    ctx.textAlign='right'; ctx.fillStyle=DAD.body; ctx.fillText(S.scoreD+'  Dad', W-16, 26);
    ctx.textAlign='center';
    if(S.mode==='aim'||S.mode==='fire'||S.mode==='resolve'||S.mode==='mg'){
      ctx.fillStyle='#33402e'; ctx.font='800 15px Quicksand, sans-serif';
      ctx.fillText((S.turn==='archy'?'Archy':'Dad')+'’s turn', W/2, 22);
      const dir=S.wind>0?'→':(S.wind<0?'←':'·');
      ctx.fillText('Wind '+dir+' '+Math.abs(S.wind), W/2, 42);
      ctx.fillStyle=S.weapon==='normal'?'#33402e':(S.weapon==='bounce'?'#2f6fb0':(S.weapon==='nuke'?'#c62828':'#5a3a8a'));
      ctx.fillText('Shot: '+weaponLabel(S.weapon), W/2, 60);
      if(S.mode==='mg'){ ctx.fillStyle='#b5683f'; ctx.fillText('🔫 Firing! '+Math.max(0,Math.ceil(4-S.mgTime))+'s — sweep the turret!', W/2, 78); }
    }
    if(S.mode==='aim'){
      const t=activeTank();
      ctx.fillStyle='#33402e'; ctx.font='800 13px Quicksand, sans-serif'; ctx.textAlign='center';
      ctx.fillText('Angle '+Math.round(S.angle)+'°  ·  Power '+Math.round(S.power), t.x, t.y-44);
      ctx.fillStyle='rgba(0,0,0,.15)'; roundRect(t.x-30,t.y-38,60,7,3); ctx.fill();
      ctx.fillStyle='#f4c95d'; roundRect(t.x-30,t.y-38,60*(S.power/100),7,3); ctx.fill();
    }
  }
  function overlayPanel(title, lines){
    ctx.fillStyle='rgba(40,55,46,.78)'; ctx.fillRect(0,0,W,H);
    ctx.textAlign='center'; ctx.fillStyle='#fff'; ctx.font='800 40px Quicksand, sans-serif'; ctx.fillText(title, W/2, H/2-54);
    ctx.font='600 18px Quicksand, sans-serif';
    lines.forEach((l,i)=> ctx.fillText(l, W/2, H/2-16+i*26));
  }
  function draw(){
    sky(); drawTerrain();
    drawTank(ARCHY, S.turn==='archy' && (S.mode==='aim'||S.mode==='mg'));
    drawTank(DAD,   S.turn==='dad'   && (S.mode==='aim'||S.mode==='mg'));
    for(const sh of S.shots) drawShot(sh);
    for(const f of S.flashes){ ctx.fillStyle='rgba(244,140,40,.85)'; ctx.beginPath(); ctx.arc(f.x,f.y,f.r,0,7); ctx.fill();
      ctx.fillStyle='rgba(255,220,120,.9)'; ctx.beginPath(); ctx.arc(f.x,f.y,f.r*0.5,0,7); ctx.fill(); }
    hud();
    if(S.mode==='start') overlayPanel('DAD vs ARCHY', ['Take turns — first to '+WIN_TO+' hits wins!','← → aim · ↑ ↓ power · SPACE fire · B = change weapon','Weapons: Normal · 💣 Bouncy · ✸ Cluster · ☢️ Nuke · 🔫 Machine Gun','🔫 MG fires for 4s — sweep the turret! ☢️ Nuke: hit = instant win, miss = both lose','Press SPACE or tap to start']);
    if(S.mode==='over'){
      if(S.nukeResult==='win') overlayPanel('☢️ DIRECT NUKE!', [S.winner+' wins instantly!','Press SPACE or tap to play again']);
      else if(S.nukeResult==='miss') overlayPanel('☢️ NUKE MISSED!', ['Everybody loses — no winner this time!','Press SPACE or tap to play again']);
      else overlayPanel((S.winner==='Archy'?'🏆 Archy wins!':'🏆 Dad wins!'), ['Final: Archy '+S.scoreA+' — '+S.scoreD+' Dad','Press SPACE or tap to play again']);
    }
  }

  requestAnimationFrame(step);
})();
