/* Digitale Leute deck (Claude v12). You are the character: every "next" either runs you to the
   next place in one persistent company world or adds a point where you stand. Much of the content
   is spoken: characters talk in bubbles pinned to them, and on key lines you face the audience.
   Limb IK and walk cycle adapted from the Synths Workshops v4 characters. */
(function(){
'use strict';
const T=THREE,GW=640,GH=360,NEAR=.3,FAR=220;
const PAPER=0xfaf6ea,SAND=0xf0e9d6,BLUE=0x2b4bff,INK=0x16171a,YELLOW=0xe6ff00,PALE=0xe3e7fb,BROWN=0x5a3a22;
const BANDS=new Map([[PAPER,[0xfaf6ea,0xf0e9d6,0xddd4bd]],[SAND,[0xf0e9d6,0xe6dcc4,0xd6ccb0]],[BLUE,[0x2b4bff,0x2340dd,0x182b9a]],[YELLOW,[0xe6ff00,0xe6ff00,0xcfe600]],[INK,[0x2a2c33,0x16171a,0x16171a]],[PALE,[0xe3e7fb,0xcdd4f5,0xbcc5ed]]]);
const scaleHex=(c,f)=>(Math.round(((c>>16)&255)*f)<<16)|(Math.round(((c>>8)&255)*f)<<8)|Math.round((c&255)*f);

/* ---------- materials: explicit palette bands, object id in alpha for the outline pass ---------- */
const mats=new Map(),ids=new Map();
function idOf(key){if(!ids.has(key))ids.set(key,ids.size+2);return ids.get(key)/255;}
const VS='varying vec3 vN;void main(){vN=normalize((vec4(normalize(normalMatrix*normal),0.)*viewMatrix).xyz);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const FS='uniform vec3 c0;uniform vec3 c1;uniform vec3 c2;uniform float oid;varying vec3 vN;void main(){float l=dot(normalize(vN),normalize(vec3(-.45,.8,.4)));vec3 c=l>.5?c0:(l>-.05?c1:c2);gl_FragColor=vec4(c,oid);}';
function mat(color,idKey){
 if(idKey===undefined)idKey=color;const k=color+'|'+idKey;
 if(!mats.has(k)){const b=BANDS.get(color)||[color,scaleHex(color,.88),scaleHex(color,.72)];
  mats.set(k,new T.ShaderMaterial({uniforms:{c0:{value:new T.Color(b[0])},c1:{value:new T.Color(b[1])},c2:{value:new T.Color(b[2])},oid:{value:idOf(idKey)}},vertexShader:VS,fragmentShader:FS}));}
 return mats.get(k);
}
function flat(color,id){return new T.ShaderMaterial({uniforms:{c:{value:new T.Color(color)},oid:{value:id}},vertexShader:'void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform vec3 c;uniform float oid;void main(){gl_FragColor=vec4(c,oid);}'});}
const GROUND_ID=1/255,shadowMat=flat(0xddd4bd,GROUND_ID);

/* ---------- geometry helpers ---------- */
const geos=new Map();
function group(parent,x=0,y=0,z=0){const g=new T.Group();g.position.set(x,y,z);if(parent)parent.add(g);return g;}
function mesh(parent,geo,color,x=0,y=0,z=0){const m=new T.Mesh(geo,typeof color==='number'?mat(color):color);m.position.set(x,y,z);parent.add(m);return m;}
function box(parent,w,h,d,color,x=0,y=0,z=0,r=.03){
 r=Math.min(r,.12,w/3,h/3,d/3);const key=[w,h,d,r].join(',');let geo=geos.get(key);
 if(!geo){const s=new T.Shape(),a=w/2-r,b=h/2-r;
  s.moveTo(-a,-h/2);s.lineTo(a,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-b);s.lineTo(w/2,b);s.quadraticCurveTo(w/2,h/2,a,h/2);s.lineTo(-a,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,b);s.lineTo(-w/2,-b);s.quadraticCurveTo(-w/2,-h/2,-a,-h/2);
  geo=new T.ExtrudeGeometry(s,{depth:d-2*r,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:r*.65,bevelThickness:r,curveSegments:4});geo.translate(0,0,-d/2+r);geos.set(key,geo);}
 return mesh(parent,geo,color,x,y,z);
}
const sphereGeo=new T.SphereGeometry(1,16,12),cylGeo=new T.CylinderGeometry(1,1,1,12),circleGeo=new T.CircleGeometry(1,24),planeGeo=new T.PlaneGeometry(1,1);
function ball(parent,color,x,y,z,sx,sy=sx,sz=sx){const m=mesh(parent,sphereGeo,color,x,y,z);m.scale.set(sx,sy,sz);return m;}
function cyl(parent,r,h,color,x=0,y=0,z=0){const m=mesh(parent,cylGeo,color,x,y,z);m.scale.set(r,h,r);return m;}
function blob(parent,x,z,rx,rz){const m=mesh(parent,circleGeo,shadowMat,x,.015,z);m.rotation.x=-Math.PI/2;m.scale.set(rx,rz,1);return m;}
function shadowRect(parent,x,z,w,d){const m=mesh(parent,planeGeo,shadowMat,x,.015,z);m.rotation.x=-Math.PI/2;m.scale.set(w,d,1);return m;}
const vec=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),UP=vec(0,1,0);
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
const ease=x=>{x=clamp(x,0,1);return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;};
const env=(t,a,b,edge=.6)=>smooth((t-a)/edge)*smooth((b-t)/edge);
const angLerp=(a,b,k)=>{const d=((b-a+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;return a+d*k;};
const yawTo=(x,z,tx,tz)=>Math.atan2(tx-x,tz-z);
function connect(m,a,b){const v=vec().subVectors(b,a);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(UP,v.clone().normalize());m.scale.y=v.length();}

/* ---------- people ---------- */
function joint(a,b,l1,l2,bend){const dir=b.clone().sub(a),d=Math.min(dir.length(),l1+l2-.001);dir.normalize();const along=(l1*l1-l2*l2+d*d)/(2*d),h=Math.sqrt(Math.max(0,l1*l1-along*along));const n=bend.clone().addScaledVector(dir,-bend.dot(dir)).normalize();return a.clone().addScaledVector(dir,along).addScaledVector(n,h);}
function limb(parent,upper,lower,r){const u=cyl(parent,r,1,upper),l=cyl(parent,r*.85,1,lower);return{upper:u,lower:l,joint:ball(parent,lower,0,0,0,r*.9)};}
function solve(l,a,b,l1,l2,bend){const j=joint(a,b,l1,l2,bend);connect(l.upper,a,j);connect(l.lower,j,b);l.joint.position.copy(j);}
const headsetGeo=new T.TorusGeometry(.225,.022,6,16,Math.PI),glassGeo=new T.TorusGeometry(.06,.012,6,14),skirtGeo=new T.CylinderGeometry(.62,1,1,14);
function person(parent,o={}){
 const shirt=o.shirt??BLUE,pants=o.pants??INK,skin=o.skin??0xeab783,hair=o.hair??INK,style=o.style||'short',fat=o.build==='fat'?1:0,covered=style==='hijab'||style==='dastar';
 const root=group(parent),body=group(root),torso=group(body);if(o.h)root.scale.setScalar(o.h);
 box(torso,.47+.2*fat,.56,.29+.17*fat,shirt,0,.31,0,.1);ball(torso,shirt,0,.56,0,.28+.09*fat,.11,.16+.07*fat);box(body,.38+.2*fat,.2,.28+.15*fat,pants,0,.015,0,.06);
 if(fat)ball(torso,shirt,0,.19,.075,.335,.27,.275); // a round belly
 const skirted=o.dress||o.skirt!==undefined,legc=skirted?(o.tights??skin):pants;
 if(skirted){const sk=mesh(body,skirtGeo,o.dress?shirt:o.skirt,0,o.dress?-.2:-.17,0);sk.scale.set(.335+.13*fat,o.dress?.6:.5,.275+.11*fat);} // a skirt, or a dress in the color of the top, to just above the knee
 ball(torso,skin,0,.65,0,.075,.11,.075);
 const head=group(torso,0,.75,0);head.scale.setScalar(1.3);
 ball(head,skin,0,.06,0,.205,.25,.19);ball(head,skin,-.2,.055,0,.04,.06,.04);ball(head,skin,.2,.055,0,.04,.06,.04);
 const H=(x,y,z,sx,sy=sx,sz=sx)=>ball(head,hair,x,y,z,sx,sy,sz);
 if(!covered&&style!=='bald'){H(0,.2,-.028,.215,.135,.195);H(0,.09,-.14,.195,.19,.07);}
 if(style==='afro')H(0,.27,-.03,.31,.25,.28);
 if(style==='pony'){H(0,.17,-.22,.085);H(0,-.03,-.275,.065,.21,.065);const f=box(head,.3,.07,.1,hair,.03,.215,.125,.03);f.rotation.z=.12;} // a ponytail and a side fringe
 if(style==='bob'){H(-.19,0,-.03,.07,.19,.14);H(.19,0,-.03,.07,.19,.14);H(0,-.03,-.15,.2,.18,.075);}
 if(style==='hijab'){const c=o.scarf??PALE,S=(x,y,z,sx,sy,sz)=>ball(head,c,x,y,z,sx,sy,sz); // a headscarf: over the crown, down the back and the sides, under the chin, onto the shoulders
  S(0,.19,-.03,.232,.165,.215);S(0,.05,-.13,.215,.25,.1);S(-.185,.03,-.01,.072,.24,.17);S(.185,.03,-.01,.072,.24,.17);S(0,-.2,.03,.19,.08,.17);ball(torso,c,0,.6,0,.31,.12,.2);}
 if(style==='dastar'){const c=o.turban??BLUE,S=(x,y,z,sx,sy,sz)=>ball(head,c,x,y,z,sx,sy,sz); // a Sikh turban: the wrap, its peak, and the band low on the forehead
  S(0,.27,-.02,.245,.175,.225);S(0,.365,.01,.17,.1,.16);S(-.17,.2,-.02,.09,.135,.19);S(.17,.2,-.02,.09,.135,.19);box(head,.3,.07,.09,c,0,.2,.145,.03);}
 if(o.earrings)for(const s of[-1,1])ball(head,YELLOW,s*.215,-.03,.01,.03,.048,.03);
 if(style==='short'){const f=box(head,.32,.08,.11,hair,-.025,.215,.12,.035);f.rotation.z=-.13;}
 if(style==='buns'){H(-.13,.34,-.07,.105);H(.13,.34,-.07,.105);}
 if(style==='bun'){H(0,.35,-.1,.12);}
 if(style==='curly'){for(let i=0;i<16;i++)H(Math.sin(i*2.4)*.19,.2+Math.cos(i*1.7)*.07,Math.cos(i*2.4)*.15-.03,.09);}
 if(style==='long'){H(-.18,-.03,-.05,.07,.27,.13);H(.18,-.03,-.05,.07,.27,.13);H(0,-.15,-.15,.2,.23,.08);}
 if(o.beard){H(0,-.1,.09,.165,.105,.115);if(o.beard>1)H(0,-.2,.07,.135,.125,.105);}
 const eyes=[];for(const s of[-1,1])eyes.push(mesh(head,sphereGeo,mat(INK,skin),s*.08,.06,.172));
 eyes.forEach(e=>e.scale.set(.027,.036,.016));
 const mouth=mesh(head,sphereGeo,mat(0x754b3e,skin),0,-.075,.168);mouth.scale.set(.04,.01,.01);
 if(style==='mirza'){ // short dark hair swept up at the front, light brows, stubble
  H(0,.245,-.01,.205,.095,.185);const q=box(head,.29,.09,.15,hair,.025,.262,.095,.045);q.rotation.z=.14;q.rotation.x=-.3;
  H(-.19,.1,-.03,.04,.1,.13);H(.19,.1,-.03,.04,.1,.13);
  const st=mat(o.stubble,skin),jaw=mesh(head,sphereGeo,st,0,-.112,.012);jaw.scale.set(.186,.122,.177);
  box(head,.11,.022,.02,st,0,-.042,.186,.008);
  for(const s of[-1,1]){const b=box(head,.075,.014,.02,mat(hair,skin),s*.082,.118,.176,.005);b.rotation.z=-s*.08;}
  const nose=mesh(head,sphereGeo,mat(scaleHex(skin,.9),skin),0,.005,.198);nose.scale.set(.03,.04,.03);
  mouth.material=mat(0xc98a7a,skin);mouth.position.set(0,-.082,.196);mouth.scale.x=.052;
 }
 if(o.glasses){for(const s of[-1,1])mesh(head,glassGeo,mat(INK,skin),s*.085,.06,.19);}
 if(o.stubble&&style!=='mirza'){const st=mat(scaleHex(skin,.82),skin),jaw=mesh(head,sphereGeo,st,0,-.112,.012);jaw.scale.set(.19,.122,.18);box(head,.11,.02,.02,st,0,-.04,.184,.008);mouth.position.set(0,-.082,.197);} // a little stubble along the jaw and above the lip
 if(o.lipstick){mouth.material=mat(0xd23a55,skin);mouth.scale.x=.052;}
 if(o.headset){mesh(head,headsetGeo,mat(BLUE),0,.09,0);for(const s of[-1,1])ball(head,BLUE,s*.225,.06,0,.05,.075,.065);box(head,.02,.02,.17,BLUE,-.21,-.03,.1,.005);}
 const legs=[],arms=[];
 for(const side of[-1,1]){
  const l=limb(root,legc,legc,.082+.03*fat);l.foot=box(root,.17,.13,.31,o.shoes??PAPER,0,0,0,.045);legs.push(l);
  const a=limb(root,shirt,skin,.072+.022*fat),hand=group(root);ball(hand,skin,0,0,0,.07,.075,.05);a.hand=hand;arms.push(a);
 }
 blob(root,0,.05,.36,.3);
 const p={root,body,torso,head,eyes,mouth,legs,arms,seed:o.seed||0,fat,lip:o.lipstick?.022:.01};
 p.pose=(t,mode,a)=>pose(p,t,mode,a||{});p.pose(0,'idle');return p;
}
let BYE=0,HOP=0; // 0 to 1: everyone in the world waves goodbye, and hops while doing it
function pose(p,t,mode,a){
 const sit=mode==='sit',walk=mode==='walk',ph=t+p.seed,breath=Math.sin(ph*1.4)*.006;
 if(BYE>0&&a.push===undefined)a=Object.assign({},a,{wave:Math.max(a.wave||0,BYE),tablet:0,piano:0,gesture:0,typing:(a.typing||0)*(1-BYE)});
 const amount=walk?a.amount:0,hip=sit?.7:.97,bob=(walk?.022*Math.sin(a.phase*Math.PI*4)*amount:0)+(sit?0:HOP*.07*Math.max(0,Math.sin(ph*6.5)));
 p.body.position.set(0,hip+bob+breath,0);p.torso.rotation.set(sit?.05:(walk?.07*Math.max(0,amount-1):(a.piano?.1:0)),0,walk?.025*Math.sin(a.phase*Math.PI*2)*amount:0);
 p.head.rotation.set((a.pitch||0)+(sit?.05:0),a.yaw||0,(a.wave||0)*.08*Math.sin(ph*3)+(a.piano?.1*Math.sin(ph*2.6):0));
 const blink=1-.9*env(ph%5.7,5.2,5.45,.08);p.eyes.forEach(e=>e.scale.y=.036*blink);
 p.mouth.scale.y=(p.lip||.01)+(a.talk||0)*(.012+.016*Math.pow(Math.sin(ph*7),2))+(a.wave||0)*.012;
 for(let i=0;i<2;i++){
  const side=i?1:-1,l=p.legs[i],arm=p.arms[i],F=p.fat||0,hipPos=vec(side*(.13+.06*F),hip+bob,0);
  const foot=vec(side*(.14+.06*F),.08,.02),wrist=vec(side*(.34+.12*F),hip+.02,.03);
  if(sit){foot.set(side*.17,.08,.52);solve(l,hipPos,foot,.44,.43,vec(0,.3,1));
   const tap=(a.typing||0)*Math.max(0,Math.sin(ph*11+i*2.3));wrist.set(side*.17,1.12+tap*.035,.57);
   if(a.push!==undefined)wrist.set(side*.43,.64+.1*Math.sin(a.push),.03+.17*Math.cos(a.push)); // both hands on the wheel rims, pushing
  }else if(walk){const u=(a.phase+i*.5)%1,st=.62;
   const z=u<st?.22-.44*u/st:-.22+.44*smooth((u-st)/(1-st)),lift=u<st?0:.13*Math.sin(Math.PI*(u-st)/(1-st));
   foot.z=z*amount;foot.y+=lift*amount;wrist.z=-Math.sin(a.phase*Math.PI*2+i*Math.PI)*.2*amount;wrist.y+=.015+.06*Math.max(0,amount-1);
   solve(l,hipPos,foot,.45,.45,vec(0,0,1));
  }else solve(l,hipPos,foot,.45,.45,vec(0,0,1));
  l.foot.position.copy(foot);l.foot.position.z+=.065;
  if(a.gesture&&i===1){const g=a.gesture;wrist.set(side*(.32+g*.12),hip+.06+g*.42,.13+g*.2);}
  if(a.cheer){const g=a.cheer;wrist.lerp(vec(side*.36,hip+(sit?.95:.9),.1),g);}
  if(a.wave&&i===0){const w=a.wave;wrist.lerp(vec(-.5-.13*Math.sin(ph*7),hip+.84,.12),w);}
  if(a.tablet)wrist.set(side*.17,hip+.28,.3);
  if(a.piano){const tap=Math.max(0,Math.sin(ph*8+i*2.4));wrist.set(side*(.2+.08*Math.sin(ph*1.3+i)),.95+tap*.07,.45);}
  solve(arm,vec(side*(.28+.1*F),hip+.54+bob,0),wrist,.3,.31,vec(side*.18,-1,-.16));arm.hand.position.copy(wrist);
 }
}
/* walks a to b, stays, walks back, waits; returns the current step so callers can react */
function walker(p,a,b,o){
 const dir=Math.atan2(b[0]-a[0],b[1]-a[1]),len=Math.hypot(b[0]-a[0],b[1]-a[1]),wt=len/1.15;
 const steps=[['waitA',o.waitA,o.faceA,o.faceA],['turn',.6,o.faceA,dir],['go',wt,dir,dir],['turn',.6,dir,o.faceB],['stay',o.stay,o.faceB,o.faceB],['turn',.8,o.faceB,dir+Math.PI],['back',wt,dir+Math.PI,dir+Math.PI],['turn',.8,dir+Math.PI,o.faceA]];
 const period=steps.reduce((s,x)=>s+x[1],0);
 return t=>{let u=((t+(o.offset||0))%period+period)%period,i=0;while(u>=steps[i][1]){u-=steps[i][1];i++;}
  const[name,dur,y0,y1]=steps[i],k=u/dur;let f=i<3?0:i<6?1:0,amount=0,d=0;
  if(name==='go'||name==='back'){const e=smooth(k);f=name==='go'?e:1-e;d=e*len;amount=smooth(Math.min(d,len-d)/.25);}
  p.root.position.set(a[0]+(b[0]-a[0])*f,0,a[1]+(b[1]-a[1])*f);p.root.rotation.y=angLerp(y0,y1,smooth(k));
  return{name,k,u,dur,walk:amount>0?{phase:d/.71,amount}:null};};
}
/* someone who walks to wherever they are sent and then stands there */
function mover(p,speed=2.4){const m={p,way:[],face:0,d:0,key:null};m.speed=v=>{speed=v;};
 m.go=(pts,face)=>{m.way=pts.map(a=>a.slice());m.face=face;};
 m.snap=(x,z,face)=>{m.way=[];m.face=face;p.root.position.set(x,0,z);p.root.rotation.y=face;};
 m.place=(key,pts,face,instant)=>{if(m.key===key&&!instant)return;m.key=key;const l=pts[pts.length-1];if(instant)m.snap(l[0],l[1],face);else m.go(pts,face);};
 m.update=(t,dt,idle)=>{const r=p.root.position;
  if(m.way.length){const dx=m.way[0][0]-r.x,dz=m.way[0][1]-r.z,dist=Math.hypot(dx,dz),step=speed*dt;
   if(dist<=step){r.x=m.way[0][0];r.z=m.way[0][1];m.way.shift();}else{r.x+=dx/dist*step;r.z+=dz/dist*step;m.d+=step;p.root.rotation.y=angLerp(p.root.rotation.y,Math.atan2(dx,dz),.3);}
   p.pose(t,'walk',{phase:m.d/.71,amount:1});return true;}
  p.root.rotation.y=angLerp(p.root.rotation.y,m.face,.15);p.pose(t,'idle',idle||{});return false;};
 return m;}
const seatLoop=(p,t,off,side,extra)=>{const u=(t+off)%13,ty=env(u,.3,6,.5);p.pose(t,'sit',Object.assign({typing:ty,yaw:side*(.22+.5*env(u,8.5,11,.6)),pitch:-.14*(1-ty)},extra));};

/* ---------- furniture ---------- */
function chair(parent,x,z,yaw){const g=group(parent,x,0,z);g.rotation.y=yaw;
 box(g,.66,.07,.64,BLUE,0,.5,0,.03);box(g,.62,.13,.6,PAPER,0,.585,0,.06);box(g,.6,.72,.13,PAPER,0,1.08,-.33,.06);box(g,.1,.5,.07,BLUE,0,.74,-.41,.02);
 for(const s of[-1,1]){box(g,.07,.06,.42,BLUE,s*.37,.84,-.02,.02);box(g,.06,.28,.06,BLUE,s*.37,.7,.12,.02);}
 cyl(g,.05,.36,BLUE,0,.3,0);
 for(let i=0;i<5;i++){const a=i*Math.PI*2/5,leg=box(g,.07,.06,.4,BLUE,Math.sin(a)*.2,.11,Math.cos(a)*.2,.02);leg.rotation.y=a;ball(g,INK,Math.sin(a)*.4,.06,Math.cos(a)*.4,.06);}
 blob(g,0,0,.56,.56);return g;}
function wheelchair(parent,x,z,yaw){const g=group(parent,x,0,z);g.rotation.y=yaw;
 box(g,.62,.08,.56,INK,0,.52,0,.03);box(g,.6,.56,.08,INK,0,.88,-.3,.04);box(g,.5,.04,.2,INK,0,.15,.44,.02);
 g.wheels=[];for(const s of[-1,1]){const wg=group(g,s*.4,.37,-.08),w=cyl(wg,.36,.07,BLUE);w.rotation.z=Math.PI/2;const hub=cyl(wg,.1,.09,PAPER);hub.rotation.z=Math.PI/2;
  for(let q=0;q<3;q++){const sp=box(wg,.025,.64,.05,PAPER,s*.045,0,0,.008);sp.rotation.x=q*Math.PI/3;}g.wheels.push(wg); // spokes, so the turning shows
  const c=cyl(g,.1,.05,INK,s*.3,.1,.36);c.rotation.z=Math.PI/2;box(g,.05,.05,.5,INK,s*.34,.74,0,.02);box(g,.05,.42,.05,INK,s*.3,.31,.3,.02);box(g,.05,.3,.05,INK,s*.3,1.1,-.37,.02);}
 blob(g,0,0,.62,.62);return g;}
function prideFlag(parent,x,y,z,yaw){const g=group(parent,x,y,z);g.rotation.y=yaw; // a small Progress Pride flag on a desk stand, in its 2021 form with the intersex triangle
 const c=document.createElement('canvas');c.width=96;c.height=60;const q=c.getContext('2d');
 ['#e40303','#ff8c00','#ffed00','#008026','#004dff','#750787'].forEach((col,i)=>{q.fillStyle=col;q.fillRect(0,i*10,96,10);});
 [['#000000',50],['#613915',42],['#5bcefa',34],['#f5a9b8',26],['#ffffff',18],['#ffd800',10]].forEach(([col,ax])=>{q.fillStyle=col;q.beginPath();q.moveTo(0,0);q.lineTo(ax+14,30);q.lineTo(0,60);q.closePath();q.fill();});
 q.strokeStyle='#7902aa';q.lineWidth=3;q.beginPath();q.arc(9,30,5,0,Math.PI*2);q.stroke();
 const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.minFilter=tex.magFilter=T.NearestFilter;tex.generateMipmaps=false;
 const m=new T.Mesh(new T.PlaneGeometry(.64,.4),new T.ShaderMaterial({side:T.DoubleSide,uniforms:{map:{value:tex},oid:{value:idOf('flag')}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform sampler2D map;uniform float oid;varying vec2 vUv;void main(){gl_FragColor=vec4(texture2D(map,vUv).rgb,oid);}'}));
 m.position.set(.34,.62,0);g.add(m);box(g,.04,.86,.04,INK,0,.43,0,.01);cyl(g,.12,.05,INK,0,.025,0);return g;}
function desk(parent,x,z,w,d){const g=group(parent,x,0,z);
 box(g,w,.1,d,PAPER,0,.98,0,.04);box(g,w-.08,.1,d-.08,BLUE,0,.885,0,.03);
 for(const a of[-1,1])for(const b of[-1,1])box(g,.17,.86,.17,BLUE,a*(w/2-.24),.43,b*(d/2-.22),.03);
 shadowRect(g,.1,.1,w+.3,d+.5);return g;}
function keyboard(parent,x,y,z){const g=group(parent,x,y,z);box(g,.8,.05,.3,PALE,0,0,0,.02);for(let j=0;j<3;j++)box(g,.7,.02,.06,PAPER,0,.03,(j-1)*.085,.008);return g;}
function mug(parent,x,y,z){const g=group(parent,x,y,z);cyl(g,.1,.2,PAPER,0,.1,0);cyl(g,.105,.06,BLUE,0,.09,0);return g;}
function plant(parent,x,z,s=1){const g=group(parent,x,0,z);g.scale.setScalar(s);cyl(g,.3,.46,PAPER,0,.23,0);cyl(g,.32,.08,BLUE,0,.46,0);
 for(let i=0;i<8;i++){const a=i*2.39,leaf=ball(g,BLUE,Math.sin(a)*.24,.95+Math.cos(i*1.1)*.2,Math.cos(a)*.24,.11,.44,.06);leaf.rotation.z=-Math.sin(a)*.55;leaf.rotation.x=Math.cos(a)*.55;}
 blob(g,0,0,.45,.45);return g;}
function rack(parent,x,z){const g=group(parent,x,0,z);box(g,1.1,2.5,.9,BLUE,0,1.25,0,.06);
 for(let i=0;i<5;i++){box(g,.9,.3,.04,PALE,0,.45+i*.42,.45,.02);ball(g,i%2?YELLOW:PAPER,-.32,.45+i*.42,.48,.045,.045,.02);box(g,.4,.05,.02,BLUE,.15,.45+i*.42,.475,.01);}
 shadowRect(g,.1,.15,1.5,1.4);return g;}
function cabinet(parent,x,z,yaw){const g=group(parent,x,0,z);g.rotation.y=yaw;box(g,1.5,1.3,.8,BLUE,0,.65,0,.05);
 for(let i=0;i<2;i++){box(g,1.3,.48,.04,PALE,0,.38+i*.56,.4,.02);box(g,.34,.06,.05,BLUE,0,.38+i*.56,.43,.02);}
 for(let i=0;i<4;i++)cyl(g,.16,.07,YELLOW,-.35,1.34+i*.075,.05);for(let i=0;i<2;i++)cyl(g,.16,.07,YELLOW,.1,1.34+i*.075,.1);
 shadowRect(g,.1,.15,1.8,1.3);return g;}
function crate(parent,x,z){const g=group(parent,x,0,z); // what the pianos came in
 box(g,1.7,1.5,1.4,PAPER,0,.78,0,.06);box(g,.3,1.54,1.44,BLUE,-.35,.78,0,.03);box(g,1.74,.26,1.44,BLUE,0,.95,0,.03);box(g,.5,.36,.04,YELLOW,.42,1.2,.71,.02);
 shadowRect(g,.1,.15,2,1.9);return g;}
function pianoUnit(parent,x,z,who){const g=group(parent,x,0,z);g.rotation.y=Math.PI/2; // a yellow upright with someone at the keys, seen side-on
 box(g,1.5,1.2,.5,YELLOW,0,.62,.98,.05);box(g,1.56,.06,.56,YELLOW,0,1.25,.98,.02);box(g,1.5,.1,.36,YELLOW,0,.8,.6,.03);
 box(g,1.36,.03,.25,PAPER,0,.862,.58,.008);for(let i=0;i<7;i++)box(g,.07,.03,.14,INK,-.54+i*.18,.888,.64,.004);
 for(const s of[-1,1])box(g,.1,.78,.1,YELLOW,s*.66,.39,.5,.02);
 shadowRect(g,0,.75,1.8,1.1);return person(g,who);}
function pilotBot(parent){const g=group(parent),b=group(g); // the pilot itself: the little robot from the demo screen
 box(b,.5,.42,.36,BLUE,0,.3,0,.06);box(b,.16,.1,.02,YELLOW,0,.34,.19,.01);box(b,.62,.1,.44,INK,0,.05,0,.03);
 box(b,.86,.62,.46,BLUE,0,.88,0,.08);box(b,.64,.42,.04,PAPER,0,.88,.235,.02);
 for(const s of[-1,1]){box(b,.09,.11,.03,INK,s*.16,.93,.262,.01);box(b,.1,.22,.26,BLUE,s*.49,.88,0,.03);box(b,.045,.07,.03,INK,s*.15,.79,.262,.01);}
 box(b,.26,.045,.03,INK,0,.76,.262,.01);cyl(b,.022,.2,INK,0,1.29,0);ball(b,YELLOW,0,1.43,0,.075);
 blob(g,0,0,.42,.3);g.visible=false;g.on=false;g.t0=-9;g.t1=-9;return g;}
function shelf(parent,x,z){const g=group(parent,x,0,z);box(g,1.5,2.3,.5,BLUE,0,1.15,0,.05); // the shared library of skills
 for(let r=0;r<3;r++){box(g,1.3,.6,.06,PAPER,0,.45+r*.7,.24,.02);for(let i=0;i<5;i++)box(g,.18,.48,.2,i%2?YELLOW:PALE,-.48+i*.24,.42+r*.7,.2,.02);}
 shadowRect(g,.1,.15,1.8,1);return g;}
function yearBoard(parent,x,z){const g=group(parent,x,0,z),heads=[],notes=[]; // twelve month columns: the annual horizon
 for(const s of[-1,1])box(g,.1,2.9,.1,BLUE,s*2.25,1.45,0,.03);box(g,4.8,2.3,.1,BLUE,0,1.95,0,.05);box(g,4.6,2.1,.03,PAPER,0,1.95,.05,.02);
 for(let i=0;i<12;i++){heads.push(box(g,.3,.15,.02,i%3===0?INK:BLUE,-2.035+i*.37,2.82,.075,.01));const y=box(g,.3,.15,.02,YELLOW,-2.035+i*.37,2.82,.078,.01);y.visible=false;heads.push(y);}
 const cols=[YELLOW,PALE,BLUE,PALE];
 for(let c=0;c<12;c++)for(let r=0;r<3;r++){if((c*7+r*5)%4===3)continue;notes.push({c,m:box(g,.3,.34,.02,cols[(c+r*3)%4],-2.035+c*.37,2.42-r*.46,.075,.01)});}
 shadowRect(g,0,.2,5,.7);return{g,heads,notes};}

/* a big shared display whose screen is one canvas texture: dashboard, cleared, finished slide, or a live prototype */
const SCREEN_Z=-.955,SCREEN_Y=2.45,screenGeo=new T.PlaneGeometry(4,2.25);
function bigDisplay(parent,kind,dk){
 box(parent,4.3,2.55,.18,BLUE,0,SCREEN_Y,-1.05,.1);box(parent,.5,.22,.2,BLUE,0,1.1,-1.05,.03);box(parent,1.5,.07,.55,BLUE,0,1.06,-1,.03);
 const c=document.createElement('canvas');c.width=640;c.height=360;const g=c.getContext('2d');
 const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.minFilter=tex.magFilter=T.NearestFilter;tex.generateMipmaps=false;
 const m=new T.Mesh(screenGeo,new T.ShaderMaterial({uniforms:{map:{value:tex},oid:{value:idOf('screen')}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform sampler2D map;uniform float oid;varying vec2 vUv;void main(){gl_FragColor=vec4(texture2D(map,vUv).rgb,oid);}'}));
 m.position.set(0,SCREEN_Y,SCREEN_Z);parent.add(m);
 const R=(col,x,y,w,h)=>{g.fillStyle=col;g.fillRect(x,y,w,h);},P='#faf6ea',B='#2b4bff',K='#16171a',Y='#e6ff00',L='#e3e7fb',S='#f0e9d6';
 const frame=(x,y,w,h)=>{R(K,x,y,w,h);R(P,x+3,y+3,w-6,h-6);};
 const chrome=()=>{R(P,0,0,640,360);R(B,0,0,640,26);[P,P,Y].forEach((col,i)=>R(col,300+i*16,9,8,8));};
 let cur=null;
 return{
  paint(mode){if(mode===cur)return;cur=mode;chrome();
   if(mode==='dash'){
    if(dk===0){R(L,18,44,150,298);for(let i=0;i<4;i++)R(B,32,62+i*34,100,12);R(K,190,50,250,16);R(K,190,80,180,10);[40,64,58,96,120,150].forEach((h,i)=>R(B,196+i*44,320-h,30,h));R(Y,480,50,130,56);R(K,498,70,94,14);R(K,480,130,130,10);R(K,480,152,96,10);}
    if(dk===1){for(let c2=0;c2<3;c2++){R(L,22+c2*204,44,186,298);R(K,34+c2*204,56,90,10);for(let r=0;r<3-c2;r++){R(P,34+c2*204,80+r*74,162,60);R(r===0&&c2===1?Y:B,44+c2*204,92+r*74,70,10);R(K,44+c2*204,112+r*74,120,6);}}}
    if(dk===2){R(K,24,48,220,16);R(K,24,76,150,10);[30,44,60,84,120,170,230].forEach((h,i)=>R(i===6?Y:B,30+i*56,330-h,40,h));R(L,440,48,176,100);R(K,456,64,110,14);R(B,456,92,140,10);R(B,456,112,90,10);}
    if(dk===3){for(let r=0;r<6;r++){R(L,22,44+r*50,596,38);R(r===2?Y:B,36,56+r*50,14,14);R(K,64,58+r*50,200+((r*67)%140),10);R(B,470,58+r*50,120,10);}}
   }
   if(mode==='done'){R(K,22,40,320,14);
    if(kind===1){frame(22,70,288,270);frame(330,70,288,270);for(let i=0;i<4;i++){R(K,42+i*60,96,48,48);R(i<3?B:P,45+i*60,99,42,42);}R(K,42,170,150,34);R(K,42,230,240,8);R(S,350,104,248,26);R(B,350,160,58,26);R(K,350,230,240,8);}
    if(kind===2){R(B,22,70,60,10);R(K,22,88,130,30);R(B,230,70,90,10);R(K,230,88,250,30);R(B,22,140,596,110);R(Y,22,240,10,10);R(Y,22,270,270,26);}
    if(kind===5){for(let r=0;r<5;r++){frame(22,66+r*56,596,46);R(K,34,76+r*56,26,26);R(Y,37,79+r*56,20,20);R(K,76,84+r*56,300+((r*53)%160),10);}}
    if(kind===6){for(let i=0;i<4;i++){const x=22+(i%2)*304,y=70+Math.floor(i/2)*138;frame(x,y,292,126);R(B,x+12,y+12,22,22);R(K,x+12,y+46,170,12);R(K,x+12,y+72,220,6);R(K,x+12,y+88,150,6);}}
    if(kind===7){R(K,22,84,596,44);R(S,25,87,590,38);R(B,25,87,274,38);R(K,292,78,18,18);R(Y,295,81,12,12);R(K,300,128,3,40);R(K,206,168,192,3);for(let i=0;i<3;i++){R(K,206+i*94,168,3,22);frame(170+i*94,190,76,34);}R(K,22,250,300,8);R(K,22,270,220,8);}
   }
   tex.needsUpdate=true;},
  party(t){cur='party';chrome(); // the working pilot: a happy pixel assistant, a chat that answers, confetti
   const f=Math.floor(t*6),bob=Math.round(Math.sin(t*5)*8);
   for(let i=0;i<26;i++){const x=(i*97+f*13*(i%3+1))%620,y=40+(i*53+f*9*((i%2)+1))%300;R([Y,B,K][i%3],x,y,8,8);}
   R(K,206,86+bob,228,188);R(B,210,90+bob,220,180);R(P,232,116+bob,176,112);
   const blink=f%14===0;R(K,262,146+bob,26,blink?6:30);R(K,352,146+bob,26,blink?6:30);if(!blink){R(Y,268,152+bob,10,10);R(Y,358,152+bob,10,10);}
   R(K,282,196+bob,76,10);R(K,272,186+bob,10,10);R(K,358,186+bob,10,10);
   R(K,312,60+bob,16,30);R(Y,304,46+bob,32,20);R(B,176,150+bob,34,60);R(B,430,150+bob,34,60);
   R(K,40,60,130,54);R(P,43,63,124,48);R(B,54,76,90,8);R(B,54,92,60,8);
   R(K,470,230,140,60);R(Y,473,233,134,54);R(K,488,248,(f%8)*12+10,10);R(K,488,266,70,8);
   R(Y,250,300,140,36);R(K,270,312,100,12);
   tex.needsUpdate=true;},
  proto(t){cur='proto';chrome(); // a coding agent at work in a terminal that fills the screen: the request, the agent writing, the checks, the change
   const ph=Math.floor(t/2.2)%4,u=(t/2.2)%1,X=14,Y0=34,W=612,H=318,row=i=>Y0+56+i*40,D='#2a2c33';
   R(K,X,Y0,W,H);[P,P,Y].forEach((col,i)=>R(col,X+16+i*20,Y0+13,10,10));R(D,X,Y0+36,W,4);
   const chev=(x,y,col)=>{R(col,x,y,8,7);R(col,x+8,y+7,8,7);R(col,x,y+14,8,7);}; // the prompt
   const spark=(cx,cy,col)=>{R(col,cx-4,cy-24,8,48);R(col,cx-24,cy-4,48,8);for(const[a,b]of[[-1,-1],[1,-1],[-1,1],[1,1]])for(let s=1;s<=3;s++)R(col,cx+a*s*6-4+(a<0?0:1),cy+b*s*6-4+(b<0?0:1),7,7);R(K,cx-4,cy-4,8,8);}; // the Claude Code mark, as pixels
   const tick=(x,y,col)=>{R(col,x,y+11,7,7);R(col,x+7,y+18,7,7);R(col,x+14,y+11,7,7);R(col,x+21,y+4,7,7);R(col,x+28,y-3,7,7);};
   const cross=(x,y,col)=>{for(let s=0;s<4;s++){R(col,x+s*7,y+s*7-3,7,7);R(col,x+21-s*7,y+s*7-3,7,7);}};
   chev(X+20,row(0)-4,Y);R(P,X+50,row(0),ph===0?Math.round(70+u*250):320,14); // the request
   if(ph>=1){const k=ph===1?Math.min(4,Math.floor(u*5)+1):4; // the agent writes
    spark(X+34,row(1)+8,Y);
    for(let i=0;i<k;i++){R(B,X+72,row(1+i),13,14);R(i===1&&ph===3?Y:P,X+96,row(1+i),[210,262,160,232][i],14);}}
   if(ph>=3){chev(X+20,row(5)-4,Y);R(P,X+50,row(5),160,14);R(Y,X+218,row(5)-3,12,20);} // the change, asked for in one line
   R(D,X+398,Y0+40,4,H-40); // the checks, on the right
   if(ph>=2){for(let i=0;i<3;i++){const ok=ph===3||i<2,y=row(i)-4;if(ph===2&&u*4<i+.3)continue;R(ok?Y:P,X+420,y-4,42,30);R(K,X+424,y,34,22);(ok?tick:cross)(X+424+(ok?0:3),y+(ok?0:3),ok?Y:P);R(P,X+476,row(i),[110,84,116][i],14);}}
   spark(X+448,Y0+262,Y);chev(X+500,Y0+250,P);R(P,X+520,Y0+266,22,7); // the spark and a command prompt, bottom right
   tex.needsUpdate=true;return ph;}};
}
function teamDesk(parent,c,kind,dk,whoA,whoB){const g=group(parent,c[0],0,c[1]);
 desk(g,0,-.6,5.8,1.6);const display=bigDisplay(g,kind,dk);display.paint('dash');
 keyboard(g,-1.95,1.06,-.02);keyboard(g,1.95,1.06,-.02);mug(g,-2.6,1.03,-.5);mug(g,2.65,1.03,-.75);
 const r={g,display};
 if(whoA){chair(g,-1.95,.7,Math.PI);r.A=person(g,whoA);r.A.root.position.set(-1.95,0,.7);r.A.root.rotation.y=Math.PI;}
 if(whoB){r.seatB=(whoB.wheels?wheelchair:chair)(g,1.95,.7,Math.PI);r.B=person(g,whoB);r.B.root.position.set(1.95,0,.7);r.B.root.rotation.y=Math.PI;}
 return r;}
function standing(parent,x,z,yaw,o,tablet){const p=person(parent,o);p.root.position.set(x,0,z);p.root.rotation.y=yaw;if(tablet)box(p.arms[0].hand,.3,.03,.4,tablet,.14,.05,.1,.01);return p;}

/* ---------- renderer, world ---------- */
const canvas=document.getElementById('world'),stage=document.getElementById('stage');
const renderer=new T.WebGLRenderer({canvas,antialias:false,alpha:false,premultipliedAlpha:false,powerPreference:'high-performance'});
renderer.setPixelRatio(1);renderer.setSize(GW,GH,false);renderer.outputColorSpace=T.SRGBColorSpace;renderer.setClearColor(PAPER,1/255);
const scene=new T.Scene(),camera=new T.PerspectiveCamera(34,16/9,NEAR,FAR),world=group(scene);

// places, in the order you visit them
const P0=[0,0],FIN=[8.4,-9.3],OPS=[14.6,-16.3],EST=[28.9,-25.1],PRD=[41.9,-34.1],PLN=[61.9,-41.1],BUY=[77.9,-50.1],TEAM=[90.9,-59.1],SHARE=[103.9,-68.1],WIDER=[120.9,-80.1]; // v12 order: pilot, cost, operations, receiving team, product, planning, buying, small team, shared area; the wider-organization desk is scenery beyond the last stop. // planning onward sits further along, leaving room for the roadmap beside the team
const ISL=[[P0,6.6],[FIN,5.6],[OPS,6.2],[EST,5.8],[PRD,5.6],[PLN,6.4],[BUY,6.2],[TEAM,6.8],[SHARE,5.8],[WIDER,5.6]];
const SEG=ISL.slice(1).map((x,i)=>[ISL[i][0],x[0]]);
const HL=[[FIN[0],FIN[1],3.9],[OPS[0]+.6,OPS[1]+.5,4.1],[EST[0]+.2,EST[1]+.3,3.9]]; // the units that have to pay for, run, and make room for the pilot: center and radius of each patch, kept apart so they read as three groups
const ground=new T.Mesh(new T.PlaneGeometry(900,900),new T.ShaderMaterial({
 uniforms:{paper:{value:new T.Color(PAPER)},sand:{value:new T.Color(SAND)},hi:{value:new T.Color(YELLOW)},hlW:{value:vec()},hl:{value:HL.map(p=>vec(p[0],p[1],p[2]))},isl:{value:ISL.map(([p,r])=>vec(p[0],p[1],r))},seg:{value:SEG.map(([a,b])=>new T.Vector4(a[0],a[1],b[0],b[1]))}},
 vertexShader:'varying vec3 wp;void main(){vec4 w=modelMatrix*vec4(position,1.);wp=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
 fragmentShader:`uniform vec3 paper;uniform vec3 sand;uniform vec3 hi;uniform vec3 hlW;uniform vec3 hl[3];uniform vec3 isl[${ISL.length}];uniform vec4 seg[${SEG.length}];varying vec3 wp;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float segd(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}
 void main(){vec2 g=floor(wp.xz);vec2 c=g+.5;float m=0.;
  for(int i=0;i<${ISL.length};i++)m=max(m,1.-smoothstep(isl[i].z*.6,isl[i].z,distance(c,isl[i].xy)));
  for(int i=0;i<${SEG.length};i++)m=max(m,1.-smoothstep(.7,2.,segd(c,seg[i].xy,seg[i].zw)));
  float ch=mod(g.x+g.y,2.),on=ch*step(hash(g)*.8+.08,m);
  float h=max(max(step(distance(c,hl[0].xy),hl[0].z)*hlW.x,step(distance(c,hl[1].xy),hl[1].z)*hlW.y),step(distance(c,hl[2].xy),hl[2].z)*hlW.z);
  vec3 col=mix(paper,sand,on);col=mix(col,hi,h*ch);
  gl_FragColor=vec4(col,${GROUND_ID});}`}));
ground.rotation.x=-Math.PI/2;scene.add(ground);
const sky=new T.Mesh(new T.SphereGeometry(150,32,16),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,
 uniforms:{c0:{value:new T.Color(PAPER)},c1:{value:new T.Color(0xeff0f3)},c2:{value:new T.Color(PALE)},c3:{value:new T.Color(0xcdd4f5)},c4:{value:new T.Color(0xbcc5ed)}},
 vertexShader:'varying vec3 d;void main(){d=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:`uniform vec3 c0;uniform vec3 c1;uniform vec3 c2;uniform vec3 c3;uniform vec3 c4;varying vec3 d;
 void main(){float h=normalize(d).y;vec3 c=h<.03?c0:(h<.075?c1:(h<.13?c2:(h<.2?c3:c4)));gl_FragColor=vec4(c,${GROUND_ID});}`}));
scene.add(sky);
const CLOUD_ROT=0,clouds=group(scene),cloudMat=flat(PAPER,idOf('cloud')); // the sky holds still, so no cloud drifts behind a headline or a quote
[[16,9],[52,11],[95,8.5],[140,12],[180,9.5],[-140,11],[-100,8.5],[-75,12],[-30,9.5]].forEach(([az,cy],i)=>{const a=Math.PI-az*Math.PI/180,r=95+(i%3)*14,g=group(clouds,Math.sin(a)*r,cy,Math.cos(a)*r);g.rotation.y=a+Math.PI;
 const w=11+(i%3)*4;mesh(g,new T.BoxGeometry(w,2.6,2),cloudMat);mesh(g,new T.BoxGeometry(w*.6,2.6,2),cloudMat,-w*.1,2.2,0);mesh(g,new T.BoxGeometry(w*.5,2.2,2),cloudMat,w*.32,-1.9,0);});
const at=(c,x,z)=>[c[0]+x,c[1]+z];
const ringMat=flat(YELLOW,idOf('ring'));
const rings=HL.map(c=>{const m=mesh(world,new T.RingGeometry(c[2]+.14,c[2]+.5,64),ringMat,c[0],.05,c[1]);m.rotation.x=-Math.PI/2;m.visible=false;return m;});

/* pilot team */
const pilot=teamDesk(world,P0,0,0,{shirt:PAPER,pants:BLUE,skin:0x8d5a3b,style:'buns',seed:1.3},{shirt:BLUE,skin:0xeab783,hair:BROWN,style:'short',seed:4.1,wheels:true});prideFlag(pilot.g,2.55,1.03,-.95,-.5);
box(pilot.g,.5,.03,.66,YELLOW,2.6,1.045,-.1,.01).rotation.y=.25;plant(pilot.g,-3.7,-1.5,1.15);rack(pilot.g,4.2,-1.9);
const reviewer=standing(pilot.g,0,0,0,{shirt:PAPER,skin:0xc58c5c,style:'short',beard:true,glasses:true,seed:2.2,build:'fat',h:1.05},BLUE);
const reviewerWalk=walker(reviewer,[4.4,-.3],[3.1,1.05],{waitA:5,stay:6,faceA:-.5,faceB:-2.25,offset:3});
const FAN_PARK=[[6.9,-1.7,-1.2],[7.3,-.2,-1.4]],FAN_SPOT=[[-.95,.85,Math.PI+.25],[1.05,.95,Math.PI-.25]];
const fans=[{shirt:YELLOW,skin:0x6b4226,style:'afro',seed:40},{shirt:PAPER,pants:BROWN,skin:0xf0c8a0,hair:0xc9a35e,style:'pony',seed:43}].map((o,i)=>{const m=mover(person(world,o),3.6);m.snap(...FAN_PARK[i]);return m;});
/* the people responsible for spending */
const finance=teamDesk(world,FIN,2,2,{shirt:BLUE,skin:0xa86f48,style:'bun',seed:18,build:'fat'},{shirt:PAPER,pants:BLUE,skin:0xf0c8a0,style:'bald',glasses:true,seed:21});
cabinet(finance.g,-4.5,-1.5,.3);const FINP=[ // the two who stand at finance: key, look, home at the finance desk
 ['finC',{shirt:PALE,skin:0x8d5a3b,style:'short',earrings:true,lipstick:true,skirt:INK,seed:23},[-3.7,.4,1.9]],
 ['finD',{shirt:PALE,pants:BLUE,skin:0xf0c8a0,hair:0xc9a35e,style:'short',glasses:true,h:1.04,seed:25},[-2.75,1.35,2.3]]
].map(([key,o,home])=>{const m=mover(person(world,o),6);m.snap(...at(FIN,home[0],home[1]),home[2]);return{key,m,home};});
const NEWC={finC:{spot:[4.3,1.6],via:[[5.6,-1.1]]},s3:{spot:[3.4,2.4],wing:[8.6,1.4],via:[[5.2,2.9]]},estR:{spot:[.5,2.6],wing:[9.3,2.6],via:[[5.3,3.6],[1.6,3.6]]}},coYaw=s=>yawTo(s[0],s[1],0,-.8),NOTE_T=[-9,-9,-9]; // the three who come to the demo from finance, operations, and the team that takes it over: where they stand at the screen, where two of them wait out of sight to the right, the way in; and when each one's note went up
/* operations: four people who each have a question about running the pilot */
const ops=teamDesk(world,OPS,0,3,{shirt:PALE,skin:0xeab783,hair:0xc9a35e,style:'bob',seed:27},{shirt:BLUE,skin:0x6b4226,style:'short',beard:true,seed:30});
rack(ops.g,3.6,-2);rack(ops.g,4.8,-2);rack(ops.g,6,-2);
const OPS_HUD=[[2.0,2.95],[3.25,1.75],[4.3,2.95],[5.55,1.75]]; // where the four stand together during the example
const opsM=[[-3.15,{shirt:YELLOW,skin:0xd9a273,style:'curly',h:.92,seed:33}],[-.65,{shirt:PAPER,skin:0x8d5a3b,style:'hijab',scarf:BLUE,seed:36}],[1.85,{shirt:PALE,skin:0xf0c8a0,hair:BROWN,style:'short',glasses:true,build:'fat',seed:39}],[4.35,{shirt:YELLOW,skin:0xa86f48,style:'buns',dress:true,seed:42}]].map(([x,o],i)=>{const p=person(world,o);if(i%2)box(p.arms[0].hand,.3,.03,.4,PAPER,.14,.05,.1,.01);const mv=mover(p,4.4);mv.home=x;mv.snap(...at(OPS,x,2.2),0);return mv;}),opsS=opsM.map(mv=>mv.p);
/* the established team that would receive the pilot: it is busy serving customers */
const est=teamDesk(world,EST,0,3,{shirt:PALE,skin:0xd9a273,style:'bob',headset:true,seed:50},{shirt:PAPER,pants:BROWN,skin:0x8d5a3b,style:'short',headset:true,seed:53});
plant(est.g,-3.7,-1.5,1.1);
const EST_R=[EST[0]-2.5,EST[1]+2.2,.2],estR=standing(world,EST_R[0],EST_R[1],EST_R[2],{shirt:PAPER,skin:0xf0c8a0,hair:BROWN,style:'bun',glasses:true,skirt:YELLOW,seed:56},PAPER),estRm=mover(estR,9);estRm.snap(...EST_R); // she can walk: she is one of the three who come to the demo
const estG=standing(est.g,2.9,2.2,-.35,{shirt:PAPER,pants:BLUE,skin:0x6b4226,style:'curly',headset:true,build:'fat',seed:59});
/* the obvious answer: buy a Steinway for everyone */
const buy=teamDesk(world,BUY,0,3,{shirt:BLUE,skin:0xd9a273,style:'long',seed:82},{shirt:PAPER,skin:0xa86f48,style:'afro',seed:85});
buy.display.paint('done'); // a calm, nearly empty screen behind the pianos
const PIANO_X=[-4.15,-.75,2.65];
const pianists=[{shirt:PAPER,skin:0xeab783,hair:0x9a4a2a,style:'pony',seed:88},{shirt:BLUE,skin:0x8d5a3b,style:'dastar',turban:PALE,beard:2,seed:91},{shirt:PALE,skin:0xf0c8a0,hair:BROWN,style:'buns',seed:94}].map((o,i)=>pianoUnit(buy.g,PIANO_X[i],2.4,o));
/* product team */
const product=teamDesk(world,PRD,1,1,{shirt:BLUE,skin:0xf0c8a0,hair:BROWN,style:'short',seed:6},{shirt:PAPER,pants:BLUE,skin:0x6b4226,style:'curly',seed:9});
const prodC=standing(product.g,3.8,-.5,-2.4,{shirt:PALE,pants:BROWN,skin:0xeab783,hair:BROWN,style:'bob',seed:11},PAPER);plant(product.g,-3.9,-1.6,1);
/* planning: seven people around a table and a roadmap board. Later they line up with you as one conventional team. */
const planning=group(world,PLN[0],0,PLN[1]);
const board=yearBoard(planning,-10.6,1.2);board.g.scale.setScalar(1.3);desk(planning,0,-.1,3,1.4);
for(let i=0;i<7;i++)box(planning,.5,.035,.66,YELLOW,-.75+Math.sin(i*2.1)*.04,1.05+i*.037,-.1+Math.cos(i*1.7)*.04,.01).rotation.y=Math.sin(i*1.3)*.25;
box(planning,.5,.03,.66,PALE,.6,1.045,-.15,.01).rotation.y=-.2;mug(planning,1.15,1.03,.25);
const PLN_CAST=[ // key, look, home [x,z,yaw], lineup x, waypoints on the way to the lineup
 ['plnH',{shirt:PALE,skin:0xf0c8a0,hair:0xbdb7a8,style:'pony',seed:60},[-.4,1.5,Math.PI],-3.2,[]],
 ['plnF',{shirt:BLUE,skin:0xa86f48,style:'dastar',turban:BLUE,beard:2,seed:63},[-2.6,.9,2.4],-1.6,[]],
 ['plnE',{shirt:BLUE,skin:0x6b4226,style:'curly',build:'fat',seed:66},[-2.2,-.5,1.6],-.3,[[-2.1,1.4]]],
 ['plnA',{shirt:YELLOW,skin:0xf0c8a0,hair:BROWN,style:'long',dress:true,seed:69},[-1.15,-1.45,0],1,[[-2.3,-1.2],[-2.3,1.5]]],
 ['plnG',{shirt:BLUE,skin:0xa86f48,style:'hijab',scarf:PALE,seed:72},[2.8,1,-2.2],2.3,[]],
 ['plnC',{shirt:BLUE,skin:0xd9a273,style:'short',glasses:true,seed:75},[2.3,-.45,-1.7],3.6,[]],
 ['plnD',{shirt:YELLOW,skin:0x8d5a3b,style:'buns',h:.9,seed:78},[1.3,-1.45,0],4.9,[[2.5,-1.2],[3.3,1.2]]]
].map(([key,o,home,slot,via])=>{const m=mover(person(world,o),4.4);m.snap(...at(PLN,home[0],home[1]),home[2]);return{key,m,home,slot,via};});
/* the small team: three people and a part-time designer */
const TMK=1.3,teamG=group(world,TEAM[0],0,TEAM[1]);desk(teamG,0,-.6,5.8,1.6);const teamMon=group(teamG,0,1.06*(1-TMK),-1*(1-TMK));teamMon.scale.setScalar(TMK);const teamDisplay=bigDisplay(teamMon,7,0);teamDisplay.paint('dash');
const TM={y:SCREEN_Y*TMK+1.06*(1-TMK),z:SCREEN_Z*TMK-1*(1-TMK),hw:2*TMK,hh:1.125*TMK}; // the small team's monitor is larger, so its evidence is readable from the back
keyboard(teamG,-1.95,1.06,-.02);keyboard(teamG,1.95,1.06,-.02);mug(teamG,2.65,1.03,-.75);
const TEAM_CAST=[ // key, look, home, lineup x, where they stand when the team gathers at the screen
 ['tEN',{shirt:BLUE,skin:0x8d5a3b,style:'short',glasses:true,build:'fat',seed:103},[2.3,.9,Math.PI],-6.05,[-1.5,1.6,Math.PI-.3],[-4.6,2.1,2.2]],
 ['tAI',{shirt:PALE,skin:0x6b4226,style:'buns',h:.93,seed:106},[3.5,.4,-2.6],-4.7,[1.5,1.6,Math.PI+.3],[3.6,1.5,-2.2]],
 ['tDS',{shirt:PAPER,skin:0xf0c8a0,hair:BROWN,style:'short',earrings:true,stubble:true,lipstick:true,skirt:INK,seed:109},[5.6,-1.4,.3],-3.35,[2.55,.6,-2.3],[4.5,.5,-1.9],[[4.4,1.1]]]
].map(([key,o,home,slot,gather,aside,via])=>{const m=mover(person(world,o),5.2);m.snap(...at(TEAM,home[0],home[1]),home[2]);return{key,m,home,slot,gather,aside,via:via||[]};});
/* the wider organization, where the shared rules live */
const wider=teamDesk(world,WIDER,5,2,{shirt:BLUE,skin:0xeab783,style:'bald',beard:true,seed:112},{shirt:PAPER,pants:BROWN,skin:0x6b4226,style:'long',seed:115});
rack(wider.g,4.2,-1.9);const widerC=standing(wider.g,3.6,.3,-2.5,{shirt:PALE,skin:0xa86f48,style:'buns',seed:118},BLUE);
/* the shared working area where the small team and the wider organization meet */
const share=group(world,SHARE[0],0,SHARE[1]);desk(share,0,-.6,4.8,1.6);const shareDisplay=bigDisplay(share,6,1);shareDisplay.paint('dash');plant(share,10.8,-1.8,1);
const SHARE_CAST=[
 ['shT',{shirt:PAPER,pants:BLUE,skin:0x8d5a3b,style:'afro',seed:121},[11.2,-1.2,-1.1],[-3.4,2.2]],
 ['shW',{shirt:YELLOW,skin:0xf0c8a0,style:'short',glasses:true,build:'fat',seed:124},[2.9,.9,-2.6],[3.6,2.2]],
 ['shM',{shirt:PALE,skin:0xd9a273,style:'long',h:1.05,seed:127},[1.9,.4,Math.PI],[2.2,2.2]]
].map(([key,o,home,slot])=>{const m=mover(person(world,o),3.6);m.snap(...at(SHARE,slot[0],slot[1]),0);return{key,m,home,slot};});
/* you */
const hero=person(world,{shirt:INK,pants:INK,shoes:INK,skin:0xe9b99a,hair:0x2a211c,stubble:0xb3907c,style:'mirza',seed:.5});
const GRAD=[ // the graduation scene: key, look, where they wait (to the right, out of every camera's view), where they stand, which click brings them (0: on the way there), which way they face, the way in
 ['gJ',{shirt:PALE,pants:BLUE,skin:0x6b4226,style:'short',seed:131},[10.6,-.3,-1.4],[-2.46,1.25],99,0,[]],
 ['gS',{shirt:BLUE,skin:0xd9a273,hair:0xcfcabb,style:'bob',glasses:true,earrings:true,seed:134},[11.4,-1.4,-1.2],[-1.7,2.05],99,0,[]],
 ['gA',{shirt:PAPER,pants:BROWN,skin:0x8d5a3b,style:'afro',build:'fat',seed:137},[9.6,1.6,-1.3],[3.42,1.5],3,.35,[]],
 ['gB',{shirt:YELLOW,skin:0xf0c8a0,hair:0x9a4a2a,style:'bob',seed:140},[10.5,.7,-1.6],[5.74,1.5],3,-.35,[]]
].map(([key,o,park,spot,n,face,via])=>{const m=mover(person(world,o),6.2);m.snap(...at(SHARE,park[0],park[1]),park[2]);return{key,m,park,spot,n,face,via};});
const SHT_VIA=[[3.4,-2.9],[-3.6,-2.9],[-6.2,-.8]]; // the second person who joins the pilot team walks around behind the product team's desk
const bots=[0,1,2].map(()=>{const b=pilotBot(world);b.scale.setScalar(.85);return b;}),ownDesk=desk(world,SHARE[0]+4.58,SHARE[1]+.5,1.9,1);ownDesk.visible=false;
const MOV={};[...PLN_CAST,...TEAM_CAST,...SHARE_CAST,...GRAD,...FINP].forEach(c=>MOV[c.key]=c.m);opsM.forEach((mv,i)=>MOV['s'+(i+1)]=mv);MOV.estR=estRm;
const WHO={hero,estR,estG};opsS.forEach((p,i)=>WHO['s'+(i+1)]=p);[...PLN_CAST,...TEAM_CAST,...SHARE_CAST,...GRAD,...FINP].forEach(c=>WHO[c.key]=c.m.p);
const AT={n1:[-1.42,3.5,SCREEN_Z+.06],n2:[1.3,3.56,SCREEN_Z+.06],n3:[2.3,2.75,SCREEN_Z+.06],eng:[PLN[0]+1.65,2.72,PLN[1]+2.2],board:[PLN[0]-10.6,4.2,PLN[1]+1.2],skills:[TEAM[0]-4.5,2.75,TEAM[1]-1.3]};

/* ---------- outline pass ---------- */
const target=new T.WebGLRenderTarget(GW,GH,{minFilter:T.NearestFilter,magFilter:T.NearestFilter,depthBuffer:true});
target.depthTexture=new T.DepthTexture(GW,GH,T.UnsignedIntType);
const post=new T.Scene(),postCam=new T.Camera();
post.add(new T.Mesh(new T.PlaneGeometry(2,2),new T.ShaderMaterial({depthTest:false,depthWrite:false,
 uniforms:{colorMap:{value:target.texture},depthMap:{value:target.depthTexture},px:{value:new T.Vector2(1/GW,1/GH)},ink:{value:new T.Color(INK)}},
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
 fragmentShader:`uniform sampler2D colorMap;uniform sampler2D depthMap;uniform vec2 px;uniform vec3 ink;varying vec2 vUv;
 float lin(vec2 p){float n=texture2D(depthMap,p).r*2.-1.;return 2.*${NEAR.toFixed(2)}*${FAR.toFixed(1)}/(${(FAR+NEAR).toFixed(2)}-n*${(FAR-NEAR).toFixed(2)});}
 void main(){vec4 c=texture2D(colorMap,vUv);float z=lin(vUv);float e=0.;
  vec2 o[4];o[0]=vec2(1.,0.);o[1]=vec2(-1.,0.);o[2]=vec2(0.,1.);o[3]=vec2(0.,-1.);
  for(int i=0;i<4;i++){vec2 p=vUv+o[i]*px;vec4 n=texture2D(colorMap,p);float zn=lin(p);
   float diff=step(.002,abs(n.a-c.a));
   e=max(e,diff*step(zn,z));
   e=max(e,(1.-diff)*step(1.5/255.,c.a)*step(.16+z*.015,z-zn)*step(z,24.));}
  e*=1.-.7*smoothstep(20.,42.,z);
  gl_FragColor=vec4(mix(c.rgb,ink,e),1.);
  #include <colorspace_fragment>
 }`})));

/* ---------- stops: a place to stand, a camera, and what appears there ---------- */
const MON_D=(2.25*720/677)/2/Math.tan(17*Math.PI/180);
const camM=c=>({pos:[c[0],SCREEN_Y,c[1]+SCREEN_Z+MON_D],look:[c[0],SCREEN_Y,c[1]+SCREEN_Z],ox:0,oy:0});
const camW=c=>({pos:[c[0]-4.5,5.4,c[1]+14.5],look:[c[0]+6,1,c[1]-8],ox:-275,oy:-30});
const camS=(c,xo=0)=>({pos:[c[0]+xo,3.2,c[1]+13],look:[c[0]+xo,2.2,c[1]-.5],ox:0,oy:0}); // front-on "stage": people below, speech above their heads
const camA=s=>({pos:[s[0]-1.2,1.75,s[1]+5.2],look:[s[0]+.3,1.3,s[1]],ox:-315,oy:14}); // you, facing the audience
const camC=s=>({pos:[s[0],1.7,s[1]+5.6],look:[s[0],1.15,s[1]],ox:0,oy:0}); // you, centered, speaking to the audience
const WORK_SPOT=at(OPS,.6,6.5),EX_SPOT=at(OPS,-.92,6.5),closeUp=x=>({pos:[OPS[0]+x,2,OPS[1]+6.3],look:[OPS[0]+x,2.3,OPS[1]+2.2],ox:0,oy:0}); // a close shot of one person as they speak
const HOME=[-3.3,2.3],BUY_SPOT=at(BUY,1,4.9),SAY_SPOT=at(BUY,4.6,7.6),END_SPOT=at(SHARE,-1.2,7.4);
const camCo={pos:[5.1,3.6,11.4],look:[.9,1.75,-.5],ox:-270,oy:-20}; // the close view of the demo, pulled back a little so three more people fit into the huddle
const camRow={pos:[41.93,11.53,9.21],look:[19.33,1.2,-16.79],ox:0,oy:-132}; // side-on: the pilot team on the left, then the three units that have to pay for it, run it, and make room for it
const camWide={pos:[PLN[0]-4.4,4.4,PLN[1]+21],look:[PLN[0]-4.4,2.6,PLN[1]+1],ox:0,oy:0}; // the roadmap board and all eight people in one picture
const camSay=Object.assign(camA(SAY_SPOT),{ox:-350});
const camT={pos:[TEAM[0]-2.55,3.1,TEAM[1]+10.4],look:[TEAM[0]-2.55,2.35,TEAM[1]-.6],ox:0,oy:0}; // the small team beside its monitor, which carries the evidence
const camHow={pos:[TEAM[0]+3.53,3.2,TEAM[1]+12.6],look:[TEAM[0]+.48,2.3,TEAM[1]-.6],ox:0,oy:-34}; // the team and its screen sit on the left, so the four steps can stand on the right
const camMT={pos:[TEAM[0],TM.y,TEAM[1]+TM.z+MON_D*TMK],look:[TEAM[0],TM.y,TEAM[1]+TM.z],ox:0,oy:0};
const camEx=camS(OPS,.6),DOCK_S=.56,DOCK_T=1,DOCK={s1:[757,364],s2:[911,228],s3:[1068,228],s4:[1196,364]};let dockK=0; // the example keeps the same view; the small labels sit in an arc around the group // the same view of the team, lowered a little so their questions fit above their heads
const camEnd={pos:[END_SPOT[0]-1.2,2.7,END_SPOT[1]+9.2],look:[END_SPOT[0]+1.6,1.25,END_SPOT[1]-2.6],ox:-255,oy:0}; // the last picture: you in front, everyone else behind you and to your right, the left side free for the words
const GATHER={pos:[END_SPOT[0]-1.6,5.2,END_SPOT[1]+15.5],look:[END_SPOT[0]+2.6,1,END_SPOT[1]-4.6],t:[1,1.9,1.3]}; // the wide view in which everyone arrives: seconds to pull back, to hold, and to move in on you
const STOPS=[
 {key:'title',no:1,slide:'s-title',pts:1,cam:{pos:[5.6,3,13.6],look:[.4,1.9,-.6],ox:-290,oy:-10},path:[HOME],face:[0,-1]},
 {key:'bio',no:1,slide:'s-bio',pts:1,cam:camA(HOME),path:[HOME],face:'cam',wave:true},
 {key:'q',no:2,slide:'s-q',pts:2,cam:camA(HOME),path:[HOME],face:'cam'},
 {key:'wow',no:3,slide:'s-pilot',pts:2,cam:{pos:[3.7,2.5,8.4],look:[.5,2,-.7],ox:-330,oy:-6},path:[[-2.95,1.1]],face:[0,-1]},
 {key:'pilot',no:3,slide:'s-pilot',pts:4,base:2,cam:camCo,path:[[-2.95,1.1]],face:[0,-1]}, // three people from the rest of the company join the huddle and stick their notes on the demo
 {key:'cost',no:4,slide:'m-cost',pts:3,screen:finance.display,cam:camM(FIN),path:[[-2.6,3.6],[5.4,3.9],[6.4,-1.5],at(FIN,3.3,1.1)],face:at(FIN,0,-1),gems:3,run:true}, // you leave with the two from finance
 {key:'work',no:5,slide:'s-work',pts:5,cam:camS(OPS,.6),path:[WORK_SPOT],face:at(OPS,.6,2),gems:2,shots:{2:{cam:closeUp(-3.15),solo:'s1'},3:{cam:closeUp(-.65),solo:'s2'},4:{cam:closeUp(1.85),solo:'s3'}}},
 {key:'every',no:5,slide:'s-work',pts:4,base:5,cam:camEx,path:[EX_SPOT],face:'cam'}, // the example: you turn away from the team and step to the side; the camera stays where it is
 {key:'job',no:6,slide:'s-job',pts:4,cam:camS(EST),path:[[19.8,-12.4],at(EST,.15,4.9)],face:at(EST,-2.5,2.2),gems:3},
 {key:'fast',no:7,slide:'m-fast',pts:2,screen:product.display,cam:camM(PRD),path:[at(EST,4.6,4.5),at(PRD,-3.3,1.1)],face:at(PRD,0,-1),gems:3},
 {key:'wait',no:8,slide:'s-wait',pts:4,cam:camS(PLN,.2),path:[at(PRD,-1.9,3.1),at(PRD,5.6,.9),at(PLN,-4.5,2.2)],face:'cam',gems:3,shots:{3:{cam:camS(PLN,-8)},4:{cam:camWide}}},
 {key:'buy',no:9,slide:'s-buy',pts:2,cam:camS(BUY),path:[at(PLN,-2.7,4.7),at(PLN,6.1,4.3),BUY_SPOT],face:at(BUY,1,2),gems:3},
 {key:'buysay',no:9,slide:'s-buysay',pts:2,cam:camSay,path:[SAY_SPOT],face:'cam'},
 {key:'team',no:10,slide:'s-team',pts:3,cam:camT,path:[at(BUY,6.4,3.2),at(TEAM,-7.4,-1)],face:'cam',gems:3},
 {key:'change',no:11,slide:'s-team',pts:2,base:3,cam:camT,path:[at(TEAM,-7.4,-1)],face:'cam'},
 {key:'how',no:12,slide:'s-how',pts:4,cam:camHow,path:[at(TEAM,-3.9,1.9)],face:at(TEAM,0,-1.2)},
 {key:'date',no:13,slide:'m-date',pts:4,screen:teamDisplay,cam:camMT,path:[at(TEAM,-3.9,1.1)],face:at(TEAM,0,-1)},
 {key:'room',no:14,slide:'m-room',pts:2,screen:teamDisplay,cam:camMT,path:[at(TEAM,-3.9,1.1)],face:at(TEAM,0,-1)},
 {key:'both',no:15,slide:'s-both',pts:4,cam:{pos:[SHARE[0],3.2,SHARE[1]+15],look:[SHARE[0],2.2,SHARE[1]-.5],ox:0,oy:-74},path:[at(TEAM,-3.9,3.9),at(TEAM,5.6,3.5),at(SHARE,-5.75,1.25)],face:'cam',gems:3}, // you stand with your team under the first card; the camera is far enough back that each of the three homes has air around it
 {key:'before',no:16,slide:'m-before',pts:4,screen:shareDisplay,cam:camM(SHARE),path:[at(SHARE,0,2.6)],face:at(SHARE,0,-1)},
 {key:'close',no:17,slide:'s-close',pts:2,cam:camA(END_SPOT),path:[END_SPOT],face:'cam'},
 {key:'thanks',no:17,slide:'s-thanks',pts:1,cam:camEnd,path:[END_SPOT],face:'cam',gather:GATHER} // the camera pulls back, everyone in the world comes over and waves, and the camera moves in on you
];
STOPS.forEach(s=>s.spot=s.path[s.path.length-1]);
const IDX={};STOPS.forEach((s,i)=>IDX[s.key]=i);
const FLAT=[];STOPS.forEach((s,i)=>{for(let k=1;k<=s.pts;k++)FLAT.push({stop:i,n:k});});
const fi=(key,n)=>FLAT.findIndex(f=>f.stop===IDX[key]&&f.n===n);
const SCREENS=new Map();STOPS.forEach((s,i)=>{if(s.screen){if(!SCREENS.has(s.screen))SCREENS.set(s.screen,[]);SCREENS.get(s.screen).push(i);}});

/* diamonds sit on the paths between places and are collected by running through them */
const gemGeo=new T.OctahedronGeometry(.26),gemMat=mat(YELLOW,'gem'),GEMS=[];
STOPS.forEach((s,i)=>{if(!s.gems)return;const pts=[STOPS[i-1].spot,...s.path],L=[0];for(let j=1;j<pts.length;j++)L.push(L[j-1]+Math.hypot(pts[j][0]-pts[j-1][0],pts[j][1]-pts[j-1][1]));
 for(let k=1;k<=s.gems;k++){const d=L[L.length-1]*k/(s.gems+1);let j=1;while(L[j]<d)j++;const f=(d-L[j-1])/(L[j]-L[j-1]),x=pts[j-1][0]+(pts[j][0]-pts[j-1][0])*f,z=pts[j-1][1]+(pts[j][1]-pts[j-1][1])*f;
  const m=mesh(world,gemGeo,gemMat,x,1.25,z);m.scale.set(1,1.35,1);const sh=blob(world,x,z,.2,.2);GEMS.push({m,sh,seg:i,x,z,got:false,hit:false});}});

/* cost rectangle: 667 squares of $1,500 are just over $1 million */
const cg=document.getElementById('costgrid'),cx=cg.getContext('2d'),CW=2232/61,CH=402/11;
let costLevel=-1,costT0=0,costDirty=false;
function drawCost(now){cx.clearRect(0,0,2232,402);if(costLevel<1){costDirty=false;return;}
 const t=costLevel>=2?now-costT0:0,sh=costLevel>=2?ease(t/.55):0,k=costLevel>=2?clamp((t-.6)/1.2,0,1):0;
 for(let i=1;i<667;i++){const row=Math.floor(i/61),col=i%61;if(k>0&&(col+row*4+(i*7%5)*.6)/104<=k){cx.fillStyle='#2b4bff';cx.fillRect(col*CW,(10-row)*CH,30,30);}}
 const size=402+(30-402)*sh,y=(10*CH)*sh,bw=Math.max(5,12*(1-sh)); // the pilot: starts big, shrinks into one cell
 cx.fillStyle='#16171a';cx.fillRect(0,y,size,size);cx.fillStyle='#e6ff00';cx.fillRect(bw,y+bw,size-2*bw,size-2*bw);
 if(costLevel<2||t>1.9)costDirty=false;}
function setCost(level,now){if(level===costLevel)return;if(level>=2&&costLevel<2)costT0=now;costLevel=level;costDirty=true;}

/* ---------- state ---------- */
const $=id=>document.getElementById(id),SLIDES=[...new Set(STOPS.map(s=>s.slide))].map($);
SLIDES.forEach(el=>{el._om=el.querySelector('.onmon');el._talks=[...el.querySelectorAll('.talk[data-who]')];el._tags=[...el.querySelectorAll('.tag')];});
const flowSteps=[...document.querySelectorAll('#s-how .flowv span')];
const shotOf=(S,n)=>(S.shots&&S.shots[n])||null,camOf=(S,n)=>{const sh=shotOf(S,n);return sh&&sh.cam?sh.cam:S.cam;};
const eff=()=>FLAT[state].n+(STOPS[cur].base||0); // which point of the slide we are on
const track=$('track');for(let i=0;i<17;i++)track.appendChild(document.createElement('i'));
const tails=$('tails');
// things that pop up over the world: "Wow" over the pilot team, notes over the pianos
const FLOAT=[];
[pilot.A,pilot.B,reviewer,fans[0].p,fans[1].p].forEach((p,i)=>FLOAT.push({text:'Wow',on:()=>cur===IDX.wow&&FLAT[state].n<2&&!(i>2&&fans[i-3].way.length),at:()=>{p.head.getWorldPosition(tmp);return[tmp.x,tmp.y+.62,tmp.z];}}));
[reviewer,fans[0].p,fans[1].p].forEach(p=>FLOAT.push({text:'?',on:()=>cur===IDX.wow&&FLAT[state].n>=2,at:()=>{p.head.getWorldPosition(tmp);return[tmp.x,tmp.y+.62,tmp.z];}})); // real users try it, and the spell breaks
PIANO_X.forEach((x,i)=>{for(let k=0;k<3;k++)FLOAT.push({text:['♪','$','♫'][k],note:true,on:()=>cur===IDX.buy,at:()=>[BUY[0]+x+.6+k*.45,2+.35*k,BUY[1]+2.4]});});
FLOAT.forEach(f=>{const b=document.createElement('div');b.className='bub'+(f.note?' note2':'');b.textContent=f.text;stage.insertBefore(b,tails);f.el=b;});
const carry=$('carry');
const MARKS=[['Pay for it',HL[0]],['Run it',HL[1]],['Make room for it',HL[2]]].map(([text,c],i)=>{const el=document.createElement('div');el.className='mark';el.style.setProperty('--d',i);el.innerHTML='<span class="mk"><b>'+text+'</b><i></i></span>';stage.insertBefore(el,tails);return{el,c,dy:0,on:false,t0:0};});
const aim=vec(),off={x:0,y:0};let fly=null,state=-1,cur=-1,travel=null,clock=0,dt=0,scale=1,arrivedAt=0,gemCount=0,quiet=true;
let roadOn=false,roadT0=-9,marksOn=false,marksT0=0,talkWho=null,activeEl=null,byeT0=-99,byeA=0,byeB=0;
const pl={yaw:0,face:0};
function stagePoint(el){const r=el.getBoundingClientRect(),s=stage.getBoundingClientRect();return[(r.left-s.left)/scale,(r.top-s.top)/scale];}
function flyGem(x,y){const g=document.createElement('i');g.className='gem fly';g.style.left=x+'px';g.style.top=y+'px';stage.appendChild(g);
 const[tx,ty]=stagePoint($('hud-gems'));g.getBoundingClientRect();g.style.left=tx+14+'px';g.style.top=ty+9+'px';
 setTimeout(()=>{g.remove();const h=$('hud-gems');h.classList.remove('bump');void h.offsetWidth;h.classList.add('bump');},500);}
const rh=$('runhead');let rhOn=false;
function headOf(S){const b=1+(S.base||0);let best=null;$(S.slide).querySelectorAll('h2.pt').forEach(h=>{if(+h.dataset.i<=b)best=h;});return best;}
function runHead(S){const h=S&&headOf(S);rhOn=!!h;if(h){const c=h.cloneNode(true);c.querySelectorAll('.chip-note').forEach(n=>n.remove());rh.textContent=c.textContent;}rh.classList.remove('on');} // the next headline rides along on a run, so the speaker has his cue early
function render(){const s=STOPS[cur],n=eff(),here=!travel;activeEl=null;talkWho=null;$('s-work').classList.toggle('dock',s.key==='every');$('s-work').classList.toggle('mv',!here);
 for(const el of SLIDES){const mine=el.id===s.slide,keep=mine&&!here&&travel.keep===el.id,on=mine&&(here||keep),k=keep?travel.keepN:n;
  el.classList.toggle('on',on);el.dataset.n=on?k:0;
  el.querySelectorAll('.pt').forEach(p=>p.classList.toggle('show',on&&+p.dataset.i<=k));
  el.querySelectorAll('.cl').forEach(c=>c.classList.toggle('lit',on&&+c.dataset.c<=k));if(!on)el.classList.remove('arr');
  el.querySelectorAll('.talk.grp').forEach(g=>g.classList.toggle('show',!!g.querySelector('.pt.show')));
  if(on&&(here||el.id==='s-work')){activeEl=el;let best=0; // whoever spoke last is the one talking
   for(const t of el._talks){let i=0;if(t.classList.contains('grp'))t.querySelectorAll('.pt.show').forEach(p=>i=Math.max(i,+p.dataset.i));else if(t.classList.contains('show'))i=+t.dataset.i;if(i>0&&i>=best){best=i;talkWho=t.dataset.who;}}}}
 setCost(here&&s.slide==='m-cost'?(n>=2?2:n>=1?1:0):0,clock);
 MARKS.forEach(m=>{m.on=false;m.el.classList.remove('on');});} // the ground marks of the old row view are no longer used
function paintScreens(){wider.g.visible=cur!==IDX.both; /* the desk beyond the last place stays out of the picture with the three homes */SCREENS.forEach((idx,scr)=>scr.paint(idx.includes(cur)?'blank':idx[0]<cur?'done':'dash'));if(cur===IDX.team||cur===IDX.change)teamDisplay.paint('blank');if(cur<IDX.wow)pilot.display.paint('dash');shareDisplay.paint(cur===IDX.thanks||cur===IDX.both||cur===IDX.before?'blank':'dash');} // on the thank-you slide the screen behind you is calm
/* ---------- the finale: everyone in the world comes over, stands behind you, and waves ---------- */
const FIN_ROWS=[10,9,10,9,9],FIN_X0=-.3,FIN_DX=1,FIN_Z0=-1.8,FIN_DZ=.95,FIN_D=19; // five rows, a full step apart
const FIN_CAST=[ // the front row first, each row from your side outwards
 MOV.plnC,MOV.tDS,MOV.tAI,pilot.B,MOV.tEN,MOV.plnF,MOV.s4,MOV.estR,MOV.plnD,MOV.gA,
 MOV.s2,reviewer,MOV.plnA,MOV.s1,MOV.finC,fans[0],MOV.shM,MOV.shW,MOV.gB,
 MOV.gJ,MOV.plnG,MOV.plnH,MOV.shT,pilot.A,MOV.s3,prodC,fans[1],pianists[1],widerC,
 MOV.gS,estG,finance.A,finance.B,ops.A,ops.B,est.A,MOV.plnE,wider.A,
 est.B,buy.A,buy.B,pianists[0],MOV.finD,pianists[2],product.A,product.B,wider.B];
const FIN_NEAR=new Set([MOV.shW,MOV.shM]),FIN_FAR=new Set([MOV.shT,MOV.gJ,MOV.gS,MOV.gA,MOV.gB,wider.A,wider.B,widerC]); // who walks over from close by, and who runs the real distance from where they are
const wrapA=a=>((a+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;
let finale=null,finLeft=false;
function finaleStart(instant){if(finale)return;world.updateMatrixWorld(true);const ex=END_SPOT[0],ez=END_SPOT[1],list=[];let k=0;
 FIN_ROWS.forEach((n,row)=>{for(let j=0;j<n;j++){const who=FIN_CAST[k++],m=who.update?who:null,p=m?m.p:who,r=p.root,en={p,m,row,i:list.length,par:r.parent,lp:r.position.clone(),ly:r.rotation.y,sit:p===pilot.B};
   if(en.par!==world)world.attach(r); // people who belong to a desk leave it for the finale
   if(en.sit){const s=pilot.seatB;en.seat=s;en.seatPar=s.parent;en.sp=s.position.clone();en.sy=s.rotation.y;world.attach(s);} // the wheelchair comes along
   en.slot=[ex+FIN_X0+(row%2?FIN_DX/2:0)+j*FIN_DX,ez+FIN_Z0-row*FIN_DZ];
   const here=[r.position.x,r.position.z],left=j<n/2,out=left?Math.ceil(n/2)-1-j:j-Math.ceil(n/2); // how far from the middle of the row
   if(FIN_NEAR.has(who)){en.pts=[here,en.slot];en.delay=.1;en.speed=4.4;en.run=false;}
   else if(FIN_FAR.has(who)){en.pts=[here,en.slot];en.delay=.1;en.speed=9.5;en.run=true;}
   else{en.pts=[[en.slot[0]+(left?-1:1)*.92*FIN_D,en.slot[1]-.39*FIN_D],en.slot];en.delay=.15+.07*row+.1*Math.max(0,out);en.speed=9;en.run=true;} // everyone else comes from the back, on the left or the right, toward the camera; those who stand furthest out arrive last
   en.L=[0];for(let q=1;q<en.pts.length;q++)en.L.push(en.L[q-1]+Math.hypot(en.pts[q][0]-en.pts[q-1][0],en.pts[q][1]-en.pts[q-1][1]));en.len=en.L[en.L.length-1];
   list.push(en);}});
 finale={t0:clock,instant:!!instant,list};}
function finaleEnd(){if(!finale)return;for(const en of finale.list){const r=en.p.root; // everyone goes back to where they belong
  if(en.par!==world){en.par.add(r);r.position.copy(en.lp);r.rotation.set(0,en.ly,0);}
  if(en.m){en.m.key=null;en.m.way=[];}
  if(en.seat){en.seatPar.add(en.seat);en.seat.position.copy(en.sp);en.seat.rotation.set(0,en.sy,0);en.seat.wheels.forEach(w=>w.rotation.x=0);}}
 finale=null;finLeft=true;}
function finaleUpdate(t){const F=finale,cx=camEnd.pos[0],cz=camEnd.pos[2];
 for(const en of F.list){const r=en.p.root,u=F.instant?1e9:clock-F.t0-en.delay,d=u<=0?0:Math.min(en.len,u*en.speed),moving=d>0&&d<en.len;
  let q=1;while(q<en.L.length-1&&en.L[q]<d)q++;const a=en.pts[q-1],b=en.pts[q],f=clamp((d-en.L[q-1])/Math.max(1e-6,en.L[q]-en.L[q-1]),0,1),x=a[0]+(b[0]-a[0])*f,z=a[1]+(b[1]-a[1])*f;
  r.position.set(x,0,z);
  const toCam=yawTo(x,z,cx,cz),want=d>=en.len?toCam:Math.atan2(b[0]-a[0],b[1]-a[1]);
  en.yaw=F.instant||d<=0||en.yaw===undefined?(en.yaw===undefined&&d>0?r.rotation.y:want):angLerp(en.yaw,want,moving?.4:.22);r.rotation.set(0,en.yaw,0); // each figure keeps its own heading, so nothing else can turn it
  const look=clamp(wrapA(toCam-en.yaw),-.95,.95); // on the way in, heads turn to the camera
  if(en.sit){if(moving)en.p.pose(t,'sit',{push:clock*11,yaw:look});else en.p.pose(t,'sit',{pitch:-.05});}
  else if(moving)en.p.pose(t,'walk',{phase:d/(en.run?3.2:.71),amount:(en.run?1.4:1)*smooth(Math.min(d,en.len-d)/.35),wave:1,yaw:look});
  else en.p.pose(t,'idle',{yaw:.1*Math.sin(t*.45+en.i*1.7)});
  if(en.seat){en.seat.position.set(x,0,z);en.seat.rotation.set(0,en.yaw,0);en.seat.wheels.forEach(w=>w.rotation.x=d/.36);}}
}
function botSync(instant){const n=cur===IDX.both?FLAT[state].n:0;[bots[1],bots[2]].forEach((b,i)=>{const on=n>=i+2;if(on&&!b.on)b.t0=instant?-9:clock;b.on=on;});} // which copies of the pilot are out, and since when
function direct(instant){ // where everyone in the world should be, given how far the talk has come
 const cp=cur===IDX.pilot?eff():0; // how many pairs have come to the demo: finance on 4, operations on 5, planning on 6
 const party=cur>=IDX.wow;fans.forEach((m,i)=>{const s=party?FAN_SPOT[i]:FAN_PARK[i];m.place(party?'p':'h',party?[[3,2.7],[s[0],2.1],[s[0],s[1]]]:[[m.p.root.position.x,2.1],[3,2.7],[s[0],s[1]]],s[2],instant);});
 const line=state>=fi('wait',2);PLN_CAST.forEach(c=>{const via=c.via.map(v=>at(PLN,v[0],v[1]));
  if(line)c.m.place('l',[...via,at(PLN,c.slot,2.2)],0,instant);else c.m.place('h',[...via.reverse(),at(PLN,c.home[0],c.home[1])],c.home[2],instant);});
 const joined=cp>=3; // from the click about the rest of the company on, three people stand with the pilot team at the screen
 FINP.forEach(c=>{const hm=at(FIN,c.home[0],c.home[1]),n=NEWC[c.key];c.m.speed(n?10.5:6);if(n&&joined)c.m.place('c',[...n.via,n.spot],coYaw(n.spot),instant);else c.m.place('h',c.m.key==='c'?[...n.via,hm]:[hm],c.home[2],instant);}); // the one from finance walks over from her desk and hurries back ahead of you
 const waitOut=(m,n,home)=>{if(cur<=IDX.cost){m.speed(9);if(joined)m.place('d',[...n.via,n.spot],coYaw(n.spot),instant);else if(m.key==='d'&&!instant)m.place('w',[...n.via.slice().reverse(),n.wing],-1.5,false);else if(m.key!=='w'||instant){m.snap(n.wing[0],n.wing[1],-1.5);m.key='w';}return true;}
  if(m.key==='w'||m.key==='d'){m.snap(...home);m.key='h';}return false;}; // the other two wait out of sight to the right until then, and are back at their own desks once the talk has moved on
 if(!waitOut(estRm,NEWC.estR,EST_R))estRm.place('h',[[EST_R[0],EST_R[1]]],EST_R[2],instant);
 const hud=cur===IDX.every;opsM.forEach((mv,i)=>{const hm=at(OPS,mv.home,2.2);if(i===2&&waitOut(mv,NEWC.s3,[hm[0],hm[1],0]))return;
  mv.speed(4.4);mv.place(hud?'c':'h',[hud?at(OPS,OPS_HUD[i][0],OPS_HUD[i][1]):hm],0,instant);});
 const coming=!!travel&&cur===IDX.team&&travel.dir>0; // the team walks in from the right once you are there, so the audience sees it
 const tl=cur>=IDX.team&&cur<=IDX.change&&!coming,tg=cur===IDX.how,ta=cur===IDX.date||cur===IDX.room;const corner=at(TEAM,-3.7,.9);TEAM_CAST.forEach((c,i)=>{const was=c.m.key;const tb=cur===IDX.both;c.m.speed(tl&&was==='h'?3.6:tb?6.4:5.2);if(tb)c.m.place('b',[at(SHARE,[-4.95,-4.15,-3.35][i],1.25)],0,instant); /* the pilot team comes along and stands under the first card */else if(tg)c.m.place('g',was==='l'?[corner,at(TEAM,c.gather[0],c.gather[1])]:[at(TEAM,c.gather[0],c.gather[1])],c.gather[2],instant);else if(ta)c.m.place('a',[at(TEAM,c.aside[0],c.aside[1])],c.aside[2],instant);else if(tl)c.m.place('l',was==='h'?[...c.via.map(v=>at(TEAM,v[0],v[1])),at(TEAM,c.slot+.9,1),at(TEAM,c.slot,-1)]:[corner,at(TEAM,c.slot,-1)],0,instant); /* each walks in on their own line, so their labels never cover each other */else c.m.place('h',was==='l'?[corner,at(TEAM,c.home[0],c.home[1])]:[at(TEAM,c.home[0],c.home[1])],c.home[2],instant);});
 const gb=cur===IDX.both,gn=gb?FLAT[state].n:0,arr=!travel; // the graduation scene: the product team works at its desk, the others come in on their clicks
 SHARE_CAST.forEach(c=>{const hm=at(SHARE,c.home[0],c.home[1]);
  if(c.key==='shT')c.m.place('h',[hm],c.home[2],instant);
  else if(cur<=IDX.both)c.m.place('d',[at(SHARE,c.key==='shM'?-.95:.95,1)],Math.PI,instant);else c.m.place('h',[hm],c.home[2],instant);});
 GRAD.forEach(g=>{const on=gb&&gn>=g.n,via=g.via.map(v=>at(SHARE,v[0],v[1]));g.m.place(on?'g':'p',on?[...via,at(SHARE,...g.spot)]:g.m.key==='g'?[...via.reverse(),at(SHARE,g.park[0],g.park[1])]:[at(SHARE,g.park[0],g.park[1])],on?g.face:g.park[2],instant);});
 const r=state>=fi('wait',3);if(r!==roadOn||instant){roadOn=r;roadT0=instant?-9:clock;}
}
function go(n,instant){
 n=clamp(n,0,FLAT.length-1);if(n===state)return;const prevEff=state>=0?eff():0,from=cur,st=FLAT[n],old=state>=0?FLAT[state]:null;state=n;
 if(st.stop!==from){cur=st.stop;const S=STOPS[cur],h=hero.root.position;
  let pts;
  if(instant||from<0)pts=null;
  else if(cur===from+1)pts=[[h.x,h.z],...S.path];
  else if(cur===from-1)pts=[[h.x,h.z],...STOPS[from].path.slice(0,-1).reverse(),S.spot];
  else pts=[[h.x,h.z],S.spot];
  const C=camOf(S,st.n);
  if(!pts){hero.root.position.set(S.spot[0],0,S.spot[1]);camera.position.set(...C.pos);aim.set(...C.look);off.x=C.ox;off.y=C.oy;travel=null;arrivedAt=clock;pl.yaw=faceYaw();runHead(null);if(S.gather){byeT0=clock;byeA=.3;byeB=3.6;}}
  else{const L=[0];for(let j=1;j<pts.length;j++)L.push(L[j-1]+Math.hypot(pts[j][0]-pts[j-1][0],pts[j][1]-pts[j-1][1]));
   const len=L[L.length-1],run=len>9||!!S.run,camFar=camera.position.distanceTo(tmp.set(...C.pos)),same=camFar<.01;
   travel={t0:clock,pts,L,len,run,jog:len>4,keep:STOPS[from].slide===S.slide?S.slide:null,keepN:prevEff,dir:cur>from?1:-1,pos:camera.position.clone(),aim:aim.clone(),ox:off.x,oy:off.y,cam:C};
   if(run){travel.tA=clamp(camera.position.distanceTo(tmp.set(h.x+3.2,4.6,h.z+8))/55,.35,.8);travel.tB=clamp(len/16,.6,1);travel.tC=S.screen?.6:.5;travel.D=travel.tA+travel.tB+travel.tC;}
   else travel.D=same&&len<.05?.3:Math.max(clamp(len/6,.9,1.3),clamp(camFar/28,0,1.5));
   if(S.gather&&cur>from){travel.gather=S.gather;travel.D=S.gather.t.reduce((a,b)=>a+b,0);byeT0=clock;byeA=.3;byeB=travel.D+3;}
   runHead(run&&STOPS[from].slide!==S.slide?S:null);
   GEMS.forEach(g=>{if(g.seg===cur)g.hit=false;});}
  if(cur===IDX.thanks)finaleStart(!(travel&&travel.gather));else if(from===IDX.thanks)finaleEnd();
  paintScreens();fly=null;
 }else{const C=camOf(STOPS[cur],st.n),sh=shotOf(STOPS[cur],st.n),psh=old&&old.stop===cur?shotOf(STOPS[cur],old.n):null; // same place, but the camera may cut to whoever is speaking
  const cut=!!((sh&&sh.cut)||(psh&&psh.cut))&&camera.position.distanceTo(tmp.set(...C.pos))>.01;
  if(travel)travel.cam=C;
  else if(instant||cut){camera.position.set(...C.pos);aim.set(...C.look);off.x=C.ox;off.y=C.oy;fly=null;if(cut)pl.yaw=faceYaw();}
  else if(camera.position.distanceTo(tmp.set(...C.pos))>.01||fly)fly={t0:clock,D:.85,pos:camera.position.clone(),aim:aim.clone(),ox:off.x,oy:off.y,cam:C};}
 quiet=!!instant;if(instant)dockK=cur===IDX.every?1:0;direct(!!instant||finLeft);finLeft=false;botSync(!!instant||!!(travel&&travel.dir<0));render();
 const no=STOPS[cur].no;[...track.children].forEach((c,i)=>{c.className=i+1<no?'done':i+1===no?'now':'';});
 history.replaceState(null,'','#'+n);window.deckState={state:n,stop:cur,key:STOPS[cur].key,moving:!!travel};
}
function faceYaw(){const S=STOPS[cur],n=FLAT[state].n,sh=shotOf(S,n),f=sh&&sh.face?sh.face:(S.faceCam&&n>=S.faceCam)?'cam':S.face,c=camOf(S,n);
 return f==='cam'?yawTo(S.spot[0],S.spot[1],c.pos[0],c.pos[2]):yawTo(S.spot[0],S.spot[1],f[0],f[1]);}
const next=()=>{if(travel&&travel.gather){const left=travel.gather.t[2]+.1;if(clock-travel.t0<travel.D-left){travel.t0=clock-travel.D+left;if(finale)finale.t0=clock-60;}return;}go(state+1);},prev=()=>go(state-1); // a second press during the closing pan skips to its end
addEventListener('keydown',e=>{
 if(['ArrowRight','PageDown',' ','Enter'].includes(e.key)){e.preventDefault();next();}
 else if(['ArrowLeft','PageUp'].includes(e.key)){e.preventDefault();prev();}
 else if(e.key==='Home')go(0,true);else if(e.key==='End')go(FLAT.length-1,true);
 else if(e.key.toLowerCase()==='f'){if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen?.();}
});
stage.addEventListener('click',next);
function resize(){scale=Math.min(innerWidth/1280,innerHeight/720);stage.style.transform=`scale(${scale})`;}
addEventListener('resize',resize);resize();
const tmp=vec(),tmp2=vec(),tmp3=vec();
function project(x,y,z){const v=tmp3.set(x,y,z).project(camera);return[(v.x+1)*640,(1-v.y)*360];}
function headPoint(p,up=.6){p.head.getWorldPosition(tmp2);return project(tmp2.x,tmp2.y+up,tmp2.z);}
/* speech bubbles and name tags follow the people they belong to */
function overlay(){if(!activeEl||(travel&&activeEl.id!=='s-work'))return;const sh=shotOf(STOPS[cur],FLAT[state].n),solo=sh&&sh.solo;activeEl.classList.toggle('addr',!!(sh&&sh.side)); // when you turn to the audience, your line is the only text
 const moving=k=>!!(k&&MOV[k]&&MOV[k].way.length>0),flying=!!fly&&clock-fly.t0<fly.D*.62;
 for(const el of activeEl._tags){const w=el.dataset.who,sp=el.dataset.span;let x,y,walking;
  if(sp){const[a,b]=sp.split(':'),[xa,ya]=headPoint(WHO[a],.66),[xb,yb]=headPoint(WHO[b],.66);x=(xa+xb)/2;y=Math.min(ya,yb);el.style.setProperty('--w',Math.abs(xb-xa)+30+'px');walking=moving(a)||moving(b)||(el.dataset.all||'').split(',').some(moving);if(el.dataset.front&&Math.min(WHO[a].root.position.z,WHO[b].root.position.z)<-.9)x=-999;} // a label that belongs to people stays hidden while they are still behind the screen // one label for a group, with a bracket across it
  else{[x,y]=w?headPoint(WHO[w],.66):project(...AT[el.dataset.at]);walking=moving(w);
   if(el.dataset.from){const on=el.classList.contains('show'),k0=+el.dataset.k;if(on&&!el._on)NOTE_T[k0]=clock-arrivedAt<.15?-9:clock;el._on=on;const q=clamp((clock-NOTE_T[k0])/.38,0,1);
    if(q<1){const[hx,hy]=headPoint(WHO[el.dataset.from],.15),u=ease(q);x=hx+(x-hx)*u;y=hy+(y-hy)*u;}}} // a note travels from the hand of whoever sticks it to its place on the screen
  const hw=el.firstElementChild.offsetWidth/2+10; // a label waits until its person has arrived
  el.style.opacity=solo||(walking&&!el.dataset.stick)||x<-20||x>1300?0:1;el.style.left=clamp(x+(+el.dataset.dx||0),hw,1280-hw)+'px';el.style.top=y+(+el.dataset.dy||0)+'px';}
 if(activeEl._om){const[x0,y0]=project(TEAM[0]-TM.hw,TM.y+TM.hh,TEAM[1]+TM.z),[x1,y1]=project(TEAM[0]+TM.hw,TM.y-TM.hh,TEAM[1]+TM.z),o=activeEl._om.style;o.left=x0+'px';o.top=y0+'px';o.width=(x1-x0)+'px';o.height=(y1-y0)+'px';} // text laid onto the team's physical screen
 const dock=activeEl.classList.contains('dock'),row=[],qs=[],wk=activeEl.id==='s-work';for(const el of activeEl._talks){if(!el.classList.contains('show'))continue;const w=el.dataset.who,side=el.classList.contains('side'),[hx,hy]=headPoint(WHO[w],.56),q=wk&&w!=='hero';
  const hide=!!(solo?(w!==solo||side!==!!sh.side||(flying&&!side)):side?false:(hx<30||hx>1250||(!q&&MOV[w]&&MOV[w].way.length>0)));
  el.classList.toggle('hid',hide);if(hide)continue;
  if(side){el.style.setProperty('--ty',clamp(hy+20-el.offsetTop,30,el.offsetHeight-30)+'px');continue;}
  const bw=el.offsetWidth,bh=el.offsetHeight;if(q){el._q=[hx,hy,bw,bh];qs.push(el);continue;}
  const l=clamp(hx-bw/2+(+el.dataset.dx||0),64,1216-bw);
  el._top=hy-20-(+el.dataset.up||0)-bh;row.push(el);el.style.left=l+'px';el.style.setProperty('--tx',clamp(hx-l,28,bw-28)+'px');}
 const top=Math.min(...row.map(e=>e._top));row.forEach(e=>e.style.top=(row.length>1&&!dock?top:e._top)+'px');
 if(qs.length){const k=smooth(dockK),S=1+(DOCK_S-1)*k,rowTop=Math.min(...qs.map(e=>e._q[1]-20-e._q[3])); // the four questions: a row of large bubbles above their people, or small ones in an arc around the group; they stay attached on the way from one to the other
  for(const el of qs){const[hx,hy,bw,bh]=el._q,d=DOCK[el.dataset.who],cxR=clamp(hx,64+bw/2,1216-bw/2),btR=(qs.length>1?rowTop:hy-20-bh)+bh,cx=cxR+(d[0]-cxR)*k,bt=btR+(d[1]-btR)*k;
   el.style.left=cx-bw/2+'px';el.style.top=bt-bh+'px';el.style.scale=S;el.style.setProperty('--tx',clamp(bw/2+(hx-cx)/S,28,bw-28)+'px');}}
}

/* ---------- frame ---------- */
let last=null;
function animate(now){requestAnimationFrame(animate);if(last===null)last=now;dt=Math.min(.1,(now-last)/1000);clock+=dt;last=now;
 const t=Math.floor(clock*15)/15; // background characters tick at 15 poses a second
 const h=hero.root.position,here=!travel;
 const say=k=>here&&talkWho===k?1:0; // whoever spoke last is the one talking
 if(travel){const tr=travel,tt=clock-tr.t0,f=clamp(tt/tr.D,0,1),c=tr.cam;
  // you walk or run the path
  const x=tr.run?clamp((tt-tr.tA*.6)/(tr.tB+tr.tA*.4),0,1):f,p=.5*x+.5*smooth(x),d=p*tr.len;let j=1;while(j<tr.L.length-1&&tr.L[j]<d)j++;
  const sl=tr.L[j]-tr.L[j-1]||1,k=(d-tr.L[j-1])/sl,a=tr.pts[j-1],b=tr.pts[j];
  h.set(a[0]+(b[0]-a[0])*k,0,a[1]+(b[1]-a[1])*k);
  if(tr.len>.3&&x>0&&x<1){pl.yaw=angLerp(pl.yaw,Math.atan2(b[0]-a[0],b[1]-a[1]),.3);
   const fast=tr.run||tr.jog;hero.pose(clock,'walk',{phase:d/(fast?3.4:.71),amount:smooth(Math.min(x,1-x)/.1)*(fast?1.45:1)});}
  else{if(x>=1||tr.len<=.3)pl.yaw=angLerp(pl.yaw,faceYaw(),.15);hero.pose(clock,'idle',{});}
  if(tr.run){ // leave the stop, follow you from behind and above, settle into the next stop
   const fp=tmp.set(h.x+3.2,4.6,h.z+8),fa=tmp2.set(h.x,1.2,h.z);
   if(tt<tr.tA){const w=smooth(tt/tr.tA);camera.position.lerpVectors(tr.pos,fp,w);aim.lerpVectors(tr.aim,fa,w);off.x=tr.ox*(1-w);off.y=tr.oy*(1-w);}
   else if(tt<tr.tA+tr.tB){camera.position.copy(fp);aim.copy(fa);off.x=off.y=0;}
   else{const w=ease((tt-tr.tA-tr.tB)/tr.tC);camera.position.copy(fp).lerp(tmp3.set(...c.pos),w);aim.copy(fa).lerp(tmp3.set(...c.look),w);off.x=c.ox*w;off.y=c.oy*w;}
  }else if(tr.gather){const G=tr.gather,[t1,t2,t3]=G.t; // pull back to see everyone arrive, hold, then move in on you
   if(tt<t1){const w=ease(tt/t1);camera.position.lerpVectors(tr.pos,tmp.set(...G.pos),w);aim.lerpVectors(tr.aim,tmp.set(...G.look),w);off.x=tr.ox*(1-w);off.y=tr.oy*(1-w);}
   else if(tt<t1+t2){camera.position.set(...G.pos);aim.set(...G.look);off.x=off.y=0;}
   else{const w=ease((tt-t1-t2)/t3);camera.position.set(...G.pos).lerp(tmp.set(...c.pos),w);aim.set(...G.look).lerp(tmp.set(...c.look),w);off.x=c.ox*w;off.y=c.oy*w;}
  }else{const e=ease(f);camera.position.lerpVectors(tr.pos,tmp.set(...c.pos),e);aim.lerpVectors(tr.aim,tmp.set(...c.look),e);off.x=tr.ox+(c.ox-tr.ox)*e;off.y=tr.oy+(c.oy-tr.oy)*e;}
  rh.classList.toggle('on',rhOn&&tt>.3&&(STOPS[cur].screen?tt<tr.tA+tr.tB:f<1)); // on the way into a monitor the riding headline hands over to the one on the screen
  if(f===1){travel=null;arrivedAt=clock;direct(false);if(rhOn){const el=$(STOPS[cur].slide);if(el.classList.contains('scene'))el.classList.add('arr');rh.style.transition='none';rh.classList.remove('on');void rh.offsetWidth;rh.style.transition='';rhOn=false;}render();window.deckState.moving=false;}
 }else{if(fly){const f=clamp((clock-fly.t0)/fly.D,0,1),k=ease(f),c=fly.cam;camera.position.lerpVectors(fly.pos,tmp.set(...c.pos),k);aim.lerpVectors(fly.aim,tmp.set(...c.look),k);off.x=fly.ox+(c.ox-fly.ox)*k;off.y=fly.oy+(c.oy-fly.oy)*k;if(f===1)fly=null;}
  pl.yaw=angLerp(pl.yaw,faceYaw(),.15);const S=STOPS[cur],u=clock-arrivedAt,me=say('hero');
  const wave=S.wave?Math.max(env(u,.5,3.4,.4),S.wave===true?env((u-3.4)%7,4.5,6.6,.4):0):0;
  hero.pose(clock,'idle',{wave,talk:me,gesture:me&&!S.wave?env(clock%4,.4,2.6,.5):0,yaw:S.wave||me?0:.22*Math.sin(clock*.5),pitch:S.wave||me?0:-.08});}
 hero.root.rotation.y=pl.yaw;BYE=cur===IDX.thanks?smooth((clock-byeT0-byeA)/.5):0;HOP=cur===IDX.thanks?env(clock-byeT0,byeA,byeB,.5):0;
 camera.setViewOffset(1280,720,off.x,off.y,1280,720);camera.lookAt(aim);camera.updateMatrixWorld();
 // diamonds
 let n=0;const trav=!!travel,dir=trav?travel.dir:1;
 for(const g of GEMS){if(trav&&dir>0&&g.seg===cur&&!g.hit&&Math.hypot(h.x-g.x,h.z-g.z)<1)g.hit=true;
  const got=g.seg<cur||(g.seg===cur&&(!trav||dir<0||g.hit))||(g.seg===cur+1&&trav&&dir<0);
  if(got&&!g.got&&!quiet){const v=tmp.copy(g.m.position).project(camera);flyGem(clamp((v.x+1)*640,-30,1300),clamp((1-v.y)*360,-30,740));}
  g.got=got;g.m.visible=g.sh.visible=!got&&trav&&g.seg===cur; /* diamonds show on the path while you are on it, not among people who stand around */if(got)n++;g.m.rotation.y=t*1.6+g.x;g.m.position.y=1.25+.1*Math.sin(t*2+g.x);}
 if(n!==gemCount){gemCount=n;$('gems').textContent=n;}
 quiet=false;
 // pilot team: work calmly until the pilot works, then everyone crowds the screen
 const party=cur>=IDX.wow;if(party)pilot.display.party(t);
 const rv=reviewerWalk(party?5.2:t),near=party?1:rv.name==='stay'?env(rv.u,.2,rv.dur-.2,.8):0;
 const spell=cur===IDX.wow&&FLAT[state].n>=2,ch=i=>party&&!spell&&.5+.5*Math.sin(t*3+i*1.7)>.55?1:0;
 reviewer.pose(t,!party&&rv.walk?'walk':'idle',!party&&rv.walk?rv.walk:{tablet:near<.5?1:0,gesture:party?0:near*env(rv.u%3,.3,2.2,.5),cheer:ch(2),talk:near*env(rv.u%3,.2,2.4,.4),yaw:near*.25,pitch:party?-.15:rv.name==='waitA'?.28:0});
 if(party){pilot.A.pose(t,'sit',{yaw:-.22,pitch:-.22,cheer:ch(0),talk:ch(0)});pilot.B.pose(t,'sit',{yaw:.22,pitch:-.22,cheer:ch(1),talk:ch(1)});}
 else{seatLoop(pilot.A,t,2,-1);const ub=(t+8)%13,typB=env(ub,.3,5.5,.5)*(1-near);
  pilot.B.pose(t,'sit',{typing:typB,yaw:.22*(1-near)-1.05*near,pitch:-.14*(1-typB),talk:near*env((rv.u+1.5)%3,.2,2.2,.4)});}
 fans.forEach((m,i)=>m.update(t,dt,party?{pitch:-.2,cheer:ch(3+i),talk:ch(3+i)}:{yaw:.3*Math.sin(t*.4+i)}));
 FLOAT.forEach((f,i)=>{const on=here&&f.on()&&((clock*(f.note?1.3:.9)+i*1.37)%(f.note?2.2:2.9))<(f.note?1:1.4);
  if(on){const[x,y]=project(...f.at());f.el.style.left=x+'px';f.el.style.top=y-(f.note?((clock*1.3+i*1.37)%2.2)*26:0)+'px';}
  f.el.classList.toggle('on',on);});
 // the units that have to run, pay for, and make room for the pilot light up as groups
 const hw=ground.material.uniforms.hlW.value;
 MARKS.forEach((m,j)=>{const k=m.on?smooth((clock-m.t0)/.5):0;hw.setComponent(j,k*(.8+.2*Math.sin(clock*4)));rings[j].visible=m.on;
  if(m.on){rings[j].scale.setScalar(.9+.1*k);const[x,y]=project(m.c[0],4.3,m.c[1]-1);m.el.style.left=clamp(x,110,1168)+'px';m.el.style.top=y+m.dy+'px';}});
 seatLoop(finance.A,t,4,-1);seatLoop(finance.B,t,9,1);const stick=k=>env(clock-NOTE_T[k],0,.8,.22); // the arm goes up as someone sticks a note on the screen
 FINP.forEach((c,i)=>c.m.update(t,dt,c.m.key==='c'?{pitch:-.12,yaw:.12*Math.sin(t*.5),gesture:stick(0)}:{gesture:i?0:env(t%14,4.5,7,.5),talk:env((t+i*5)%14,4.2,7.2,.4),yaw:.2}));
 // operations: each person asks their question when it is their turn
 seatLoop(ops.A,t,3,-1);seatLoop(ops.B,t,10,1);
 opsM.forEach((mv,i)=>{const s=say('s'+(i+1));if(mv.key==='d'){mv.update(t,dt,{pitch:-.12,yaw:.12*Math.sin(t*.5+1),gesture:stick(1)});return;}mv.update(t,dt,{talk:s,gesture:s*env(t%4,.4,2.6,.5),tablet:s?0:i%2,yaw:s?0:(i%2?-.5:.5)*env((t+i*3)%9,2,6,.6),pitch:s?0:.1*(i%2)});});
 // the established team keeps serving customers while its lead and an agent answer you
 seatLoop(est.A,t,5,-1,{talk:env((t+5)%13,1,5,.5)});seatLoop(est.B,t,11,1,{talk:env((t+11)%13,2,5.5,.5)});
 {const s=say('estR'),atDemo=estRm.key==='d';estRm.update(t,dt,atDemo?{tablet:stick(2)>.05?0:1,pitch:-.12,gesture:stick(2)}:{tablet:s?0:1,talk:s,gesture:s*env(t%4,.4,2.6,.5),pitch:s?0:.2-.25*env(t%10,5,9,.6),yaw:s?.35:0});}
 {const s=say('estG');estG.pose(t,'idle',{talk:s,gesture:s*env(t%4,.4,2.6,.5),yaw:s?-.5:.3*Math.sin(t*.4)});}
 // a Steinway for everyone: a lot of expensive noise
 seatLoop(buy.A,t,8,-1);seatLoop(buy.B,t,12,1);pianists.forEach(p=>p.pose(t,'idle',{piano:1,pitch:.12}));
 seatLoop(product.A,t,1,-1);seatLoop(product.B,t,6,1);prodC.pose(t,'idle',{tablet:1,pitch:.25-.3*env(t%9,5,8,.6),yaw:.5*env(t%9,5,8,.6)});
 // planning: people talk around the table until they line up as one conventional team
 PLN_CAST.forEach((c,i)=>c.m.update(t,dt,c.m.key==='l'?{yaw:.25*Math.sin(t*.5+i*1.9)}:{gesture:i%3===0?env((t+i*2)%11,2,6,.6):0,talk:env((t+i*2.3)%11,2,6.5,.4),tablet:i%3===1?1:0,yaw:.4*Math.sin(t*.3+i)}));
 const rk=roadOn?clamp((clock-roadT0)/1.6,0,1):0; // the roadmap fills in month by month until it covers the year
 for(const nt of board.notes){const k=nt.c<3?1:clamp(rk*12-nt.c+1,0,1);nt.m.visible=k>0;nt.m.scale.setScalar(.4+.6*k);}
 for(let i=0;i<12;i++){const lit=roadOn&&rk*12>=i;board.heads[i*2].visible=!lit;board.heads[i*2+1].visible=lit;}
 TEAM_CAST.forEach((c,i)=>c.m.update(t,dt,c.m.key==='b'?{yaw:.15*Math.sin(t*.5+i*1.7),pitch:i===1?.12:0}:c.m.key==='l'?{yaw:.2*Math.sin(t*.5+i*1.7),tablet:i===2?1:0}:c.m.key==='g'?{gesture:env((t+i*2.2)%6.6,.3,2,.4),talk:env((t+i*2.2)%6.6,.2,2.2,.4),pitch:-.12}:{tablet:i%2,pitch:.15,talk:env((t+i*3)%10,2,5,.4),yaw:.3*Math.sin(t*.35+i)}));
 if(cur===IDX.how&&here){const ph=teamDisplay.proto(FLAT[state].n>=3?8.6:clock-arrivedAt);flowSteps.forEach((el,i)=>el.classList.toggle('now',i===ph));} // the loop holds still on the last click, so the photo is stable
 if(here&&STOPS[cur].screen&&clock-arrivedAt>.45)STOPS[cur].screen.paint('done'); // behind the full-screen view, so no blank monitor shows when the camera leaves // the team builds, reviews and changes a prototype on its screen
 seatLoop(wider.A,t,3,-1);seatLoop(wider.B,t,9,1);widerC.pose(t,'idle',{tablet:1,pitch:.2});
 SHARE_CAST.forEach((c,i)=>{const s=say(c.key),bye=cur===IDX.thanks,wv=0;
  c.m.update(t,dt,{talk:s,wave:wv,gesture:s*env(t%4,.4,2.6,.5),yaw:s||bye?0:(i===0?.35:i===1?-.35:0)*(.6+.4*Math.sin(t*.4+i))});});
 GRAD.forEach((g,i)=>g.m.update(t,dt,{yaw:g.m.key==='g'?.18*Math.sin(t*.5+i*1.3):.3*Math.sin(t*.35+i),talk:g.m.key==='p'?env((t+i*2.7)%9,2,5,.4):0}));
 {const gb=cur===IDX.both,ta=MOV.tAI,tp=ta.p.root.position,b1=bots[0]; // the three ways a pilot graduates: the pilot comes along with its team, and a copy flies to each other home
  if(gb){const mv=ta.way.length>0;b1.visible=true;b1.scale.setScalar(.85);b1.position.set(tp.x-.4,mv?.16*Math.abs(Math.sin(clock*9)):.03*Math.sin(clock*2.2),tp.z+.9);b1.rotation.y=mv?ta.p.root.rotation.y:0;b1.t1=clock;}
  else{const s=1-smooth((clock-b1.t1)/.25);b1.visible=s>.01;b1.scale.setScalar(.85*s);}
  [[bots[1],[SHARE[0],.98,SHARE[1]-.35]],[bots[2],[SHARE[0]+4.58,.98,SHARE[1]+.5]]].forEach(([b,to],i)=>{
   if(b.on){const k=clamp((clock-b.t0-(i?.25:0))/.75,0,1),w=ease(k);b.visible=k>0;b.position.set(b1.position.x+(to[0]-b1.position.x)*w,to[1]*w+1.5*Math.sin(Math.PI*w)+(k>=1?.03*Math.sin(clock*2.2+i+1):0),b1.position.z+(to[2]-b1.position.z)*w);b.scale.setScalar(.85*(.5+.5*w));b.t1=clock;}
   else{const s=1-smooth((clock-b.t1)/.25);b.visible=s>.01;b.scale.setScalar(.85*Math.max(s,.01));}});
  const d3=bots[2],sd=d3.on?smooth((clock-d3.t0)/.3):1-smooth((clock-d3.t1)/.25);ownDesk.visible=sd>.01;ownDesk.scale.setScalar(Math.max(sd,.01));} // its own desk appears just before the pilot lands on it
 {const on=!!travel&&cur===IDX.cost&&travel.dir>0&&clock-travel.t0<travel.tA+travel.tB;if(on){const[x,y]=headPoint(hero,.62);carry.style.left=clamp(x,90,1190)+'px';carry.style.top=y+'px';}carry.style.opacity=on?1:0;} // the first note goes with you to finance
 if(finale)finaleUpdate(t);
 sky.position.copy(camera.position);clouds.position.set(camera.position.x,camera.position.y-3.2,camera.position.z);clouds.rotation.y=CLOUD_ROT;
 dockK+=clamp((cur===IDX.every?1:0)-dockK,-dt/DOCK_T,dt/DOCK_T);
 if(costDirty)drawCost(clock);
 overlay();
 renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(post,postCam);
}
document.fonts.ready.then(()=>{go(Number(location.hash.slice(1))||0,true);requestAnimationFrame(animate);});
window.deck={go,next,prev,count:FLAT.length,fi,stops:STOPS.map(s=>s.key)};
})();
