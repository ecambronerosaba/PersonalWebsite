/* eslint-disable no-mixed-operators, no-loop-func */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

// Brick-built 3D landing scenes. Mounts into `root` (which must contain the
// #tabs, #caption, #act and #rebuild elements) and returns a cleanup function.
export function initBrickScene(root, host) {
const $ = (id) => root.querySelector("#" + id);
const winListeners = [];
const winOn = (type, fn) => { window.addEventListener(type, fn); winListeners.push([type, fn]); };
let disposed = false, raf = 0;


const PL = 0.4;                       // plate height (stud pitch = 1)
const V = (x,y,z)=>new THREE.Vector3(x,y,z);

// ---------------- materials ----------------
const matCache = {};
function mat(color, o={}){
  const key = color + JSON.stringify(o);
  if(matCache[key]) return matCache[key];
  let m;
  if(o.trans) m = new THREE.MeshPhysicalMaterial({color, transparent:true, opacity:o.opacity ?? .5, roughness:.05, metalness:0, depthWrite:false});
  else m = new THREE.MeshStandardMaterial({color, roughness:o.rough ?? .3, metalness:o.metal ?? 0, emissive:o.glow?color:'#000', emissiveIntensity:o.glow??0, side:o.double?THREE.DoubleSide:THREE.FrontSide});
  return matCache[key] = m;
}
const C = { black:'#1b1b1b', dgrey:'#4b4f52', lgrey:'#a0a5a9', white:'#f2f2f2', red:'#c91a09', blue:'#0055bf', yellow:'#f2cd37', skin:'#f3c6a5', green:'#237841', lime:'#a5ca18', brown:'#5c3a21', rbrown:'#7b4a2d', tan:'#d9bb7b', dtan:'#958a73', orange:'#fe8a18', teal:'#069d9f', navy:'#253a5e', rivian:'#4f6447', wood:'#b9875a', sand:'#c8b590', asphalt:'#3d4043', lav:'#e4dcef' };

// ---------------- geometry caches ----------------
const gcache = {};
const boxGeo = (w,h,d,r=.05)=> gcache[`b${w},${h},${d},${r}`] ||= new RoundedBoxGeometry(w,h,d,2,Math.min(r,h/2-.001,w/2-.001,d/2-.001));
const studGeo = new THREE.CylinderGeometry(.3,.3,.18,18);
const cyl = (rt,rb,h,s=24,open=false,ts=0,tl=Math.PI*2)=> gcache[`c${rt},${rb},${h},${s},${open},${ts},${tl}`] ||= new THREE.CylinderGeometry(rt,rb,h,s,1,open,ts,tl);

// ---------------- scene builder ----------------
// grid pieces: x,z in studs (cell corner), y in plates
function Builder(){
  const pieces = [], occ = new Set(), grid = [];
  const key=(x,y,z)=>`${x},${y},${z}`;
  const api = {
    pieces,
    P(x,y,z,w,d,h,color,o={}){
      const m = new THREE.Mesh(boxGeo(w-.03,h*PL-.02,d-.03), mat(color,o));
      m.castShadow = !o.trans; m.receiveShadow = true;
      const g = new THREE.Group(); g.add(m);
      g.position.set(x+w/2, (y+h/2)*PL, z+d/2);
      const p = {obj:g, order:y, grid:{x,y,z,w,d,h,color,o}};
      pieces.push(p); grid.push(p);
      for(let i=0;i<w;i++) for(let j=0;j<h;j++) for(let k=0;k<d;k++) occ.add(key(x+i,y+j,z+k));
      return p;
    },
    fill(x0,x1,y0,y1,z0,z1,color,o={}){
      let y=y0, li=0;
      while(y<y1){
        const h = (!o.plates && y1-y>=3) ? 3 : 1;
        for(let z=z0; z<z1;){
          const d = Math.min(o.depth ?? 2, z1-z);
          let x=x0, first=true;
          while(x<x1){
            const maxLen = h===3?4:6;
            const len = Math.min(first && ((li+Math.floor(z/2))%2) ? 2 : maxLen, x1-x);
            api.P(x,y,z,len,d,h,color,{...o, tile: o.tile && y+h===y1});
            x+=len; first=false;
          }
          z+=d;
        }
        y+=h; li++;
      }
    },
    // round 1x1 (or r) piece centered on cell
    R(x,y,z,h,color,o={}){
      const r = o.r ?? .48;
      const m = new THREE.Mesh(cyl(r,r,h*PL-.02,28), mat(color,o)); m.castShadow = !o.trans; m.receiveShadow = true;
      const g = new THREE.Group(); g.add(m);
      if(!o.tile){ const s = new THREE.Mesh(studGeo, mat(color,o)); s.position.y = h*PL/2+.09; s.castShadow=true; g.add(s); }
      g.position.set(x+(o.cx??.5), (y+h/2)*PL, z+(o.cz??.5));
      const p = {obj:g, order:y}; pieces.push(p); return p;
    },
    // arbitrary object at world position (units)
    O(obj, x,y,z, rot=[0,0,0], order){
      const g = obj.isGroup ? obj : new THREE.Group().add(obj);
      g.position.set(x,y,z); g.rotation.set(...rot);
      g.traverse(c=>{ if(c.isMesh){ c.castShadow = !c.material.transparent; c.receiveShadow = true; }});
      const p = {obj:g, order: order ?? y/PL}; pieces.push(p); return p;
    },
    base(x0,x1,z0,z1,color){
      const w=x1-x0, d=z1-z0;
      const g = new THREE.Group();
      const m = new THREE.Mesh(boxGeo(w,.32,d,.08), mat(color,{rough:.5})); m.receiveShadow = true; g.add(m);
      const inst = new THREE.InstancedMesh(studGeo, mat(color,{rough:.5}), w*d); const m4 = new THREE.Matrix4(); let k=0;
      for(let i=0;i<w;i++) for(let j=0;j<d;j++){ m4.setPosition(i-w/2+.5,.16+.09,j-d/2+.5); inst.setMatrixAt(k++,m4); }
      inst.receiveShadow = true; g.add(inst);
      g.position.set(x0+w/2,-.16,z0+d/2);
      const p = {obj:g, order:-5, base:true}; pieces.push(p); return p;
    },
    finish(){
      grid.forEach(p=>{
        const {x,y,z,w,d,h,color,o} = p.grid;
        if(o.tile) return;
        for(let i=0;i<w;i++) for(let k=0;k<d;k++){
          if(occ.has(key(x+i,y+h,z+k))) continue;
          const s = new THREE.Mesh(studGeo, mat(color,o)); s.castShadow = !o.trans;
          s.position.set(i-w/2+.5, h*PL/2+.09, k-d/2+.5); p.obj.add(s);
        }
      });
      return pieces;
    }
  };
  return api;
}

// ---------------- canvas textures ----------------
function canvasTex(w,h,draw){ const c=document.createElement('canvas'); c.width=w; c.height=h; draw(c.getContext('2d'),w,h); const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=8; return t; }
const faceTex = canvasTex(1024,280,(g,w,h)=>{
  g.fillStyle=C.skin; g.fillRect(0,0,w,h);
  const cx=512;
  g.fillStyle='#111';
  [-50,50].forEach(dx=>{ g.beginPath(); g.ellipse(cx+dx,126,11,14,0,0,Math.PI*2); g.fill(); });
  g.fillStyle='#fff'; [-50,50].forEach(dx=>{ g.beginPath(); g.arc(cx+dx-3,120,3.5,0,Math.PI*2); g.fill(); });
  g.strokeStyle='#6b3518'; g.lineWidth=7; g.lineCap='round';
  [-1,1].forEach(s=>{ g.beginPath(); g.moveTo(cx+s*30,98); g.lineTo(cx+s*64,94); g.stroke(); });
  g.strokeStyle='#111'; g.lineWidth=7;
  g.beginPath(); g.moveTo(cx-32,164); g.quadraticCurveTo(cx-2,182,cx+34,161); g.stroke();
  g.lineWidth=4; g.beginPath(); g.moveTo(cx+32,157); g.lineTo(cx+38,165); g.stroke();
});
const torsoTex = canvasTex(256,256,(g,w,h)=>{
  const SB='#93a7c4';
  g.fillStyle=SB; g.fillRect(0,0,w,h);
  g.fillStyle='#141414'; g.beginPath(); g.moveTo(100,256); g.lineTo(100,92); g.lineTo(64,0); g.lineTo(92,0); g.lineTo(128,70); g.lineTo(164,0); g.lineTo(192,0); g.lineTo(156,92); g.lineTo(156,256); g.closePath(); g.fill();
  g.fillStyle='#c9d1dc'; g.beginPath(); g.moveTo(86,0); g.quadraticCurveTo(128,118,170,0); g.closePath(); g.fill();
  g.fillStyle=C.skin; g.beginPath(); g.arc(128,0,25,0,Math.PI); g.fill();
  g.strokeStyle='#b3bcc6'; g.lineWidth=3; g.beginPath(); g.arc(128,0,30,0,Math.PI); g.stroke();
  g.strokeStyle='#cfd5db'; g.lineWidth=3; g.beginPath();
  for(let y=74;y<256;y+=7){ g.lineTo(124+((y/7)%2<1?0:8),y); } g.stroke();
  g.fillStyle='#dde2e7'; g.beginPath(); g.roundRect(121,104,14,28,4); g.fill(); g.fillStyle='#141414'; g.fillRect(126,112,4,12);
  g.strokeStyle='#141414'; g.lineWidth=3;
  g.beginPath(); g.moveTo(54,0); g.lineTo(98,100); g.stroke();
  g.beginPath(); g.moveTo(202,0); g.lineTo(158,100); g.stroke();
  [[72,38],[72,92],[72,150],[72,206],[186,38]].forEach(([x,y])=>{ g.fillStyle='#141414'; g.beginPath(); g.arc(x,y,8.5,0,Math.PI*2); g.fill(); g.fillStyle='#eef1f4'; g.beginPath(); g.arc(x,y,4.8,0,Math.PI*2); g.fill(); });
  g.lineWidth=4;
  g.beginPath(); g.moveTo(20,172); g.lineTo(88,182); g.lineTo(90,244); g.quadraticCurveTo(30,244,20,172); g.stroke();
  g.beginPath(); g.moveTo(236,172); g.lineTo(168,182); g.lineTo(166,244); g.quadraticCurveTo(226,244,236,172); g.stroke();
  g.fillStyle='#7f93b0'; [16,240].forEach(x=>{ for(let y=12;y<160;y+=22){ g.beginPath(); g.arc(x,y,1.8,0,Math.PI*2); g.fill(); } });
});
const codeTex = canvasTex(512,1024,(g,w,h)=>{
  g.fillStyle='#141824'; g.fillRect(0,0,w,h);
  const cols=['#7aa2f7','#9ece6a','#e0af68','#bb9af7','#7dcfff','#f7768e','#c0caf5'];
  let y=14; let indent=0;
  while(y<h){
    if(Math.random()<.12){ y+=16; continue; }
    indent = Math.max(0, Math.min(5, indent + (Math.random()<.3?1:Math.random()<.3?-1:0)));
    let x = 20 + indent*22;
    const n = 1+Math.floor(Math.random()*4);
    for(let i=0;i<n;i++){ const len=20+Math.random()*90; g.fillStyle=cols[Math.floor(Math.random()*cols.length)]; g.fillRect(x,y,len,8); x+=len+10; if(x>w-30) break; }
    y+=18;
  }
});
codeTex.wrapS = codeTex.wrapT = THREE.RepeatWrapping; codeTex.repeat.set(1,.5);
const posterTex = canvasTex(256,320,(g,w,h)=>{
  const grd=g.createLinearGradient(0,0,0,h); grd.addColorStop(0,'#f3b562'); grd.addColorStop(1,'#f06c50'); g.fillStyle=grd; g.fillRect(0,0,w,h);
  g.fillStyle='#fff3d6'; g.beginPath(); g.arc(170,110,38,0,Math.PI*2); g.fill();
  g.fillStyle='#3b4a5a'; g.beginPath(); g.moveTo(0,250); g.lineTo(70,150); g.lineTo(120,210); g.lineTo(180,130); g.lineTo(256,240); g.lineTo(256,320); g.lineTo(0,320); g.fill();
  g.fillStyle='#2a3542'; g.beginPath(); g.moveTo(0,290); g.lineTo(90,220); g.lineTo(256,300); g.lineTo(256,320); g.lineTo(0,320); g.fill();
});
const pegTex = canvasTex(256,256,(g,w,h)=>{ g.fillStyle='#c9a46a'; g.fillRect(0,0,w,h); g.fillStyle='#7d6240'; for(let x=16;x<w;x+=32) for(let y=16;y<h;y+=32){ g.beginPath(); g.arc(x,y,4,0,Math.PI*2); g.fill(); } });
pegTex.wrapS = pegTex.wrapT = THREE.RepeatWrapping; pegTex.repeat.set(3,3);

// ---------------- minifig ----------------
function makeMinifig(o={}){
  const fig = new THREE.Group(); const parts = {};
  const skin = mat(C.skin,{rough:.28}), legM = mat(o.legs||'#1e1e1e',{rough:.3}), hipM = mat(o.hips||'#1e1e1e',{rough:.3}), armM = mat(o.arms||'#1e1e1e',{rough:.3});
  const mk = (geo,m)=>{ const x=new THREE.Mesh(geo,m); x.castShadow=x.receiveShadow=true; return x; };
  ['L','R'].forEach((s,i)=>{
    const g = new THREE.Group(); g.position.set(i?-.47:.47, 1.4, 0);
    const leg = mk(boxGeo(.9,1.05,.75,.05), legM); leg.position.y = -.62; g.add(leg);
    const foot = mk(boxGeo(.9,.3,1.0,.05), legM); foot.position.set(0,-1.25,.12); g.add(foot);
    fig.add(g); parts['leg'+s] = g;
  });
  const hips = new THREE.Group(); hips.position.y = 1.4; hips.add(mk(boxGeo(1.92,.32,.76,.05), hipM));
  const hc = mk(cyl(.2,.2,.3,14), hipM); hc.position.set(0,-.25,0); hips.add(hc);
  fig.add(hips); parts.hips = hips;
  const tg = new THREE.BoxGeometry(1.95,1.6,.82);
  const pos = tg.attributes.position; for(let i=0;i<pos.count;i++){ if(pos.getY(i)>0) pos.setX(i, pos.getX(i)*1.56/1.95); } tg.computeVertexNormals();
  const tside = mat(o.shirt||'#8ea2bd',{rough:.3});
  const torso = new THREE.Group(); torso.position.y = 2.36;
  torso.add(mk(tg,[tside,tside,tside,tside,new THREE.MeshStandardMaterial({map:torsoTex,roughness:.3}),tside]));
  const neck = mk(cyl(.26,.26,.14), skin); neck.position.y = .86; torso.add(neck);
  fig.add(torso); parts.torso = torso;
  ['L','R'].forEach((s,i)=>{
    const g = new THREE.Group(); g.position.set(i?-.86:.86, 2.92, 0); g.rotation.z = i?-.1:.1;
    const sh = mk(new THREE.SphereGeometry(.3,18,12), armM); g.add(sh);
    const arm = mk(cyl(.23,.27,1.0,18), armM); arm.position.set(0,-.48,.08); arm.rotation.x = -.18; g.add(arm);
    const cuff = mk(cyl(.27,.27,.08,18), armM); cuff.position.set(0,-.97,.17); cuff.rotation.x=-.18; g.add(cuff);
    const hand = new THREE.Group(); hand.position.set(0,-1.04,.2); hand.rotation.x = -.5; g.add(hand);
    const wrist = mk(cyl(.12,.12,.2,12), skin); hand.add(wrist);
    const c = mk(new THREE.TorusGeometry(.17,.075,10,22,Math.PI*1.5), skin); c.rotation.set(0,Math.PI/2,Math.PI*.75); c.position.y=-.2; hand.add(c);
    g.userData.hand = hand;
    fig.add(g); parts['arm'+s] = g;
  });
  const head = new THREE.Group(); head.position.y = 3.24;
  const HR=.63, HH=1.06;
  const prof = [V(0,0,0),V(HR-.1,0,0),V(HR-.03,.025,0),V(HR,.08,0)];
  for(let k=0;k<=20;k++) prof.push(V(HR,.1+k*(HH-.2)/20,0));
  prof.push(V(HR-.03,HH-.025,0),V(HR-.1,HH,0),V(0,HH,0));
  const hgeo = new THREE.LatheGeometry(prof.map(p=>new THREE.Vector2(p.x,p.y)),48,-Math.PI,Math.PI*2);
  const hd = mk(hgeo, new THREE.MeshStandardMaterial({map:faceTex,roughness:.28})); head.add(hd);
  const hs = mk(cyl(.3,.3,.18), skin); hs.position.y = HH+.08; head.add(hs);
  fig.add(head); parts.head = head;
  const hair = new THREE.Group(); hair.position.y = 3.24;
  const hm = mat(o.hair||'#5a2c14',{rough:.18, double:true});
  const RH=.76, CY=.72, SY=.8;
  const hgm = new THREE.SphereGeometry(RH,56,28,0,Math.PI*2,0,Math.PI*.64);
  const hp = hgm.attributes.position;
  for(let i=0;i<hp.count;i++){
    let x=hp.getX(i), y=hp.getY(i)*SY+CY, z=hp.getZ(i);
    const r=Math.hypot(x,z), f = r>1e-4 ? z/r : 0;
    const tf = THREE.MathUtils.smoothstep(f,.12,.6);
    const line = .84 - .05*(x/HR);
    if(y<line) y = y + (line-y)*tf;
    y += .12*Math.exp(-(((x+.22)**2)+((z-.12)**2))/.09) * THREE.MathUtils.smoothstep(y,1.0,1.3);
    if(f>0) z += .05*f*THREE.MathUtils.smoothstep(y,.85,1.15);
    hp.setXYZ(i,x,y,z);
  }
  hgm.computeVertexNormals();
  hair.add(mk(hgm, hm));
  fig.add(hair); parts.hair = hair;  fig.add(hair); parts.hair = hair;
  return {fig, parts};
}
function pose(f, p){
  const {parts} = f;
  if(p.sit){ parts.legL.rotation.x = parts.legR.rotation.x = -Math.PI/2; }
  if(p.armL!=null) parts.armL.rotation.x = p.armL;
  if(p.armR!=null) parts.armR.rotation.x = p.armR;
  if(p.armLz!=null) parts.armL.rotation.z = p.armLz;
  if(p.armRz!=null) parts.armR.rotation.z = p.armRz;
  if(p.headY!=null) parts.head.rotation.y = parts.hair.rotation.y = p.headY;
}
function cup(){
  const g = new THREE.Group();
  g.add(new THREE.Mesh(cyl(.2,.17,.45,20), mat(C.white)));
  const lid = new THREE.Mesh(cyl(.21,.21,.06,20), mat(C.rbrown)); lid.position.y=.23; g.add(lid);
  const sleeve = new THREE.Mesh(cyl(.205,.19,.18,20), mat(C.tan)); g.add(sleeve);
  return g;
}
function spool(color, r=.55, w=.4){
  const g = new THREE.Group();
  const core = new THREE.Mesh(cyl(r*.85,r*.85,w*.9,24), mat(color,{rough:.5})); g.add(core);
  [-1,1].forEach(s=>{ const f=new THREE.Mesh(cyl(r,r,.05,28), mat('#2a2a2a')); f.position.y=s*w/2; g.add(f); });
  const hub = new THREE.Mesh(cyl(r*.25,r*.25,w+.02,16), mat(C.lgrey)); g.add(hub);
  return g;
}
function wheel(outer){
  const g = new THREE.Group();
  const tire = new THREE.Mesh(cyl(1.3,1.3,.85,40), mat('#1c1c1c',{rough:.85})); tire.rotation.x = Math.PI/2; g.add(tire);
  [-1,1].forEach(s=>{ const tr=new THREE.Mesh(new THREE.TorusGeometry(1.12,.17,10,40), mat('#1c1c1c',{rough:.85})); tr.position.z=s*.34; g.add(tr); });
  const rim = new THREE.Mesh(cyl(.86,.86,.87,32), mat('#262729',{metal:.3,rough:.35})); rim.rotation.x = Math.PI/2; g.add(rim);
  const sm = mat('#38393c',{metal:.4,rough:.3});
  for(let i=0;i<12;i++){ const a=i/12*Math.PI*2; const s=new THREE.Mesh(new THREE.BoxGeometry(.1,.55,.06), sm); s.position.set(Math.sin(a)*.52, Math.cos(a)*.52, outer*.44); s.rotation.z = -a+.45; g.add(s); }
  const hub = new THREE.Mesh(cyl(.2,.2,.9,16), sm); hub.rotation.x = Math.PI/2; g.add(hub);
  return g;
}
function makeDog(){
  const g = new THREE.Group(), cream = mat('#f1e3c4',{rough:.4}), ear = mat('#e3c792',{rough:.4}), blk = mat('#151515',{rough:.2});
  const add=(geo,m,x,y,z,r=[0,0,0],sc)=>{ const o=new THREE.Mesh(geo,m); o.position.set(x,y,z); o.rotation.set(...r); if(sc) o.scale.set(...sc); g.add(o); return o; };
  add(new THREE.CapsuleGeometry(.5,1.2,8,20), cream, 0,1.2,0,[0,0,Math.PI/2]);
  add(new THREE.SphereGeometry(.5,20,14), cream, .75,1.25,0,[0,0,0],[1,1.1,1]);
  [[.65,.3],[.65,-.3],[-.7,.3],[-.7,-.3]].forEach(([x,z])=>{ add(cyl(.17,.15,.85,14), cream, x,.48,z); add(new THREE.SphereGeometry(.19,12,10), cream, x+.06,.1,z,[0,0,0],[1.2,.6,1]); });
  const head = new THREE.Group(); head.position.set(1.15,1.9,0); g.add(head);
  const hadd=(geo,m,x,y,z,r=[0,0,0],sc)=>{ const o=new THREE.Mesh(geo,m); o.position.set(x,y,z); o.rotation.set(...r); if(sc) o.scale.set(...sc); head.add(o); return o; };
  hadd(boxGeo(.8,.72,.7,.22), cream, 0,0,0);
  hadd(boxGeo(.5,.36,.44,.14), cream, .52,-.14,0);
  hadd(new THREE.SphereGeometry(.09,12,10), blk, .78,-.04,0);
  [-.17,.17].forEach(z=>hadd(new THREE.SphereGeometry(.065,10,8), blk, .38,.12,z));
  hadd(boxGeo(.14,.04,.12,.02), mat('#e88a9a'), .66,-.34,0,[0,0,-.4]);
  [-1,1].forEach(s=>hadd(boxGeo(.36,.55,.12,.06), ear, -.05,-.12,s*.38,[s*.15,0,.15]));
  const tail = new THREE.Group(); tail.position.set(-1.05,1.35,0); g.add(tail);
  const t = new THREE.Mesh(new THREE.CapsuleGeometry(.12,.75,6,12), cream); t.position.set(-.25,.25,0); t.rotation.z = .9; tail.add(t);
  g.userData.tail = tail; g.userData.head = head;
  return g;
}
const box = (w,h,d,color,o={})=>{ const m=new THREE.Mesh(boxGeo(w,h,d,o.r??.04), o.material || mat(color,o)); return m; };
const zTex = canvasTex(64,64,(g,w,h)=>{ g.fillStyle='#4a4a4a'; g.font='bold 52px Georgia'; g.textAlign='center'; g.textBaseline='middle'; g.fillText('z',32,30); });
function makeSleepingDog(){
  const g=new THREE.Group(), cream=mat('#f1e3c4',{rough:.4}), ear=mat('#e3c792',{rough:.4}), blk=mat('#151515',{rough:.2});
  const body=new THREE.Group(); g.add(body);
  const b=new THREE.Mesh(new THREE.SphereGeometry(.9,28,18), cream); b.scale.set(1.25,.55,1.0); b.position.y=.5; body.add(b);
  const hip=new THREE.Mesh(new THREE.SphereGeometry(.6,20,14), cream); hip.scale.set(1,.7,1); hip.position.set(-.55,.55,-.25); body.add(hip);
  const tail=new THREE.Mesh(new THREE.TorusGeometry(1.08,.18,10,24,Math.PI*.6), cream); tail.rotation.set(Math.PI/2,0,Math.PI/2); tail.position.y=.2; g.add(tail);
  [.28,.68].forEach(z=>{ const p=new THREE.Mesh(new THREE.CapsuleGeometry(.14,.55,6,12), cream); p.rotation.z=Math.PI/2; p.position.set(1.05,.14,z); g.add(p); });
  const head=new THREE.Group(); head.position.set(1.0,.46,.5); head.rotation.y=-.45; g.add(head);
  const ha=(geo,m,x,y,z,r=[0,0,0])=>{ const o=new THREE.Mesh(geo,m); o.position.set(x,y,z); o.rotation.set(...r); head.add(o); return o; };
  ha(boxGeo(.75,.6,.68,.22), cream, 0,0,0);
  ha(boxGeo(.45,.32,.42,.13), cream, .5,-.1,0);
  ha(new THREE.SphereGeometry(.08,12,10), blk, .73,-.02,0);
  [-.17,.17].forEach(z=>ha(boxGeo(.04,.03,.14,.01), blk, .38,.1,z));
  [-1,1].forEach(s=>ha(boxGeo(.34,.5,.12,.06), ear, -.05,-.12,s*.38,[s*.2,0,.1]));
  const zs=[0,1,2].map(()=>{ const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:zTex,transparent:true,opacity:0,depthWrite:false})); g.add(sp); return sp; });
  g.userData={body,head,zs};
  return g;
}
function sleepTick(dog,t){
  const {body,head,zs}=dog.userData, br=Math.sin(t*1.6);
  body.scale.y=1+.05*br; head.position.y=.46+.02*br;
  zs.forEach((sp,i)=>{ const ph=((t*.32)+i/3)%1; sp.position.set(1.3+ph*.5, .95+ph*1.8, .5+ph*.2); sp.material.opacity=Math.sin(ph*Math.PI)*.9; const k=.35+.45*ph; sp.scale.set(k,k,k); });
}
function hitbox(w,h,d){ const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d), new THREE.MeshBasicMaterial({visible:false})); m.userData.hitbox=true; return m; }
const steamTex = canvasTex(64,64,(g,w,h)=>{ const gr=g.createRadialGradient(32,32,2,32,32,30); gr.addColorStop(0,'rgba(255,255,255,.9)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,w,h); });
function kettle(){
  const g=new THREE.Group(), m=mat('#1a1a1a',{rough:.55,metal:.3});
  const add=(o,x,y,z,r=[0,0,0])=>{ o.position.set(x,y,z); o.rotation.set(...r); g.add(o); return o; };
  add(new THREE.Mesh(cyl(.3,.34,.55,24),m), .5,-.35,0);
  add(new THREE.Mesh(cyl(.22,.26,.06,20),m), .5,-.04,0);
  add(new THREE.Mesh(new THREE.SphereGeometry(.07,10,8),mat('#c8a26a',{rough:.3})), .5,.02,0);
  add(box(.09,.5,.12,'#3a2a1c'), 0,-.28,0);
  add(box(.32,.08,.1,'#1a1a1a'), .14,-.05,0); add(box(.32,.08,.1,'#1a1a1a'), .14,-.52,0);
  const c=new THREE.CatmullRomCurve3([V(.75,-.55,0),V(1.0,-.45,0),V(1.2,-.15,0),V(1.4,-.05,0),V(1.5,-.09,0)]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(c,24,.045,8),m));
  const tip=new THREE.Object3D(); tip.position.set(1.52,-.1,0); g.add(tip); g.userData.tip=tip;
  return g;
}
const signTex = canvasTex(1024,128,(g,w,h)=>{ g.fillStyle='#161616'; g.fillRect(0,0,w,h); g.fillStyle='#f4f1ea'; g.font='600 64px Marcellus, Georgia'; g.textAlign='center'; g.textBaseline='middle'; g.fillText('E  S  T  E  B  A  N     C  O  F  F  E  E',w/2,h/2+4); });
const menuTex = canvasTex(256,320,(g,w,h)=>{ g.fillStyle='#f7f4ee'; g.fillRect(0,0,w,h); g.fillStyle='#222'; g.font='22px Georgia'; ['ETHIOPIA  GUJI','KENYA  NYERI','COLOMBIA  HUILA','PANAMA  GEISHA','','POUR OVER','ESPRESSO','FLAT WHITE'].forEach((t,i)=>{ g.fillText(t,24,44+i*34); }); });


// ---------------- scenes ----------------
const SCENES = [
 { id:'r2', label:'Drive', caption:'Charging the R2 before a weekend of trails.', cam:{az:.55, el:.42, dist:52, ty:2.2}, build(B, anim){
   B.base(-4,25,-3,14,C.asphalt);
   B.fill(-4,25,0,1,-3,-2,C.lgrey,{plates:true,tile:true,depth:1});
   for(let z=-1; z<12; z+=3) B.P(-2,0,z,1,2,1,C.white,{tile:true});
   // tree
   B.fill(-3,-2,0,9,11,12,C.rbrown,{depth:1});
   [[4,1.6],[2,1.25],[1,.85]].forEach(([h,r],i)=>B.R(-3,9+i*4,11,h,i%2?C.lime:C.green,{r}));
   B.R(-1,0,-2,3,C.green,{r:.9,cx:.5,cz:.5}); B.R(1,0,-2,2,C.lime,{r:.7});
   const K=C.black, G='#b2b8bc';
   const GLS = {trans:true, opacity:.68};
   const GC = '#4a3a2e';
   B.fill(1,17,2,3,1,7,K,{plates:true});
   const arches=[[2,6],[12,16]], solid=[[0,2],[6,12],[16,18]];
   [0,7].forEach(z=>{
     solid.forEach(([a,b])=>{ B.fill(a,b,3,4,z,z+1,K,{plates:true,depth:1}); B.fill(a,b,4,9,z,z+1,G,{depth:1}); });
     arches.forEach(([a,b])=>B.fill(a,b,7,9,z,z+1,G,{plates:true,depth:1}));
   });
   B.fill(1,17,3,7,1,7,K); B.fill(1,17,7,9,1,7,G,{plates:true});
   [0,17].forEach(x=>{ B.fill(x,x+1,3,5,1,7,K,{plates:true}); B.fill(x,x+1,5,9,1,7,G); });
   B.fill(13,18,9,10,0,8,G,{plates:true,tile:true});
   [0,7].forEach(z=>B.fill(0,13,9,10,z,z+1,G,{plates:true,depth:1}));
   B.fill(0,1,9,10,1,7,G,{plates:true});
   B.fill(1,13,9,10,1,7,C.dgrey,{plates:true});
   [0,7].forEach(z=>{
     B.fill(0,2,10,14,z,z+1,G,{depth:1});
     B.fill(2,7,10,14,z,z+1,GC,{depth:1,...GLS});
     B.fill(7,8,10,14,z,z+1,K,{depth:1});
     B.fill(8,12,10,14,z,z+1,GC,{depth:1,...GLS});
     B.fill(12,13,10,12,z,z+1,GC,{depth:1,...GLS});
   });
   B.fill(0,1,10,14,1,7,GC,{plates:true,...GLS});
   B.fill(0,12,14,15,0,8,G,{plates:true,tile:true});
   B.fill(2,5,10,12,1,7,C.tan,{plates:true}); B.fill(2,3,12,14,1,7,C.tan,{plates:true,tile:true});
   [[1,3],[5,7]].forEach(([a,b])=>{ B.fill(8,10,10,11,a,b,C.tan,{plates:true}); B.fill(8,9,11,13,a,b,C.tan,{plates:true,tile:true}); });
   const sw = new THREE.Mesh(new THREE.TorusGeometry(.38,.07,8,20), mat(K)); B.O(sw,11.6,4.7,2,[0,Math.PI/2,.35],11);
   B.O(box(1.0,.2,8.1,K),.45,6.1,4,[0,0,-.12],16);
   const ws = new THREE.Mesh(new THREE.BoxGeometry(3.0,.1,6.6), mat(GC,GLS));
   B.O(ws, 13.25, 4.8, 4, [0,0,-.569], 13);
   [.45,7.55].forEach(z=>B.O(box(3.0,.24,.5,K),13.25,4.8,z,[0,0,-.569],13));
   [-.3,8.3].forEach(z=>B.O(box(.6,.38,.55,G),13.3,4.25,z,[0,0,0],11));
   const lightM = mat('#fffaf0',{glow:1.4});
   [.8,7.2].forEach(z=>{ const l=new THREE.Mesh(new THREE.CapsuleGeometry(.34,.5,6,18), lightM); l.scale.x=.4; B.O(l,18.02,3.05,z,[0,0,0],9); });
   B.O(new THREE.Mesh(new THREE.BoxGeometry(.08,.17,5.2), lightM),18.03,3.15,4,[0,0,0],9);
   B.O(box(.06,.28,3.2,'#0f0f0f'),18.03,1.55,4,[0,0,0],4);
   [.55,7.45].forEach(z=>B.O(box(.08,.2,.55,C.orange,{glow:.5}),18.03,1.6,z,[0,0,0],4));
   [0,8].forEach(z=>B.O(box(.5,.18,.06,C.orange,{glow:.5}),17.4,1.6,z+(z?.03:-.03),[0,0,0],4));
   B.O(box(.08,.14,7.4,'#ff2a2a',{glow:1.6}),-.04,3.45,4,[0,0,0],9);
   [-.04,8.04].forEach(z=>B.O(box(5.6,.05,.04,'#e9e9e9'),9,1.66,z,[0,0,0],4));
   [4,14].forEach(x=>[-.06,8.06].forEach(z=>B.O(new THREE.Mesh(new THREE.TorusGeometry(1.55,.2,8,28,Math.PI), mat(K,{rough:.5})),x,1.3,z,[0,0,0],7)));
   const port = new THREE.Group(); port.add(box(.7,.6,.08,C.dgrey)); const led=box(.2,.2,.1,'#ffffff',{glow:.3}); const ledOff=led.material, ledOn=new THREE.MeshStandardMaterial({color:'#3dff7a', emissive:'#3dff7a', roughness:.3}); led.position.set(.18,.12,.02); port.add(led);
   B.O(port,16.2,3.1,8.05,[0,0,0],9);
   [[4,0.45,-1],[14,0.45,-1],[4,7.55,1],[14,7.55,1]].forEach(([x,z,s])=>B.O(wheel(s),x,1.3,z,[0,0,0],2));
   const dog = makeDog(); B.O(dog, 19.4, 0, 12.6, [0,.55,0], 9); anim.dog = dog;
   // charger + cable
   B.fill(20,21,0,12,9,10,C.white,{depth:1});
   B.P(20,12,9,1,1,1,C.dgrey,{tile:true});
   const scrn = box(.05,.9,.7,'#7dcfff',{glow:.8}); B.O(scrn,20.98,3.6,9.5,[0,0,0],9);
   const holster = box(.12,.55,.55,C.dgrey); B.O(holster,19.94,2.6,9.5,[0,0,0],8);
   const plug = new THREE.Group(); plug.add(box(.5,.34,.34,C.dgrey)); const pt=box(.16,.2,.2,'#111'); pt.position.x=.3; plug.add(pt);
   const HOME=V(19.5,2.6,9.5), PORT=V(16.2,3.1,8.45), START=V(19.95,3.9,9.6);
   const ch = {k:0, target:0, pct:22, lt:null};
   const ease = k=>k*k*(3-2*k);
   function plugPose(){ const e=ease(ch.k); const p=V().lerpVectors(HOME,PORT,e).add(V(0,2.2*Math.sin(Math.PI*e),0)); const ry=e*Math.PI/2; return {p, ry, back:p.clone().sub(V(Math.cos(ry),0,-Math.sin(ry)).multiplyScalar(.27))}; }
   const cable = new THREE.Mesh(new THREE.BufferGeometry(), mat(C.black));
   function setCable(){ const {p,ry,back}=plugPose(), e=ease(ch.k);
     const c = new THREE.CatmullRomCurve3([START, V(19.5,2.5,10.0), V().lerpVectors(V(19.0,.4,10.1),V(18,.25,9.8),e), V().lerpVectors(V(19.0,1.6,9.6),V(16.4,1.4,9.0),e), back]);
     cable.geometry.dispose(); cable.geometry = new THREE.TubeGeometry(c,40,.09,8); plug.position.copy(p); plug.rotation.y=ry; }
   B.O(plug,HOME.x,HOME.y,HOME.z,[0,0,0],12); B.O(cable,0,0,0,[0,0,0],12); setCable(); plug.rotation.set(0,0,0);
   const hb = hitbox(2.4,5.4,2.6); B.O(hb,20.2,2.7,9.6,[0,0,0],9); hb.castShadow=false;
   const mc=document.createElement('canvas'); mc.width=320; mc.height=110; const mg=mc.getContext('2d'); const mt=new THREE.CanvasTexture(mc); mt.colorSpace=THREE.SRGBColorSpace;
   function drawMeter(p){ mg.clearRect(0,0,320,110); mg.fillStyle='rgba(255,255,255,.95)'; mg.beginPath(); mg.roundRect(4,4,312,102,22); mg.fill();
     mg.strokeStyle='#222'; mg.lineWidth=6; mg.strokeRect(24,30,120,50); mg.fillStyle='#222'; mg.fillRect(144,44,10,22);
     mg.fillStyle=p>=100?'#2fbf5b':'#3dd16b'; mg.fillRect(30,36,108*p/100,38);
     mg.fillStyle='#222'; mg.font='bold 40px Georgia'; mg.textBaseline='middle'; mg.fillText(p>=100?'Full':Math.round(p)+'%',172,57); mt.needsUpdate=true; }
   drawMeter(ch.pct);
   const meter = new THREE.Sprite(new THREE.SpriteMaterial({map:mt, transparent:true, opacity:0, depthTest:false})); meter.scale.set(4.4,1.5,1); meter.renderOrder=5; B.O(meter,9,9.2,4,[0,0,0],18);
   return { fig:{x:21.6,y:0,z:11.3,rotY:-.5, pose:{armR:-1.55,armRz:-.35,armL:-.15,armLz:.6,headY:.25}, prop:{arm:'R', obj:cup(), rx:1.55}},
     act:'Click the charger to plug in the R2',
     hot:[{hit:[hb,plug,cable,port], glow:[plug,holster,scrn], run(){ ch.target = ch.target?0:1; setAct(ch.target?'Charging\u2026 click the charger again to unplug':'Unplugged. Click the charger to plug it back in'); }}],
     tick(t,f){ const dt = ch.lt===null?0:Math.min(t-ch.lt,.25); ch.lt=t;
       if(ch.k!==ch.target){ ch.k = THREE.MathUtils.clamp(ch.k+(ch.target?1:-1)*dt/1.2,0,1); setCable(); }
       const charging = ch.k===1;
       if(charging && ch.pct<100){ ch.pct=Math.min(100,ch.pct+dt*13); drawMeter(ch.pct); if(ch.pct>=100) setAct('Fully charged. Click the charger to unplug'); }
       meter.material.opacity += ((charging?1:0)-meter.material.opacity)*.12; meter.position.y = .15*Math.sin(t*2);
       led.material = charging ? ledOn : ledOff; ledOn.emissiveIntensity = ch.pct>=100 ? 2 : 1+Math.sin(t*4);
       anim.dog.userData.tail.rotation.x = (charging?.9:.6)*Math.sin(t*(charging?14:9)); anim.dog.userData.head.rotation.z = .12+.05*Math.sin(t*2);
       if(f) f.parts.armL.rotation.z = .55+.35*Math.sin(t*6); } };
 }},
 { id:'print', label:'Print', caption:'Something is always on the print bed.', cam:{az:.42, el:.38, dist:40, ty:4.5}, build(B, anim){
   B.base(-1,19,-1,13,C.dtan);
   B.fill(-1,19,0,27,-1,0,C.lgrey,{depth:1});
   const peg = new THREE.Mesh(new THREE.BoxGeometry(9,5,.12), new THREE.MeshStandardMaterial({map:pegTex,roughness:.6})); B.O(peg,5.5,7.4,.08,[0,0,0],16);
   B.O(box(.25,2.0,.15,C.lgrey,{metal:.5}),3,7.6,.25,[0,0,.4],17); B.O(box(.5,.3,.18,C.lgrey,{metal:.5}),3.38,8.5,.26,[0,0,.4],17);
   B.O(box(.18,1.5,.15,C.red),5,7.2,.25,[0,0,-.15],17); B.O(box(.3,.8,.18,C.yellow),4.9,8.3,.26,[0,0,-.15],17);
   B.O(box(1.6,.5,.15,C.blue),7.5,8.6,.25,[0,0,0],17);
   B.fill(11,18,15,16,0,2,C.rbrown,{plates:true});
   [[12.5,C.teal],[14.5,C.orange],[16.5,C.white]].forEach(([x,c])=>B.O(spool(c,.75,.6),x,6.75,1,[Math.PI/2,0,0],17));
   // workbench
   [[1,1],[10,1],[1,6],[10,6]].forEach(([x,z])=>B.fill(x,x+1,0,6,z,z+1,C.rbrown,{depth:1}));
   B.fill(1,11,2,3,1,7,C.rbrown,{plates:true}); B.fill(1,11,6,7,1,7,C.brown,{plates:true,tile:true});
   B.fill(2,5,3,6,2,5,C.blue,{trans:true,opacity:.45}); B.O(spool(C.lime,.6,.5),7.2,1.95,4,[Math.PI/2,0,0],3); B.O(spool(C.red,.6,.5),8.7,1.95,4,[Math.PI/2,0,0],3);
   // printer
   B.fill(2,9,7,10,2,7,C.dgrey);
   B.O(box(1.3,.7,.06,'#7dcfff',{glow:.9}),7.6,3.4,7.04,[0,0,0],8);
   B.O(new THREE.Mesh(cyl(.18,.18,.08,16),mat(C.orange)),6.3,3.4,7.05,[Math.PI/2,0,0],8);
   B.fill(2,3,10,25,4,5,C.black,{depth:1}); B.fill(8,9,10,25,4,5,C.black,{depth:1});
   B.fill(2,9,25,26,4,5,C.black,{plates:true,depth:1});
   B.O(spool(C.teal,1.0,.7),5.5,10.95,4.5,[Math.PI/2,0,0],27);
   const bed = new THREE.Group(); bed.add(box(4.6,.22,4.4,'#b08d57',{rough:.5}));
   const print = new THREE.Group(); bed.add(print);
   for(let i=0;i<14;i++){ const l=new THREE.Mesh(cyl(.62-.012*i,.64-.012*i,.11,28), mat(C.teal,{rough:.55})); l.position.y = .17+i*.11; l.visible=false; print.add(l); }
   B.O(bed,5.5,4.12,4.5,[0,0,0],10);
   const gantry = new THREE.Group();
   [-.25,.25].forEach(dy=>{ const rod = new THREE.Mesh(cyl(.07,.07,5.2,10), mat(C.lgrey,{metal:.7,rough:.2})); rod.rotation.z=Math.PI/2; rod.position.set(0,dy,.75); gantry.add(rod); });
   const head = new THREE.Group(); head.add(box(1.2,1.3,1.0,C.orange)); const fan = new THREE.Mesh(cyl(.38,.38,.06,20), mat(C.black)); fan.rotation.x=Math.PI/2; fan.position.z=.51; head.add(fan);
   const noz = new THREE.Mesh(cyl(.1,.02,.3,10), mat('#c9a24a',{metal:.8,rough:.2})); noz.position.y=-.8; head.add(noz); head.position.z=.75; gantry.add(head);
   B.O(gantry,5.5,6,4.5,[0,0,0],14);
   anim.parts = {bed, gantry, head, print};
   const phb = hitbox(6,7,5.5); B.O(phb,5.5,6.5,4.5,[0,0,0],10); phb.castShadow=false;
   const pr = {mode:'printing', start:null, colors:[C.teal,C.orange,C.red,C.lime,C.blue], ci:0, held:null, take:null, armFrom:-.35, lastPct:-1};
   return { fig:{x:12.8,y:0,z:8.6,rotY:-.85, pose:{armL:-1.0,armLz:.05,armR:-.35,headY:-.2}, prop:{arm:'L', obj:spool(C.orange,.42,.32), rx:1.0, rz:Math.PI/2}},
     act:'Printing\u2026 0%',
     hot:[{hit:[bed,phb], glow:[bed], run(now,f){
       if(pr.mode!=='done'){ setAct('Still printing. Wait for it to finish'); return; }
       const obj = print.clone(); const from = cur.root.worldToLocal(print.getWorldPosition(V())); obj.position.copy(from); cur.root.add(obj);
       if(pr.held){ pr.held.parent.remove(pr.held); }
       pr.ci++; const nm = mat(pr.colors[pr.ci%pr.colors.length],{rough:.55}); print.children.forEach(l=>{ l.material=nm; l.visible=false; });
       pr.armFrom = f.parts.armR.rotation.x; pr.take={obj,from,t:now}; pr.mode='taking'; setAct('Nice, that one came out clean');
     }}],
     tick(t,f){ const {bed,gantry,head,print} = anim.parts;
       if(pr.start===null) pr.start=t;
       if(pr.mode==='printing'){
         const n = Math.max(0,Math.min(14, Math.floor((t-pr.start)*1.8)));
         print.children.forEach((l,i)=>l.visible = i<n);
         head.position.x = Math.sin(t*5)*1.4; bed.position.z = 4.5+Math.sin(t*3.3)*.9;
         gantry.position.y += ((4.12+.17+n*.11+1.05)-gantry.position.y)*.2;
         const pct=Math.round(n/14*100); if(pct!==pr.lastPct && t>pr.start){ pr.lastPct=pct; setAct('Printing\u2026 '+pct+'%'); }
         if(n>=14){ pr.mode='done'; setAct('Print finished. Click it to take it off the bed'); }
       } else if(pr.mode==='done'){ gantry.position.y += (8.4-gantry.position.y)*.05; head.position.x*=.92; bed.position.z += (4.5-bed.position.z)*.1; }
       else if(pr.mode==='taking'){
         const k=Math.min(1,(t-pr.take.t)/1.1), e=k*k*(3-2*k), hand=f.parts.armR.userData.hand;
         f.parts.armR.rotation.x = pr.armFrom + (-1.05-pr.armFrom)*e;
         cur.root.updateMatrixWorld(true);
         const end = cur.root.worldToLocal(hand.getWorldPosition(V())).add(V(0,.05,0));
         pr.take.obj.position.lerpVectors(pr.take.from,end,e).add(V(0,Math.sin(Math.PI*e)*1.6,0)); pr.take.obj.scale.setScalar(1-.35*e); pr.take.obj.rotation.x = e*.6;
         if(k>=1){ hand.attach(pr.take.obj); pr.held=pr.take.obj; pr.mode='printing'; pr.start=t+.8; pr.lastPct=-1; }
       } } };
 }},
 { id:'code', label:'Code', caption:'Shipping code at Netflix on a split keyboard I built.', cam:{az:.8, el:.36, dist:38, ty:4.5}, build(B, anim){
   B.base(-1,19,-1,14,C.wood);
   B.fill(-1,19,0,12,-1,0,C.lav,{depth:1});
   B.fill(-1,11,12,21,-1,0,C.lav,{depth:1}); B.fill(16,19,12,21,-1,0,C.lav,{depth:1});
   B.fill(-1,19,21,27,-1,0,C.lav,{depth:1});
   B.O(box(5,3.6,.1,'#bfe3ff',{trans:true,opacity:.55}),13.5,6.6,-.45,[0,0,0],12);
   B.O(box(.25,3.6,.3,C.white),13.5,6.6,-.35,[0,0,0],13); B.O(box(5,.25,.3,C.white),13.5,6.6,-.35,[0,0,0],13);
   const poster = new THREE.Mesh(new THREE.PlaneGeometry(2.6,3.25), new THREE.MeshStandardMaterial({map:posterTex,roughness:.6}));
   const frame = new THREE.Group(); frame.add(box(2.9,3.55,.12,C.black)); poster.position.z=.07; frame.add(poster);
   B.O(frame,4.5,7.0,.1,[0,0,0],16);
   B.fill(4,14,0,1,6,13,C.blue,{plates:true,tile:true});
   [[2,2],[14,2],[2,6],[14,6]].forEach(([x,z])=>B.fill(x,x+1,0,8,z,z+1,C.black,{depth:1}));
   B.fill(2,15,8,9,2,7,C.white,{plates:true,tile:true});
   // monitor
   B.P(7,9,3,3,1,1,C.black,{tile:true});
   B.O(box(.5,1.9,.35,C.dgrey),8.5,4.5,3.5,[0,0,0],10);
   const mon = new THREE.Group(); mon.add(box(8,4.4,.32,C.black));
   const scr = new THREE.Mesh(new THREE.PlaneGeometry(7.6,4.0), new THREE.MeshStandardMaterial({map:codeTex, emissive:'#ffffff', emissiveMap:codeTex, emissiveIntensity:.9})); scr.position.z=.17; mon.add(scr); anim.scr=scr; anim.codeMat=scr.material; anim.mon=mon;
   B.O(mon,8.5,6.7,3.75,[0,0,0],12);
   // split keyboard
   [-1,1].forEach(s=>{
     const half = new THREE.Group(); half.add(box(2.5,.18,1.5,C.dgrey));
     for(let r=0;r<3;r++) for(let c=0;c<5;c++){ const accent = (s<0&&r===0&&c===0)||(s>0&&r===0&&c===4); const k=box(.4,.14,.36, accent?C.orange:(r===1&&(c===1||c===3))?C.white:'#d7d2c8',{r:.05}); k.position.set(-.96+c*.48,.15,-.48+r*.48); half.add(k); }
     const th=box(.5,.14,.4,C.orange,{r:.05}); th.position.set(s<0?.9:-.9,.15,.95); half.add(th);
     B.O(half,8.5+s*1.75,3.7,6.1,[0,s*.18,0],10); (anim.kb ||= []).push(half);
   });
   // mug, plant, lamp
   const mug = new THREE.Group(); mug.add(new THREE.Mesh(cyl(.38,.38,.8,24),mat(C.white))); const cof=new THREE.Mesh(cyl(.33,.33,.02,20),mat('#3b2412')); cof.position.y=.38; mug.add(cof);
   const hdl = new THREE.Mesh(new THREE.TorusGeometry(.22,.07,8,16,Math.PI), mat(C.white)); hdl.position.x=.38; hdl.rotation.z=-Math.PI/2; mug.add(hdl);
   B.O(mug,13,4.0,5.2,[0,-.6,0],10);
   B.R(2,9,3,3,C.rbrown,{r:.55}); [[0,.0],[.5,.6],[-.5,.9],[.2,1.3]].forEach(([dx,dy],i)=>{ const lf=new THREE.Mesh(new THREE.SphereGeometry(.45,12,10), mat(i%2?C.green:C.lime)); lf.scale.set(1,.55,.7); B.O(lf,2.5+dx,5.0+dy,3.5+(i%2?.2:-.1),[0,0,(i-1.5)*.4],13+i); });
   const lamp = new THREE.Group(); lamp.add(Object.assign(new THREE.Mesh(cyl(.5,.55,.15,20),mat(C.black)),{}));
   const a1 = box(.12,2.2,.12,C.black); a1.position.set(-.3,1.05,0); a1.rotation.z=.28; lamp.add(a1);
   const a2 = box(.12,1.6,.12,C.black); a2.position.set(-.1,2.35,0); a2.rotation.z=-1.1; lamp.add(a2);
   const sh = new THREE.Mesh(cyl(.2,.5,.6,20,true), mat(C.black,{double:true})); sh.position.set(.55,2.45,0); sh.rotation.z=.5; lamp.add(sh);
   const bulb = new THREE.Mesh(new THREE.SphereGeometry(.18,12,10), mat('#ffe9a8',{glow:2})); bulb.position.set(.62,2.3,0); lamp.add(bulb);
   B.O(lamp,13.6,3.7,3.0,[0,Math.PI,0],12);
   const pl = new THREE.PointLight('#ffd58a', 6, 7); pl.position.set(12.9,5.8,3); B.O(pl,0,0,0,[0,0,0],13);
   // chair
   const chair = new THREE.Group();
   [0,Math.PI/2].forEach(r=>{ const b=box(2.2,.15,.25,C.black); b.rotation.y=r+Math.PI/4; b.position.y=.25; chair.add(b); });
   [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dz])=>{ const w=new THREE.Mesh(new THREE.SphereGeometry(.13,10,8),mat(C.dgrey)); w.position.set(dx*.78*Math.SQRT1_2-dz*.78*Math.SQRT1_2,.12,dx*.78*Math.SQRT1_2+dz*.78*Math.SQRT1_2); chair.add(w); });
   const col = new THREE.Mesh(cyl(.13,.13,1.3,12),mat(C.lgrey,{metal:.5})); col.position.y=1.0; chair.add(col);
   const seat = box(2.0,.3,2.0,C.dgrey); seat.position.y=1.75; chair.add(seat);
   const back = box(2.0,2.4,.3,C.dgrey); back.position.set(0,3.1,.95); back.rotation.x=-.08; chair.add(back);
   const sup = box(.25,1.2,.15,C.black); sup.position.set(0,2.2,.95); chair.add(sup);
   B.O(chair,8.5,.4,7.9,[0,0,0],1);
   const sdog = makeSleepingDog(); B.O(sdog,16.9,.02,4.6,[0,-.9,0],9); anim.sleep = sdog;
   const dc=document.createElement('canvas'); dc.width=760; dc.height=400; const dg=dc.getContext('2d'); const dtex=new THREE.CanvasTexture(dc); dtex.colorSpace=THREE.SRGBColorSpace;
   const dmat = new THREE.MeshStandardMaterial({map:dtex, emissive:'#ffffff', emissiveMap:dtex, emissiveIntensity:.9});
   const LINES=[['$ git push origin main','#c0caf5'],['  \u2713 lint + tests passed (214)','#9ece6a'],['  \u2713 build 2.1s','#9ece6a'],['  \u25b8 deploying to prod','#e0af68'],['  \u2713 shipped!','#9ece6a']];
   function drawDeploy(el){ dg.fillStyle='#141824'; dg.fillRect(0,0,760,400); dg.font='30px Menlo, monospace'; dg.textBaseline='top';
     const n=Math.min(5,Math.floor(el/.55)+1);
     for(let i=0;i<n;i++){ dg.fillStyle=LINES[i][1]; dg.fillText(LINES[i][0],30,30+i*48); }
     if(n>=4){ const p=Math.min(1,(el-1.65)/1.1); dg.strokeStyle='#e0af68'; dg.lineWidth=3; dg.strokeRect(40,276,680,26); dg.fillStyle=p>=1?'#9ece6a':'#e0af68'; dg.fillRect(44,280,672*p,18); }
     if(n>=5){ dg.fillStyle='#9ece6a'; dg.font='bold 44px Menlo, monospace'; dg.fillText('\u2713 SHIPPED', 250, 330); }
     dtex.needsUpdate=true; }
   const shp = {mode:'idle', t:0, count:0, conf:[], lt:null, burst:false, wake:-1};
   const khb = hitbox(6,1.2,2.6); B.O(khb,8.5,3.8,6.1,[0,0,0],10); khb.castShadow=false;
   const CONF=[C.red,C.blue,C.yellow,C.green,C.orange,'#ffffff',C.lime,C.teal];
   function burst(){ for(let i=0;i<34;i++){ const g=new THREE.Group(); const c=CONF[i%CONF.length]; const b=box(.9,.36,.9,c); g.add(b); const st=new THREE.Mesh(studGeo,mat(c)); st.position.y=.27; g.add(st); g.traverse(m=>{if(m.isMesh) m.castShadow=true;});
     g.position.set(8.5+(Math.random()-.5)*6, 9.2, 3.8); g.rotation.set(Math.random()*6,Math.random()*6,0); cur.root.add(g);
     shp.conf.push({g, v:V((Math.random()-.5)*9, 7+Math.random()*7, 2+Math.random()*6), s:V(Math.random()*8,Math.random()*8,Math.random()*8), life:3.5+Math.random()}); } }
   return { fig:{x:8.5,y:.4+1.9-1.24,z:7.55,rotY:Math.PI, sit:true, pose:{sit:true,armL:-1.42,armR:-1.42,armLz:.22,armRz:-.22,headY:0}},
     act:'Click the keyboard to ship some code',
     hot:[{hit:[...anim.kb, khb, mon], glow:[...anim.kb], run(now){ if(shp.mode==='shipping') return; shp.mode='shipping'; shp.t=now; shp.burst=false; setAct('Deploying\u2026'); }}],
     tick(t,f){ const dt = shp.lt===null?0:Math.min(t-shp.lt,.1); shp.lt=t;
       const dog=anim.sleep, awake = t<shp.wake;
       if(awake){ dog.userData.head.rotation.z += (-.5-dog.userData.head.rotation.z)*.12; dog.userData.head.position.y += (.62-dog.userData.head.position.y)*.12; dog.userData.zs.forEach(z=>z.material.opacity*=.85); }
       else { dog.userData.head.rotation.z *= .95; sleepTick(dog,t); }
       let speed=22, amp=.06;
       if(shp.mode==='shipping'){
         const el=t-shp.t; speed=42; amp=.12; drawDeploy(el); anim.scr.material=dmat;
         if(el>2.75 && !shp.burst){ shp.burst=true; shp.count++; burst(); shp.wake=t+3.2; setAct('Shipped! '+shp.count+' deploy'+(shp.count>1?'s':'')+' today'); }
         if(el>6){ shp.mode='idle'; anim.scr.material=anim.codeMat; setAct('Shipped '+shp.count+' today. Click the keyboard to ship again'); }
       } else codeTex.offset.y = (t*.04)%1;
       shp.conf = shp.conf.filter(c=>{ c.v.y-=26*dt; c.g.position.addScaledVector(c.v,dt); c.g.rotation.x+=c.s.x*dt; c.g.rotation.y+=c.s.y*dt;
         if(c.g.position.y<.2){ c.g.position.y=.2; c.v.y*=-.35; c.v.x*=.6; c.v.z*=.6; c.s.multiplyScalar(.5); }
         c.life-=dt; if(c.life<0){ c.g.parent && c.g.parent.remove(c.g); return false; } return true; });
       if(f){ f.parts.armL.rotation.x = -1.42+amp*Math.sin(t*speed); f.parts.armR.rotation.x = -1.42+amp*Math.sin(t*speed+1.7); f.parts.head.rotation.y = f.parts.hair.rotation.y = shp.mode==='shipping'?0:.15*Math.sin(t*.7); } } };
 }},
 { id:'brew', label:'Brew', caption:'Dialing in a pour-over, Tokyo coffee-bar style.', cam:{az:.32, el:.34, dist:46, ty:4.6}, build(B, anim){
   const OAK='#d9bc90', DOAK='#7a5a3c', WALL='#f1eee8', STEEL='#cfd3d6', TOP='#f4f3ef';
   B.base(-1,21,-1,11,'#c9c3b8');
   B.fill(-1,21,0,27,-1,0,WALL,{depth:1});
   B.fill(0,20,0,4,0,5,DOAK);
   B.fill(0,20,0,6,5,8,OAK); B.fill(0,20,6,7,5,8,TOP,{plates:true,tile:true});
   [14,20].forEach(y=>B.fill(2,18,y,y+1,0,2,OAK,{plates:true,tile:true}));
   const labels=['#e2574c','#f2b134','#4d9de0','#3bb273','#7768ae','#f28f3b','#2d3047','#e15554','#93c47d','#ffd166'];
   [14,20].forEach((y,row)=>{ for(let i=0;i<9;i++){ const bag=new THREE.Group(); bag.add(box(.95,1.25,.55,i%3===1?'#1d1d1d':'#f7f5f0',{r:.08})); const lb=box(.6,.42,.03,labels[(i+row*4)%10],{r:.02}); lb.position.set(0,-.08,.28); bag.add(lb); B.O(bag,2.9+i*1.75,(y+1)*PL+.63,1.0,[0,(Math.random()-.5)*.25,0],y+1); } });
   const sign=new THREE.Mesh(new THREE.PlaneGeometry(9,1.1), new THREE.MeshStandardMaterial({map:signTex,roughness:.5})); B.O(sign,10,9.9,.02,[0,0,0],26);
   const menu=new THREE.Group(); menu.add(box(2.3,2.9,.1,'#1d1d1d')); const mp=new THREE.Mesh(new THREE.PlaneGeometry(2.1,2.65), new THREE.MeshStandardMaterial({map:menuTex,roughness:.6})); mp.position.z=.06; menu.add(mp); B.O(menu,18.9,4.2,.08,[0,0,0],12);
   // espresso machine
   const em=new THREE.Group(), ad=(o,x,y,z,r=[0,0,0])=>{ o.position.set(x,y,z); o.rotation.set(...r); em.add(o); return o; };
   ad(box(4.4,1.9,2.0,STEEL,{metal:.75,rough:.25}),0,1.2,0);
   [-2.25,2.25].forEach(x=>ad(box(.16,1.95,2.05,'#151515'),x,1.2,0));
   [-1.6,1.6].forEach(x=>[-.7,.7].forEach(z=>ad(new THREE.Mesh(cyl(.1,.12,.25,12),mat('#151515')),x,.12,z)));
   ad(box(4.3,.08,1.9,'#9aa0a5',{metal:.7}),0,2.19,0);
   [-1.4,-.5,.4,1.3].forEach(x=>{ const c=new THREE.Mesh(cyl(.17,.13,.3,16),mat('#ffffff')); ad(c,x,2.38,.1); });
   [-1.05,1.05].forEach(x=>{ ad(new THREE.Mesh(cyl(.34,.34,.3,20),mat(STEEL,{metal:.8,rough:.2})),x,.62,1.1); ad(box(.16,.16,.95,'#151515'),x,.48,1.55,[.15,0,0]); ad(new THREE.Mesh(cyl(.13,.1,.22,14),mat('#ffffff')),x,.48,1.1); });
   ad(box(4.0,.14,.75,'#9aa0a5',{metal:.7}),0,.32,1.2);
   [-.5,.5].forEach(x=>{ const gg=new THREE.Mesh(cyl(.2,.2,.05,20),mat('#ffffff')); ad(gg,x,1.75,1.02,[Math.PI/2,0,0]); });
   ad(new THREE.Mesh(cyl(.04,.04,1.0,8),mat(STEEL,{metal:.8})),1.9,.75,1.15,[.2,0,0]);
   B.O(em,3.6,2.8,6.1,[0,0,0],8);
   // grinder
   const gr=new THREE.Group(), ga=(o,x,y,z,r=[0,0,0])=>{ o.position.set(x,y,z); o.rotation.set(...r); gr.add(o); return o; };
   ga(box(1.3,1.5,1.4,'#f2f2f2',{r:.12}),0,.75,0); ga(new THREE.Mesh(cyl(.5,.55,1.0,24),mat('#f2f2f2')),0,2.0,0);
   ga(new THREE.Mesh(cyl(.5,.22,.8,24),mat('#c9b8a0',{trans:true,opacity:.5})),0,2.9,0);
   ga(new THREE.Mesh(cyl(.4,.4,.4,20),mat('#4b2e1a')),0,2.75,0);
   ga(box(.3,.35,.35,'#1d1d1d'),0,1.35,.75); ga(new THREE.Mesh(cyl(.2,.18,.32,16),mat(STEEL,{metal:.8})),0,.25,.6);
   B.O(gr,8.3,2.8,6.2,[0,-.2,0],8);
   // pour-over station (moved under the kettle spout once the fig is posed)
   const po=new THREE.Group(), pa=(o,x,y,z,r=[0,0,0])=>{ o.position.set(x,y,z); o.rotation.set(...r); po.add(o); return o; };
   pa(box(1.1,.12,1.1,'#151515'),0,.06,0); pa(box(.5,.08,.03,'#3dff7a',{glow:1.2}),0,.07,.56);
   pa(new THREE.Mesh(cyl(.33,.3,.5,24),mat('#dfe9ee',{trans:true,opacity:.35})),0,.37,0);
   const brew=pa(new THREE.Mesh(cyl(.28,.28,.1,20),mat('#5a2d12',{rough:.2})),0,.18,0);
   pa(new THREE.Mesh(cyl(.5,.16,.5,28,true),mat('#ffffff',{double:true,rough:.15})),0,.87,0);
   pa(new THREE.Mesh(cyl(.47,.47,.03,24),mat('#3b2412')),0,1.0,0);
   pa(new THREE.Mesh(cyl(.42,.15,.04,24),mat('#c8b28c')),0,1.04,0);
   brew.scale.y=.01; B.O(po,12,2.8,6.2,[0,0,0],8); anim.po=po; anim.brew=brew;
   const po2=po.clone(); B.O(po2,10.3,2.8,6.6,[0,.3,0],8);
   const served=new THREE.Group(); served.add(new THREE.Mesh(cyl(.5,.5,.05,22),mat('#ffffff'))); const scu=new THREE.Mesh(cyl(.3,.24,.38,20),mat('#ffffff')); scu.position.y=.21; served.add(scu);
   const sco=new THREE.Mesh(cyl(.27,.27,.02,20),mat('#5a2d12',{rough:.2})); sco.position.y=.39; served.add(sco);
   const sha=new THREE.Mesh(new THREE.TorusGeometry(.13,.04,8,14),mat('#ffffff')); sha.position.set(.32,.22,0); served.add(sha);
   [0,1,2].forEach(()=>{ const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:steamTex,transparent:true,opacity:0,depthWrite:false})); served.add(sp); return sp; });
   B.O(served,12,2.82,7.4,[0,-.6,0],9); served.scale.setScalar(.001); anim.served=served;
   const bhb = hitbox(2.4,3.4,3.4); B.O(bhb,12,4.2,5.2,[0,0,0],9); bhb.castShadow=false; anim.bhb=bhb;
   const bw = {mode:'idle', t:0, n:0, shown:0};
   // jars, cups, plant
   [15.4,16.4,17.4].forEach((x,i)=>{ const j=new THREE.Group(); j.add(new THREE.Mesh(cyl(.38,.38,.9,20),mat('#e9f1f4',{trans:true,opacity:.35}))); const bn=new THREE.Mesh(cyl(.34,.34,.55+i*.1,20),mat(['#4b2e1a','#6b3f1e','#3a2414'][i],{rough:.8})); bn.position.y=-.15+i*.05; j.add(bn); const lid=new THREE.Mesh(cyl(.4,.4,.1,20),mat(OAK)); lid.position.y=.5; j.add(lid); B.O(j,x,3.25,6.0,[0,0,0],8); });
   [[15.3,7.2],[16.6,7.3]].forEach(([x,z])=>{ const c=new THREE.Group(); c.add(new THREE.Mesh(cyl(.45,.45,.05,20),mat('#ffffff'))); const cu=new THREE.Mesh(cyl(.25,.2,.32,18),mat('#ffffff')); cu.position.y=.18; c.add(cu); const cf=new THREE.Mesh(cyl(.22,.22,.02,18),mat('#6b3f1e')); cf.position.y=.33; c.add(cf); B.O(c,x,2.82,z,[0,0,0],8); });
   B.R(19,7,6,2,'#ffffff',{r:.45}); [[0,0],[.3,.4],[-.3,.6],[.1,.9]].forEach(([dx,dy],i)=>{ const lf=new THREE.Mesh(new THREE.SphereGeometry(.4,12,10),mat(i%2?C.green:C.lime)); lf.scale.set(1,.55,.7); B.O(lf,19.5+dx,3.9+dy,6.5,[0,0,(i-1.5)*.4],10+i); });
   const k = kettle(); anim.tip = k.userData.tip;
   const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0,-Math.PI/2,0)).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0,0,-.32)));
   return { fig:{x:12.9,y:1.6,z:3.1,rotY:0, pose:{armR:-1.75,armL:-.85,armLz:.12,headY:-.25}, prop:{arm:'R', obj:k, worldQ:q}},
     afterFig(fg, root){
       root.updateMatrixWorld(true);
       const tip = root.worldToLocal(anim.tip.getWorldPosition(new THREE.Vector3()));
       anim.po.position.x = tip.x; anim.po.position.z = tip.z; anim.served.position.x = tip.x+.2; anim.bhb.parent.position.x = tip.x; anim.bhb.parent.position.z = tip.z-.6;
       const top = 2.8+1.06, h = Math.max(.1, tip.y - top);
       const st = new THREE.Mesh(cyl(.035,.03,h,8), mat('#d8eef6',{trans:true,opacity:.7})); st.position.set(0, 1.06+h/2, 0); st.visible=false; anim.po.add(st); anim.stream=st;
     },
     act:'Click the kettle to brew a pour-over',
     hot:[{hit:[k, anim.po, anim.bhb], glow:[k, anim.po], run(now){ if(bw.mode!=='idle') return; bw.mode='pour'; bw.t=now; setAct('Pouring\u2026 slow circles'); }}],
     tick(t,f){ const st=anim.stream, br=anim.brew, el=t-bw.t;
       let level = br.scale.y;
       if(bw.mode==='pour'){ st.visible=true; st.scale.x=st.scale.z=1+.25*Math.sin(t*30); level=.01+Math.min(1,el/4.5)*3.4;
         if(el>4.8){ bw.mode='serve'; bw.t=t; st.visible=false; } }
       else if(bw.mode==='serve'){ st.visible=false; const k=Math.min(1,el/.6); anim.served.scale.setScalar(Math.max(.001,easeOutBack(k))); bw.shown=1; level=Math.max(.01,3.41*(1-el/1.2));
         if(el>1.3){ bw.mode='idle'; bw.n++; setAct(bw.n>1?'Cup #'+bw.n+'. Click the kettle to brew another':'Enjoy! Click the kettle to brew another'); } }
       else st.visible=false;
       br.scale.y=level; br.position.y=.13+level*.05;
       anim.served.children.forEach(c=>{ if(!c.isSprite) return; const i=anim.served.children.indexOf(c); const ph=((t*.45)+i/3)%1; c.position.set(Math.sin(t*1.5+i)*.12, .5+ph*1.3, 0); c.material.opacity=bw.shown*Math.sin(ph*Math.PI)*.6; const s=.35+ph*.5; c.scale.set(s,s,s); });
       if(f) f.parts.head.rotation.y = f.parts.hair.rotation.y = -.3+.08*Math.sin(t*.8); } };
 }},
 { id:'make', label:'Make', caption:'Making sawdust in the MakeHaven woodshop.', cam:{az:.45, el:.36, dist:46, ty:3.2}, build(B, anim){
   const FLOOR='#b9b4ab', WALL='#e9e3d7', OAKW='#d9b382', STEEL='#c3c8cc', SAWR='#b8322a', YEL='#f2cd37';
   B.base(-1,23,-1,12,FLOOR);
   B.fill(-1,23,0,27,-1,0,WALL,{depth:1});
   [[0,9,1,2],[0,9,9,10]].forEach(([a,b,z0,z1])=>B.fill(a,b,0,1,z0,z1,YEL,{plates:true,tile:true,depth:1}));
   [[0,1],[8,9]].forEach(([a,b])=>B.fill(a,b,0,1,2,9,YEL,{plates:true,tile:true,depth:1}));
   const mkTex=(w,h,draw)=>canvasTex(w,h,draw);
   const signT = mkTex(1024,128,(g,w,h)=>{ g.fillStyle='#1d1d1d'; g.fillRect(0,0,w,h); g.fillStyle='#f2cd37'; g.font='600 54px Marcellus, Georgia'; g.textAlign='center'; g.textBaseline='middle'; g.fillText('MAKEHAVEN  \u00b7  WOODSHOP',w/2,h/2+4); });
   B.O(new THREE.Mesh(new THREE.PlaneGeometry(10,1.25), new THREE.MeshStandardMaterial({map:signT,roughness:.5})),9,9.7,.03,[0,0,0],26);
   // pegboard + hand tools
   const peg = new THREE.Mesh(new THREE.BoxGeometry(9,4,.12), new THREE.MeshStandardMaterial({map:pegTex,roughness:.6})); B.O(peg,6.5,5.6,.08,[0,0,0],16);
   const tool=(parts,x,y,rz=0)=>{ const g=new THREE.Group(); parts.forEach(([w,h,d,c,px,py,o])=>{ const m=box(w,h,d,c,o||{}); m.position.set(px,py,0); g.add(m); }); B.O(g,x,y,.22,[0,0,rz],17); };
   tool([[.14,1.4,.12,'#b07a4a',0,0],[.7,.24,.2,'#555',0,.75,{metal:.6}]],2.8,5.6);
   tool([[.12,1.5,.06,STEEL,0,0,{metal:.7}],[.9,.12,.08,STEEL,.39,.69,{metal:.7}]],3.9,5.8);
   [[5.0,'#c9302c'],[5.45,'#c9302c'],[5.9,'#c9302c']].forEach(([x,c],i)=>tool([[.1,.8,.06,STEEL,0,-.3,{metal:.7}],[.18,.6,.18,c,0,.35]],x,5.8-i*.08));
   tool([[1.8,.8,.04,STEEL,0,0,{metal:.6}],[.5,.5,.16,'#b07a4a',-1.0,.05]],7.6,6.4,-.08);
   [[9.2,'#e8862b'],[10.0,'#e8862b'],[10.8,'#2c6fc9']].forEach(([x,c])=>tool([[.1,1.9,.08,STEEL,0,0,{metal:.6}],[.5,.12,.12,STEEL,.2,.9,{metal:.6}],[.5,.12,.12,STEEL,.2,-.3,{metal:.6}],[.2,.55,.2,c,.42,-.62]],x,5.4));
   const tape=new THREE.Group(); tape.add(box(.55,.55,.3,YEL,{r:.12})); B.O(tape,7.3,4.4,.25,[0,0,0],17);
   // lumber rack
   [16,19,22].forEach(x=>[2.4,4.0,5.6].forEach(y=>B.O(box(.25,.2,1.7,'#1d1d1d'),x,y,.9,[0,0,0],Math.round(y/PL))));
   const woods=['#e7cfa3','#6b4a33','#a25f3c','#d9b382','#c49a6c'];
   [2.4,4.0,5.6].forEach((y,r)=>{ for(let k=0;k<3-(r===2?1:0);k++){ B.O(box(7.2,.26,.5,woods[(r*3+k)%woods.length],{rough:.7}),19,y+.23+(k%2)*.27,.5+k*.48,[0,0,0],Math.round(y/PL)+1); } });
   // dust collector + hose
   const dc=new THREE.Group(); dc.add(Object.assign(new THREE.Mesh(cyl(.8,.8,1.6,24),mat('#3f6e9a')),{})); const bag=new THREE.Mesh(cyl(.75,.8,2.4,24),mat('#ececec',{rough:.9})); bag.position.y=2.0; dc.add(bag);
   const motor=new THREE.Mesh(cyl(.45,.45,.6,18),mat('#3f6e9a')); motor.position.set(0,.2,.8); motor.rotation.x=Math.PI/2; dc.add(motor);
   B.O(dc,.8,.8,1.6,[0,0,0],4);
   const hose=new THREE.CatmullRomCurve3([V(1.4,.9,2.3),V(2.6,.3,3.0),V(4.4,.35,3.6),V(5.6,.7,3.8)]);
   B.O(new THREE.Mesh(new THREE.TubeGeometry(hose,30,.16,10),mat('#d8d8d8',{rough:.6})),0,0,0,[0,0,0],4);
   // table saw
   const saw=new THREE.Group(), sa=(o,x,y,z,r=[0,0,0])=>{ o.position.set(x,y,z); o.rotation.set(...r); saw.add(o); return o; };
   sa(box(2.8,1.5,2.8,SAWR),0,.85,0); sa(box(3.2,.12,3.2,'#2a2a2a'),0,.06,0);
   sa(box(4.6,.2,5.6,STEEL,{metal:.75,rough:.3}),0,1.7,0);
   sa(box(4.6,.02,.12,'#555'),0,1.81,0);
   const blade=new THREE.Group(); blade.add(new THREE.Mesh(cyl(.72,.72,.05,40),mat('#d7dbde',{metal:.9,rough:.2})));
   for(let i=0;i<24;i++){ const a=i/24*Math.PI*2; const tt=box(.12,.1,.07,'#9aa0a5',{metal:.8,r:.01}); tt.position.set(Math.cos(a)*.74,0,Math.sin(a)*.74); tt.rotation.y=-a; blade.add(tt); }
   const bh=new THREE.Mesh(cyl(.15,.15,.08,14),mat('#555')); blade.add(bh);
   blade.rotation.x=Math.PI/2; sa(blade,0,1.55,0);
   sa(box(.6,.5,.05,'#9aa0a5',{metal:.7}),-.75,2.0,0);
   sa(box(1.6,.8,1.0,'#cfe6f2',{trans:true,opacity:.35}),-.1,2.45,0);
   sa(box(.12,.55,.12,'#cfe6f2',{trans:true,opacity:.35}),-.9,2.12,0);
   sa(box(5.8,.3,.3,STEEL,{metal:.6}),0,1.5,2.95);
   sa(box(4.6,.4,.32,'#1d1d1d'),0,1.99,-1.55);
   sa(box(.5,.5,.4,'#1d1d1d'),2.2,1.95,-1.55);
   const sw=sa(box(.5,.35,.15,'#d52b1e',{glow:.25}),-.8,1.2,1.48);
   B.O(saw,6,0,5,[0,0,0],4);
   anim.blade=blade;
   const shb=hitbox(5,2.8,6); B.O(shb,6,1.4,5,[0,0,0],6); shb.castShadow=false;
   // workbench / outfeed
   [[9,4],[15,4],[9,7],[15,7]].forEach(([x,z])=>B.fill(x,x+1,0,4,z,z+1,'#8a6a4a',{depth:1}));
   B.fill(9,16,1,2,4,8,'#8a6a4a',{plates:true});
   B.fill(8.5,16,4,5,3,8,OAKW,{plates:true,tile:true});
   ['#e8862b','#e8862b'].forEach((c,i)=>{ const cl=new THREE.Group(); cl.add(box(.1,1.0,.1,STEEL,{metal:.6})); const j1=box(.5,.12,.14,STEEL,{metal:.6}); j1.position.set(.2,.44,0); cl.add(j1); const j2=box(.5,.12,.14,STEEL,{metal:.6}); j2.position.set(.2,-.1,0); cl.add(j2); const hd=box(.2,.45,.2,c); hd.position.set(.42,-.38,0); cl.add(hd); B.O(cl,14.4+i*.7,2.45,7.4,[0,0,0],6); });
   const mal=new THREE.Group(); mal.add(box(.9,.38,.38,'#c49a6c')); const mh=box(.14,.14,1.1,'#b07a4a'); mh.position.z=.6; mal.add(mh); B.O(mal,12.0,2.0,7.0,[0,.5,0],6);
   B.O(box(.8,.3,.5,'#3a3a3a'),10.4,1.96,7.3,[0,.2,0],6);
   // bandsaw
   const bs=new THREE.Group(), ba=(o,x,y,z)=>{ o.position.set(x,y,z); bs.add(o); return o; };
   ba(box(1.7,1.8,1.4,'#4f6b5b'),0,.9,0); ba(box(.5,3.2,.5,'#4f6b5b'),-.6,3.0,-.3);
   ba(box(1.9,1.5,1.0,'#5f7d6b'),0,4.2,0); ba(box(1.6,.12,1.6,STEEL,{metal:.7}),0,2.0,.25);
   ba(box(.04,1.7,.04,'#d7dbde',{metal:.9}),.25,2.9,.25); ba(box(.25,.3,.25,'#1d1d1d'),.25,3.6,.25);
   B.O(bs,20.8,0,7.6,[0,-.5,0],4);
   // board to rip (strip between fence and blade + offcut)
   const wm=mat(OAKW,{rough:.7});
   const strip=new THREE.Mesh(boxGeo(4,.3,1.22,.03),wm), off=new THREE.Mesh(boxGeo(4,.3,.48,.03),wm);
   const board=new THREE.Group(); strip.position.z=-.62; off.position.z=.26; board.add(strip); board.add(off);
   B.O(board,3.2,1.95,5,[0,0,0],8);
   const X0=3.2, X1=11.0;
   const dustGeo=new THREE.BoxGeometry(.09,.09,.09), dustM=mat('#e2c48e',{rough:.9});
   const cut={mode:'idle', t:0, n:0, spin:0, pile:[], dust:[], lt:null, figX:null};
   return { fig:{x:1.0,y:0,z:4.7,rotY:Math.PI/2, pose:{armL:-1.0,armR:-1.0,armLz:.08,armRz:-.08,headY:.15}},
     afterFig(fg){
       const gl=new THREE.Group();
       gl.add(new THREE.Mesh(new THREE.CylinderGeometry(.66,.66,.26,32,1,true,-.68,1.36), mat('#cfe8ff',{trans:true,opacity:.35})));
       const rim=new THREE.Mesh(new THREE.CylinderGeometry(.665,.665,.04,32,1,true,-.7,1.4), mat('#1d1d1d',{double:true})); rim.position.y=.13; gl.add(rim);
       [-1,1].forEach(s=>{ const arm=box(.03,.05,.62,'#1d1d1d'); arm.position.set(s*.655,.12,-.12); gl.add(arm); });
       gl.position.y=.6; fg.parts.head.add(gl);
       const ap=mat('#7a5a3a',{rough:.8});
       const ab=new THREE.Mesh(boxGeo(1.25,1.05,.04,.02),ap); ab.position.set(0,-.25,.43); fg.parts.torso.add(ab);
       const strap=new THREE.Mesh(boxGeo(.9,.1,.04,.01),ap); strap.position.set(0,.5,.43); fg.parts.torso.add(strap);
       const pk=new THREE.Mesh(boxGeo(.6,.35,.05,.02),mat('#6a4c30')); pk.position.set(0,-.35,.45); fg.parts.torso.add(pk);
       const sk=new THREE.Mesh(boxGeo(1.6,.95,.04,.02),ap); sk.position.set(0,-.55,.42); fg.parts.hips.add(sk);
     },
     act:'Click the table saw to rip a board',
     hot:[{hit:[shb, board], glow:[board, sw], run(now){
       if(cut.mode!=='idle' && cut.mode!=='done') return;
       if(cut.mode==='done'){
         if(cut.pile.length<7){ const pc=strip.clone(); pc.position.set(12.6, 2.12+cut.pile.length*.3, 6.9); pc.rotation.y=(Math.random()-.5)*.1; cur.root.add(pc); cut.pile.push(pc); }
         board.position.x=X0; off.position.z=.26; off.rotation.y=0;
       }
       cut.mode='spinup'; cut.t=now; setAct('Blade spinning up\u2026 glasses on');
     }}],
     tick(t,f){
       const dt = cut.lt===null?0:Math.min(t-cut.lt,.1); cut.lt=t; const el=t-cut.t;
       if(cut.figX===null && f) cut.figX=f.fig.position.x;
       let targetSpin = 0;
       if(cut.mode==='spinup'){ targetSpin=38; if(el>.7){ cut.mode='cut'; cut.t=t; setAct('Ripping\u2026 nice and steady'); } }
       else if(cut.mode==='cut'){ targetSpin=38; const k=Math.min(1,el/3.4); board.position.x = X0+(X1-X0)*k;
         if(f) f.fig.position.x = cut.figX + 1.6*Math.sin(Math.min(1,k*1.4)*Math.PI/2);
         const front=board.position.x+2, rear=board.position.x-2;
         if(front>5.3 && rear<6.7){ for(let i=0;i<3;i++){ const d=new THREE.Mesh(dustGeo,dustM); d.position.set(6+(Math.random()-.5)*.3, 2.2, 5+(Math.random()-.5)*.3); cur.root.add(d); cut.dust.push({d, v:V(-1.5-Math.random()*3, 1.5+Math.random()*3.5, (Math.random()-.5)*3), life:1+Math.random()*.6}); } }
         if(k>=1){ cut.mode='done'; cut.t=t; cut.n++; setAct('Ripped '+cut.n+' board'+(cut.n>1?'s':'')+'. Click the saw for another'); } }
       else if(cut.mode==='done'){ const k=Math.min(1,el/.5); off.position.z=.26+.3*k; off.rotation.y=-.06*k; if(f) f.fig.position.x += (cut.figX-f.fig.position.x)*.06; }
       cut.spin += (targetSpin-cut.spin)*(targetSpin?.08:.02);
       anim.blade.rotation.y += cut.spin*dt;
       cut.dust = cut.dust.filter(p=>{ p.v.y-=14*dt; p.d.position.addScaledVector(p.v,dt); if(p.d.position.y<.05){ p.d.position.y=.05; p.v.set(0,0,0); } p.life-=dt; if(p.life<0){ cur.root.remove(p.d); return false; } return true; });
     } };
 }},
];

// ---------------- renderer ----------------
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setSize(window.innerWidth,window.innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
host.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color('#f4efe6');
const camera = new THREE.PerspectiveCamera(30, window.innerWidth/window.innerHeight, .1, 500);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.enablePan = false; controls.minPolarAngle=.5; controls.maxPolarAngle=1.42; controls.minDistance=18; controls.maxDistance=90;
scene.add(new THREE.HemisphereLight('#ffffff','#c9b99a',1.3));
const sun = new THREE.DirectionalLight('#fff4e0',2.3); sun.position.set(-18,40,30); sun.castShadow = true; sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-25,right:25,top:25,bottom:-25,near:1,far:120}); sun.shadow.bias=-.0006; sun.shadow.normalBias=.02;
scene.add(sun);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(400,400), new THREE.ShadowMaterial({opacity:.1})); ground.rotation.x=-Math.PI/2; ground.position.y=-.33; ground.receiveShadow=true; scene.add(ground);

// ---------------- state & animation ----------------
let cur = { root:null, pieces:[], sc:null, fig:null, tick:null };
let phase = 'idle', t0 = 0, idx = Math.max(0, SCENES.findIndex(s=>s.id===new URLSearchParams(window.location.search).get('scene')));
let auto = !new URLSearchParams(window.location.search).has('scene'), doneAt = 0, leaving = [];
const clock = new THREE.Clock();
const easeOutBack = x=>{ const c1=1.4, c3=c1+1; return 1+c3*Math.pow(x-1,3)+c1*Math.pow(x-1,2); };
const tabs = $('tabs');
SCENES.forEach((s,i)=>{ const b=document.createElement('button'); b.textContent=s.label; b.onclick=()=>{ auto=false; go(i); }; tabs.appendChild(b); });
const camGoal = {pos:new THREE.Vector3(), target:new THREE.Vector3()};

function makeScene(i){
  const sc = SCENES[i], B = Builder(), anim = {};
  const res = sc.build(B, anim);
  const pieces = B.finish();
  const root = new THREE.Group(); scene.add(root);
  const bb = new THREE.Box3(); pieces.forEach(p=>bb.expandByPoint(p.obj.position));
  const center = bb.getCenter(new THREE.Vector3()); root.position.set(-center.x, 0, -center.z);
  let fig = null;
  if(res.fig){
    const fg = makeMinifig(); pose(fg, res.fig.pose||{});
    fg.fig.position.set(res.fig.x, res.fig.y, res.fig.z); fg.fig.rotation.y = res.fig.rotY||0; root.add(fg.fig);
    if(res.fig.prop){ const arm = fg.parts['arm'+res.fig.prop.arm]; const o = res.fig.prop.obj; o.rotation.x = res.fig.prop.rx||0; o.rotation.z = res.fig.prop.rz||0; o.position.set(0,-.2,0); arm.userData.hand.add(o); o.traverse(c=>{if(c.isMesh){c.castShadow=true;}}); if(res.fig.prop.worldQ){ root.updateMatrixWorld(true); const hq = arm.userData.hand.getWorldQuaternion(new THREE.Quaternion()); o.quaternion.copy(hq.invert().multiply(res.fig.prop.worldQ)); } }
    if(res.afterFig) res.afterFig(fg, root);
    fig = fg;
  }
  const N = pieces.length;
  pieces.sort((a,b)=>a.order-b.order);
  const all = pieces.map((p,k)=>{ root.add(p.obj); return prep(p.obj, p.base ? 0 : .25 + (k/N)*3.2 + Math.random()*.25, p.base); });
  if(fig){ ['legL','legR','hips','torso','armL','armR','head','hair'].forEach((n,j)=>all.push(prep(fig.parts[n], 3.7 + j*.13, false, true))); }
  return { root, pieces:all, sc, fig, tick:res.tick, center, hot:res.hot||[], act:res.act||'' };
}
function prep(obj, delay, isBase, isFig){
  if(isBase) obj.userData.isBase = true;
  const target = obj.position.clone(), targetQ = obj.quaternion.clone();
  const from = isBase ? target.clone().add(V(0,-8,0)) : target.clone().add(V((Math.random()-.5)*(isFig?2:26), 18+Math.random()*16, (Math.random()-.5)*(isFig?2:26)));
  const fromQ = isFig ? targetQ.clone() : new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random()*6,Math.random()*6,Math.random()*6));
  obj.position.copy(from); obj.quaternion.copy(fromQ); obj.visible = false;
  return { obj, target, targetQ, from, fromQ, delay, dur: isBase ? .8 : .75, vel:V(0,0,0), spin:V(0,0,0), isFig };
}
function setCam(sc, instant){
  const {az,el,dist,ty} = sc.cam;
  const d = dist * Math.max(1, 1.45/ (camera.aspect));
  camGoal.target.set(0,ty,0);
  camGoal.pos.set(Math.sin(az)*Math.cos(el)*d, Math.sin(el)*d + ty, Math.cos(az)*Math.cos(el)*d);
  const q = new URLSearchParams(window.location.search);
  if(q.has('fig') && cur.fig){ const fp = cur.fig.fig.getWorldPosition(new THREE.Vector3()); const dir = camGoal.pos.clone().sub(camGoal.target).normalize(); const yaw = cur.fig.fig.rotation.y; const fd = V(Math.sin(yaw),.15,Math.cos(yaw)).normalize(); camGoal.target.copy(fp).add(V(0,2.6,0)); camGoal.pos.copy(camGoal.target).addScaledVector(+q.get('fig')?dir:fd, 11); controls.minAzimuthAngle=-Infinity; controls.maxAzimuthAngle=Infinity; controls.minDistance=3; }
  if(instant){ camera.position.copy(camGoal.pos); controls.target.copy(camGoal.target); }
  controls.minAzimuthAngle = az-.7; controls.maxAzimuthAngle = az+.7;
}
function go(i, instant){
  idx = i;
  [...tabs.children].forEach((b,k)=>b.classList.toggle('on',k===i));
  $('caption').textContent = SCENES[i].caption;
  if(cur.root){
    leaving.push({root:cur.root, pieces:cur.pieces, t:clock.getElapsedTime()});
    cur.pieces.forEach(p=>{ p.lfrom = p.obj.position.clone(); p.lto = p.obj.position.clone().add(V((Math.random()-.5)*20, 25+Math.random()*15, (Math.random()-.5)*20)); p.ldelay = Math.random()*.35; });
  }
  setHover(null); cur = makeScene(i); setAct(cur.act); setCam(SCENES[i], instant); phase='build'; t0 = clock.getElapsedTime() + (leaving.length?.5:0);
}
function smash(point){
  if(phase!=='done') return;
  phase='smash'; auto=false;
  cur.pieces.forEach(p=>{
    if(p.isFig) cur.root.attach(p.obj);
    const wp = p.obj.getWorldPosition(new THREE.Vector3());
    const dir = wp.sub(point); const d = Math.max(dir.length(),1);
    dir.normalize().multiplyScalar(16/Math.sqrt(d)); dir.y = Math.abs(dir.y)+5+Math.random()*7;
    p.vel.copy(dir); p.spin.set((Math.random()-.5)*9,(Math.random()-.5)*9,(Math.random()-.5)*9);
    if(p.obj.userData.isBase) p.vel.set(0,0,0);
  });
}
const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(-9,-9); let downAt=null, lp=null, lpFired=false, hovered=null;
const actEl = $('act');
function setAct(t){ if(actEl.textContent!==t) actEl.textContent=t; }
function hotAt(){
  if(phase!=='done' || !cur.hot || !cur.hot.length) return null;
  ray.setFromCamera(mouse,camera); let best=null;
  cur.hot.forEach(h=>{ const hit=ray.intersectObjects(h.hit,true)[0]; if(hit && (!best || hit.distance<best.d)) best={h,d:hit.distance}; });
  return best && best.h;
}
function glow(h,on){ h.glow.forEach(o=>o.traverse(m=>{
  if(!m.isMesh || Array.isArray(m.material)) return;
  if(on && !m.userData.orig){ m.userData.orig=m.material; const c=m.material.clone(); if(c.emissive){ c.emissive=new THREE.Color('#ffb347'); c.emissiveIntensity=.5; } m.material=c; }
  else if(!on && m.userData.orig){ m.material.dispose(); m.material=m.userData.orig; m.userData.orig=null; }
})); }
function setHover(h){ if(h===hovered) return; if(hovered) glow(hovered,false); hovered=h; if(h) glow(h,true); renderer.domElement.style.cursor = h?'pointer':''; }
function smashAtPointer(){
  ray.setFromCamera(mouse,camera);
  const hit = ray.intersectObjects(cur.pieces.filter(p=>!p.obj.userData.isBase).map(p=>p.obj), true)[0];
  if(hit){ setHover(null); smash(hit.point); }
}
const setMouse = e=>mouse.set(e.clientX/window.innerWidth*2-1, -(e.clientY/window.innerHeight)*2+1);
winOn('pointermove', e=>{ setMouse(e); if(downAt && Math.hypot(e.clientX-downAt[0],e.clientY-downAt[1])>8) clearTimeout(lp); });
renderer.domElement.addEventListener('pointerdown', e=>{ setMouse(e); downAt=[e.clientX,e.clientY]; auto=false; lpFired=false;
  if(e.pointerType!=='mouse'){ clearTimeout(lp); lp=setTimeout(()=>{ lpFired=true; smashAtPointer(); },600); } });
renderer.domElement.addEventListener('pointerup', e=>{
  clearTimeout(lp);
  if(lpFired || e.button!==0 || !downAt || Math.hypot(e.clientX-downAt[0],e.clientY-downAt[1])>5) return;
  const h = hotAt(); if(h){ setHover(null); h.run(clock.getElapsedTime(), cur.fig); }
});
renderer.domElement.addEventListener('contextmenu', e=>{ e.preventDefault(); setMouse(e); smashAtPointer(); });
$('rebuild').onclick = ()=>{ const keep=auto; go(idx); auto=keep; };
winOn('resize', ()=>{ camera.aspect=window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth,window.innerHeight); setCam(SCENES[idx]); });

let last = 0;
function loop(){
  const now = clock.getElapsedTime(), dt = Math.min(now-last, 1/30); last = now;
  camera.position.lerp(camGoal.pos, phase==='build' ? .06 : 0); controls.target.lerp(camGoal.target, .08);
  leaving = leaving.filter(L=>{
    let alive=false;
    L.pieces.forEach(p=>{ const k = THREE.MathUtils.clamp((now-L.t-p.ldelay)/.6,0,1); if(k<1) alive=true; p.obj.position.lerpVectors(p.lfrom,p.lto,k*k); });
    if(!alive){ scene.remove(L.root); }
    return alive;
  });
  if(phase==='build'){
    let all = true;
    cur.pieces.forEach(p=>{
      const k = THREE.MathUtils.clamp((now-t0-p.delay)/p.dur,0,1);
      if(k<1) all=false;
      p.obj.visible = k>0 || p.delay===0 && now>t0;
      p.obj.position.lerpVectors(p.from,p.target,easeOutBack(k));
      p.obj.quaternion.slerpQuaternions(p.fromQ,p.targetQ,Math.min(1,k*1.3));
    });
    if(all){ phase='done'; doneAt=now; }
  } else if(phase==='done'){
    cur.tick && cur.tick(now, cur.fig);
    setHover(hotAt());
    if(hovered){ hovered.glow.forEach(o=>o.traverse(m=>{ if(m.userData.orig && m.material.emissive) m.material.emissiveIntensity=.35+.25*Math.sin(now*6); })); }
    if(auto && now-doneAt>9) go((idx+1)%SCENES.length);
  } else if(phase==='smash'){
    setHover(null);
    cur.pieces.forEach(p=>{
      if(p.obj.userData.isBase) return;
      p.vel.y -= 40*dt; p.obj.position.addScaledVector(p.vel,dt);
      p.obj.rotation.x += p.spin.x*dt; p.obj.rotation.y += p.spin.y*dt; p.obj.rotation.z += p.spin.z*dt;
      if(p.obj.position.y < .3){ p.obj.position.y=.3; p.vel.y*=-.3; p.vel.x*=.7; p.vel.z*=.7; p.spin.multiplyScalar(.55); }
    });
  }
  controls.update(); renderer.render(scene,camera); if(!disposed) raf = requestAnimationFrame(loop);
}
go(idx, true); loop();

return () => {
  disposed = true;
  cancelAnimationFrame(raf);
  winListeners.forEach(([type, fn]) => window.removeEventListener(type, fn));
  clearTimeout(lp);
  controls.dispose();
  scene.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    ms.forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
  });
  renderer.dispose();
  renderer.forceContextLoss();
  renderer.domElement.remove();
  tabs.innerHTML = "";
};
}
