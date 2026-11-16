/* Digitale Leute deck (Claude v4). You are the character: every "next" either runs you to the
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
const headsetGeo=new T.TorusGeometry(.225,.022,6,16,Math.PI),glassGeo=new T.TorusGeometry(.06,.012,6,14);
function person(parent,o={}){
 const shirt=o.shirt??BLUE,pants=o.pants??INK,skin=o.skin??0xeab783,hair=o.hair??INK,style=o.style||'short';
 const root=group(parent),body=group(root),torso=group(body);
 box(torso,.47,.56,.29,shirt,0,.31,0,.1);ball(torso,shirt,0,.56,0,.28,.11,.16);box(body,.38,.2,.28,pants,0,.015,0,.06);
 ball(torso,skin,0,.65,0,.075,.11,.075);
 const head=group(torso,0,.75,0);head.scale.setScalar(1.3);
 ball(head,skin,0,.06,0,.205,.25,.19);ball(head,skin,-.2,.055,0,.04,.06,.04);ball(head,skin,.2,.055,0,.04,.06,.04);
 const H=(x,y,z,sx,sy=sx,sz=sx)=>ball(head,hair,x,y,z,sx,sy,sz);
 H(0,.2,-.028,.215,.135,.195);H(0,.09,-.14,.195,.19,.07);
 if(style==='short'){const f=box(head,.32,.08,.11,hair,-.025,.215,.12,.035);f.rotation.z=-.13;}
 if(style==='buns'){H(-.13,.34,-.07,.105);H(.13,.34,-.07,.105);}
 if(style==='bun'){H(0,.35,-.1,.12);}
 if(style==='curly'){for(let i=0;i<16;i++)H(Math.sin(i*2.4)*.19,.2+Math.cos(i*1.7)*.07,Math.cos(i*2.4)*.15-.03,.09);}
 if(style==='long'){H(-.18,-.03,-.05,.07,.27,.13);H(.18,-.03,-.05,.07,.27,.13);H(0,-.15,-.15,.2,.23,.08);}
 if(o.beard)H(0,-.1,.09,.165,.105,.115);
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
 if(o.headset){mesh(head,headsetGeo,mat(BLUE),0,.09,0);for(const s of[-1,1])ball(head,BLUE,s*.225,.06,0,.05,.075,.065);box(head,.02,.02,.17,BLUE,-.21,-.03,.1,.005);}
 const legs=[],arms=[];
 for(const side of[-1,1]){
  const l=limb(root,pants,pants,.082);l.foot=box(root,.17,.13,.31,o.shoes??PAPER,0,0,0,.045);legs.push(l);
  const a=limb(root,shirt,skin,.072),hand=group(root);ball(hand,skin,0,0,0,.07,.075,.05);a.hand=hand;arms.push(a);
 }
 blob(root,0,.05,.36,.3);
 const p={root,body,torso,head,eyes,mouth,legs,arms,seed:o.seed||0};
 p.pose=(t,mode,a)=>pose(p,t,mode,a||{});p.pose(0,'idle');return p;
}
function pose(p,t,mode,a){
 const sit=mode==='sit',walk=mode==='walk',ph=t+p.seed,breath=Math.sin(ph*1.4)*.006;
 const amount=walk?a.amount:0,hip=sit?.7:.97,bob=walk?.022*Math.sin(a.phase*Math.PI*4)*amount:0;
 p.body.position.set(0,hip+bob+breath,0);p.torso.rotation.set(sit?.05:(walk?.07*Math.max(0,amount-1):(a.piano?.1:0)),0,walk?.025*Math.sin(a.phase*Math.PI*2)*amount:0);
 p.head.rotation.set((a.pitch||0)+(sit?.05:0),a.yaw||0,(a.wave||0)*.08*Math.sin(ph*3)+(a.piano?.1*Math.sin(ph*2.6):0));
 const blink=1-.9*env(ph%5.7,5.2,5.45,.08);p.eyes.forEach(e=>e.scale.y=.036*blink);
 p.mouth.scale.y=.01+(a.talk||0)*(.012+.016*Math.pow(Math.sin(ph*7),2))+(a.wave||0)*.012;
 for(let i=0;i<2;i++){
  const side=i?1:-1,l=p.legs[i],arm=p.arms[i],hipPos=vec(side*.13,hip+bob,0);
  const foot=vec(side*.14,.08,.02),wrist=vec(side*.34,hip+.02,.03);
  if(sit){foot.set(side*.17,.08,.52);solve(l,hipPos,foot,.44,.43,vec(0,.3,1));
   const tap=(a.typing||0)*Math.max(0,Math.sin(ph*11+i*2.3));wrist.set(side*.17,1.12+tap*.035,.57);
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
  solve(arm,vec(side*.28,hip+.54+bob,0),wrist,.3,.31,vec(side*.18,-1,-.16));arm.hand.position.copy(wrist);
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
function mover(p,speed=2.4){const m={p,way:[],face:0,d:0,key:null};
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
    if(kind===6){for(let i=0;i<6;i++){const x=22+(i%3)*202,y=70+Math.floor(i/3)*138;frame(x,y,190,126);R(B,x+12,y+12,22,22);R(K,x+12,y+46,140,12);R(K,x+12,y+72,160,6);R(K,x+12,y+88,120,6);}}
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
  proto(t){cur='proto';chrome();R(L,22,40,596,306); // the team's prototype loop: problem, prototype, review, change
   const ph=Math.floor(t/2.2)%4,u=(t/2.2)%1,blocks=[[60,64,220,44],[60,122,220,150],[300,64,280,96],[300,174,132,98],[448,174,132,98],[60,286,520,40]];
   if(ph===0){R(K,262,112,116,116);R(Y,268,118,104,104);R(K,298,140,44,12);R(K,330,152,12,24);R(K,310,176,22,12);R(K,310,198,14,14);}
   else{const k=ph===1?Math.min(6,Math.floor(u*7)+1):6;for(let i=0;i<k;i++){const b=blocks[i];R(K,b[0],b[1],b[2],b[3]);R(ph===3&&i===2?Y:i%2?B:P,b[0]+3,b[1]+3,b[2]-6,b[3]-6);}
    if(ph===2){R(K,410,86,44,44);R(Y,413,89,38,38);if(u>.45){R(K,148,188,44,44);R(Y,151,191,38,38);}}}
   tex.needsUpdate=true;return ph;}};
}
function teamDesk(parent,c,kind,dk,whoA,whoB){const g=group(parent,c[0],0,c[1]);
 desk(g,0,-.6,5.8,1.6);const display=bigDisplay(g,kind,dk);display.paint('dash');
 keyboard(g,-1.95,1.06,-.02);keyboard(g,1.95,1.06,-.02);mug(g,-2.6,1.03,-.5);mug(g,2.65,1.03,-.75);
 const r={g,display};
 if(whoA){chair(g,-1.95,.7,Math.PI);r.A=person(g,whoA);r.A.root.position.set(-1.95,0,.7);r.A.root.rotation.y=Math.PI;}
 if(whoB){chair(g,1.95,.7,Math.PI);r.B=person(g,whoB);r.B.root.position.set(1.95,0,.7);r.B.root.rotation.y=Math.PI;}
 return r;}
function standing(parent,x,z,yaw,o,tablet){const p=person(parent,o);p.root.position.set(x,0,z);p.root.rotation.y=yaw;if(tablet)box(p.arms[0].hand,.3,.03,.4,tablet,.14,.05,.1,.01);return p;}

/* ---------- renderer, world ---------- */
const canvas=document.getElementById('world'),stage=document.getElementById('stage');
const renderer=new T.WebGLRenderer({canvas,antialias:false,alpha:false,premultipliedAlpha:false,powerPreference:'high-performance'});
renderer.setPixelRatio(1);renderer.setSize(GW,GH,false);renderer.outputColorSpace=T.SRGBColorSpace;renderer.setClearColor(PAPER,1/255);
const scene=new T.Scene(),camera=new T.PerspectiveCamera(34,16/9,NEAR,FAR),world=group(scene);

// places, in the order you visit them
const P0=[0,0],FIN=[8.4,-9.3],OPS=[14.6,-16.3],EST=[28.9,-25.1],BUY=[41.9,-34.1],PRD=[54.9,-41.1],PLN=[67.9,-48.1],TEAM=[80.9,-57.1],WIDER=[93.9,-66.1],SHARE=[106.9,-75.1];
const ISL=[[P0,6.6],[FIN,5.6],[OPS,6.2],[EST,5.8],[BUY,6.2],[PRD,5.6],[PLN,6.4],[TEAM,6.2],[WIDER,5.6],[SHARE,5.8]];
const SEG=ISL.slice(1).map((x,i)=>[ISL[i][0],x[0]]);
const HL=[OPS,FIN,EST]; // the units that have to run, pay for, and make room for the pilot
const ground=new T.Mesh(new T.PlaneGeometry(900,900),new T.ShaderMaterial({
 uniforms:{paper:{value:new T.Color(PAPER)},sand:{value:new T.Color(SAND)},hi:{value:new T.Color(YELLOW)},hlOn:{value:0},hl:{value:HL.map(p=>vec(p[0],p[1],4.7))},isl:{value:ISL.map(([p,r])=>vec(p[0],p[1],r))},seg:{value:SEG.map(([a,b])=>new T.Vector4(a[0],a[1],b[0],b[1]))}},
 vertexShader:'varying vec3 wp;void main(){vec4 w=modelMatrix*vec4(position,1.);wp=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
 fragmentShader:`uniform vec3 paper;uniform vec3 sand;uniform vec3 hi;uniform float hlOn;uniform vec3 hl[3];uniform vec3 isl[${ISL.length}];uniform vec4 seg[${SEG.length}];varying vec3 wp;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float segd(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}
 void main(){vec2 g=floor(wp.xz);vec2 c=g+.5;float m=0.;
  for(int i=0;i<${ISL.length};i++)m=max(m,1.-smoothstep(isl[i].z*.6,isl[i].z,distance(c,isl[i].xy)));
  for(int i=0;i<${SEG.length};i++)m=max(m,1.-smoothstep(.7,2.,segd(c,seg[i].xy,seg[i].zw)));
  float ch=mod(g.x+g.y,2.),on=ch*step(hash(g)*.8+.08,m);
  float h=0.;for(int i=0;i<3;i++)h=max(h,step(distance(c,hl[i].xy),hl[i].z));
  vec3 col=mix(paper,sand,on);col=mix(col,hi,h*hlOn*ch);
  gl_FragColor=vec4(col,${GROUND_ID});}`}));
ground.rotation.x=-Math.PI/2;scene.add(ground);
const at=(c,x,z)=>[c[0]+x,c[1]+z];
const ringMat=flat(YELLOW,idOf('ring')),ringGeo=new T.RingGeometry(4.5,4.82,64);
const rings=HL.map(c=>{const m=mesh(world,ringGeo,ringMat,c[0],.05,c[1]);m.rotation.x=-Math.PI/2;m.visible=false;return m;});

/* pilot team */
const pilot=teamDesk(world,P0,0,0,{shirt:PAPER,skin:0x8d5a3b,style:'buns',seed:1.3},{shirt:BLUE,skin:0xeab783,style:'long',seed:4.1});
box(pilot.g,.5,.03,.66,YELLOW,2.6,1.045,-.1,.01).rotation.y=.25;plant(pilot.g,-3.7,-1.5,1.15);rack(pilot.g,4.2,-1.9);
const reviewer=standing(pilot.g,0,0,0,{shirt:PAPER,skin:0xc58c5c,style:'short',beard:true,glasses:true,seed:2.2},BLUE);
const reviewerWalk=walker(reviewer,[4.4,-.3],[3.1,1.05],{waitA:5,stay:6,faceA:-.5,faceB:-2.25,offset:3});
const FAN_PARK=[[6.9,-1.7,-1.2],[7.3,-.2,-1.4]],FAN_SPOT=[[-.95,.85,Math.PI+.25],[1.05,.95,Math.PI-.25]];
const fans=[{shirt:PALE,skin:0x6b4226,style:'curly',seed:40},{shirt:BLUE,skin:0xf0c8a0,hair:BROWN,style:'bun',seed:43}].map((o,i)=>{const m=mover(person(world,o));m.snap(...FAN_PARK[i]);return m;});
/* the people responsible for spending */
const finance=teamDesk(world,FIN,2,2,{shirt:BLUE,skin:0xa86f48,style:'bun',seed:18},{shirt:PAPER,skin:0xf0c8a0,hair:BROWN,style:'short',glasses:true,seed:21});
cabinet(finance.g,-4.5,-1.5,.3);const finC=standing(finance.g,-3.7,.4,1.9,{shirt:PAPER,skin:0x8d5a3b,style:'long',seed:23});
/* operations: four people who each have a question about running the pilot */
const ops=teamDesk(world,OPS,0,3,{shirt:PAPER,skin:0xeab783,style:'bun',seed:27},{shirt:BLUE,skin:0x6b4226,style:'short',beard:true,seed:30});
rack(ops.g,3.6,-2);rack(ops.g,4.8,-2);rack(ops.g,6,-2);
const opsS=[[-3.15,{shirt:BLUE,skin:0xd9a273,style:'curly',seed:33}],[-.65,{shirt:PAPER,skin:0x8d5a3b,style:'long',seed:36}],[1.85,{shirt:PALE,skin:0xf0c8a0,hair:BROWN,style:'short',glasses:true,seed:39}],[4.35,{shirt:BLUE,skin:0xa86f48,style:'buns',seed:42}]].map(([x,o],i)=>standing(ops.g,x,2.2,0,o,i%2?PAPER:0));
/* the established team that would receive the pilot: it is busy serving customers */
const est=teamDesk(world,EST,0,3,{shirt:PALE,skin:0xd9a273,style:'long',headset:true,seed:50},{shirt:PAPER,skin:0x8d5a3b,style:'short',headset:true,seed:53});
plant(est.g,-3.7,-1.5,1.1);
const estR=standing(est.g,.2,2.2,-.25,{shirt:BLUE,skin:0xf0c8a0,hair:BROWN,style:'bun',glasses:true,seed:56},PAPER);
const estG=standing(est.g,2.9,2.2,-.35,{shirt:PAPER,skin:0x6b4226,style:'curly',headset:true,seed:59});
/* the obvious answer: buy a Steinway for everyone */
const buy=teamDesk(world,BUY,0,0,{shirt:BLUE,skin:0xd9a273,style:'long',seed:82},{shirt:PAPER,skin:0xa86f48,style:'curly',seed:85});
crate(buy.g,4.7,-1.3);
const PIANO_X=[-4.15,-.75,2.65];
const pianists=[{shirt:PAPER,skin:0xeab783,style:'bun',seed:88},{shirt:BLUE,skin:0x8d5a3b,style:'short',seed:91},{shirt:PALE,skin:0xf0c8a0,hair:BROWN,style:'buns',seed:94}].map((o,i)=>pianoUnit(buy.g,PIANO_X[i],2.4,o));
/* product team */
const product=teamDesk(world,PRD,1,1,{shirt:BLUE,skin:0xf0c8a0,hair:BROWN,style:'short',seed:6},{shirt:PAPER,skin:0x6b4226,style:'curly',seed:9});
const prodC=standing(product.g,3.8,-.5,-2.4,{shirt:PALE,skin:0xeab783,style:'bun',seed:11},PAPER);plant(product.g,-3.9,-1.6,1);
/* planning: seven people around a table and a roadmap board. Later they line up with you as one conventional team. */
const planning=group(world,PLN[0],0,PLN[1]);
const board=yearBoard(planning,0,-2.1);desk(planning,0,-.1,3,1.4);
for(let i=0;i<7;i++)box(planning,.5,.035,.66,YELLOW,-.75+Math.sin(i*2.1)*.04,1.05+i*.037,-.1+Math.cos(i*1.7)*.04,.01).rotation.y=Math.sin(i*1.3)*.25;
box(planning,.5,.03,.66,PALE,.6,1.045,-.15,.01).rotation.y=-.2;mug(planning,1.15,1.03,.25);
const PLN_CAST=[ // key, look, home [x,z,yaw], lineup x, waypoints on the way to the lineup
 ['plnH',{shirt:PALE,skin:0xf0c8a0,style:'curly',seed:60},[-.4,1.5,Math.PI],-3.2,[]],
 ['plnF',{shirt:BLUE,skin:0xeab783,style:'short',seed:63},[-2.6,.9,2.4],-1.6,[]],
 ['plnE',{shirt:BLUE,skin:0x6b4226,style:'curly',seed:66},[-2.2,-.5,1.6],-.3,[[-2.1,1.4]]],
 ['plnA',{shirt:BLUE,skin:0xf0c8a0,hair:BROWN,style:'long',seed:69},[-1.15,-1.45,Math.PI],1,[[-2.3,-1.2],[-2.3,1.5]]],
 ['plnG',{shirt:BLUE,skin:0xa86f48,style:'bun',seed:72},[2.8,1,-2.2],2.3,[]],
 ['plnC',{shirt:BLUE,skin:0xd9a273,style:'short',glasses:true,seed:75},[2.3,-.45,-1.7],3.6,[]],
 ['plnD',{shirt:BLUE,skin:0x8d5a3b,style:'buns',seed:78},[1.3,-1.45,Math.PI],4.9,[[2.5,-1.2],[3.3,1.2]]]
].map(([key,o,home,slot,via])=>{const m=mover(person(world,o),2.6);m.snap(...at(PLN,home[0],home[1]),home[2]);return{key,m,home,slot,via};});
/* the small team: three people and a part-time designer */
const teamG=group(world,TEAM[0],0,TEAM[1]);desk(teamG,0,-.6,5.8,1.6);const teamDisplay=bigDisplay(teamG,7,0);teamDisplay.paint('dash');
keyboard(teamG,-1.95,1.06,-.02);keyboard(teamG,1.95,1.06,-.02);mug(teamG,2.65,1.03,-.75);shelf(teamG,-4.5,-1.5);
const TEAM_CAST=[ // key, look, home, lineup x, where they stand when the team gathers at the screen
 ['tEN',{shirt:BLUE,skin:0x8d5a3b,style:'short',glasses:true,seed:103},[2.3,.9,Math.PI],-1.55,[-1.5,1.6,Math.PI-.3]],
 ['tAI',{shirt:PALE,skin:0x6b4226,style:'buns',seed:106},[3.5,.2,-2.6],.3,[1.5,1.6,Math.PI+.3]],
 ['tDS',{shirt:PAPER,skin:0xf0c8a0,hair:BROWN,style:'curly',seed:109},[5.6,-1.4,.3],2.15,[2.9,.6,-2.3]]
].map(([key,o,home,slot,gather])=>{const m=mover(person(world,o),2.6);m.snap(...at(TEAM,home[0],home[1]),home[2]);return{key,m,home,slot,gather};});
/* the wider organization, where the shared rules live */
const wider=teamDesk(world,WIDER,5,2,{shirt:BLUE,skin:0xeab783,style:'short',seed:112},{shirt:PAPER,skin:0x6b4226,style:'long',seed:115});
rack(wider.g,4.2,-1.9);const widerC=standing(wider.g,3.6,.3,-2.5,{shirt:PALE,skin:0xa86f48,style:'buns',seed:118},BLUE);
/* the shared working area where the small team and the wider organization meet */
const share=group(world,SHARE[0],0,SHARE[1]);desk(share,0,-.6,4.8,1.6);const shareDisplay=bigDisplay(share,6,1);shareDisplay.paint('dash');plant(share,-3.6,-1.7,1);
const SHARE_CAST=[
 ['shT',{shirt:PAPER,skin:0x8d5a3b,style:'bun',seed:121},[-4.4,.3,2.6],[-3.4,2.2]],
 ['shW',{shirt:BLUE,skin:0xf0c8a0,style:'short',glasses:true,seed:124},[4.3,.3,-2.6],[3.4,2.2]],
 ['shM',{shirt:PALE,skin:0xd9a273,style:'long',seed:127},[2.5,.4,-2.4],[0,2.2]]
].map(([key,o,home,slot])=>{const m=mover(person(world,o),2.6);m.snap(...at(SHARE,slot[0],slot[1]),0);return{key,m,home,slot};});
/* you */
const hero=person(world,{shirt:INK,pants:INK,shoes:INK,skin:0xe9b99a,hair:0x2a211c,stubble:0xb3907c,style:'mirza',seed:.5});
const WHO={hero,estR,estG};opsS.forEach((p,i)=>WHO['s'+(i+1)]=p);[...PLN_CAST,...TEAM_CAST,...SHARE_CAST].forEach(c=>WHO[c.key]=c.m.p);
const AT={eng:[PLN[0]+1.65,2.72,PLN[1]+2.2],board:[PLN[0],3.5,PLN[1]-2.05],skills:[TEAM[0]-4.5,2.75,TEAM[1]-1.3]};

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
const camS=(c,xo=0)=>({pos:[c[0]+xo,3.2,c[1]+13],look:[c[0]+xo,2.2,c[1]-.5],ox:0,oy:62}); // front-on "stage": people above, the dialogue box below
const camA=s=>({pos:[s[0]-1.2,1.75,s[1]+5.2],look:[s[0]+.3,1.3,s[1]],ox:-315,oy:14}); // you, facing the audience
const camC=s=>({pos:[s[0],1.7,s[1]+5.6],look:[s[0],1.15,s[1]],ox:0,oy:0}); // you, centered, speaking to the audience
const HOME=[-3.3,2.3],BUY_SPOT=at(BUY,1,3.9),END_SPOT=at(SHARE,-1.2,5.8);
const STOPS=[
 {key:'title',no:1,slide:'s-title',pts:1,cam:{pos:[5.6,3,13.6],look:[.4,1.9,-.6],ox:-290,oy:-10},path:[HOME],face:[0,-1]},
 {key:'bio',no:1,slide:'s-bio',pts:1,cam:camA(HOME),path:[HOME],face:'cam',wave:true},
 {key:'q',no:2,slide:'s-q',pts:3,cam:camC(HOME),path:[HOME],face:'cam'},
 {key:'wow',no:3,slide:'s-wow',pts:1,cam:{pos:[3.7,2.5,8.4],look:[.5,2,-.7],ox:-330,oy:-6},path:[[-2.95,1.1]],face:[0,-1]},
 {key:'pilot',no:3,slide:'s-pilot',pts:2,cam:camW(P0),path:[[-2,3]],face:FIN},
 {key:'cost',no:4,slide:'m-cost',pts:4,screen:finance.display,cam:camM(FIN),path:[[5.6,2.6],[5.9,-3],[9,-6.4],at(FIN,3.3,1.1)],face:at(FIN,0,-1),gems:3},
 {key:'work',no:5,slide:'s-work',pts:6,cam:camS(OPS,.6),path:[at(OPS,.6,3.9)],face:at(OPS,.6,2),gems:2},
 {key:'job',no:6,slide:'s-job',pts:4,cam:camS(EST),path:[[19.8,-12.4],at(EST,-2.3,3.9)],face:at(EST,.2,2.2),gems:3},
 {key:'buy',no:7,slide:'s-buy',pts:2,cam:camS(BUY),path:[[33.5,-20.6],BUY_SPOT],face:at(BUY,1,2),gems:3},
 {key:'buysay',no:7,slide:'s-buysay',pts:2,cam:camC(BUY_SPOT),path:[BUY_SPOT],face:'cam'},
 {key:'fast',no:8,slide:'m-fast',pts:3,screen:product.display,cam:camM(PRD),path:[[47.6,-30.3],at(PRD,-3.3,1.1)],face:at(PRD,0,-1),gems:3},
 {key:'wait',no:9,slide:'s-wait',pts:4,cam:camS(PLN,.2),path:[at(PRD,-1.9,3.1),at(PRD,5.6,.9),at(PLN,-4.5,2.2)],face:'cam',gems:3},
 {key:'team',no:10,slide:'s-team',pts:4,cam:camS(TEAM,1.1),path:[at(PLN,-2.7,4.7),at(PLN,6.1,4.3),at(TEAM,-3.4,2.2)],face:'cam',gems:3},
 {key:'change',no:11,slide:'s-change',pts:3,cam:camS(TEAM,1.1),path:[at(TEAM,-3.4,2.2)],face:'cam'},
 {key:'how',no:12,slide:'s-how',pts:4,cam:camS(TEAM,1.1),path:[at(TEAM,-2.9,.6)],face:at(TEAM,0,-1.2)},
 {key:'date',no:13,slide:'m-date',pts:4,screen:teamDisplay,cam:camM(TEAM),path:[at(TEAM,-3.3,1.1)],face:at(TEAM,0,-1)},
 {key:'resp',no:14,slide:'m-resp',pts:6,screen:wider.display,cam:camM(WIDER),path:[at(TEAM,-3.9,3.9),at(TEAM,5.6,3.5),at(WIDER,-3.3,1.1)],face:at(WIDER,0,-1),gems:3},
 {key:'both',no:15,slide:'s-both',pts:5,cam:camS(SHARE),path:[at(WIDER,0,3.5),at(WIDER,7.1,2.6),at(SHARE,0,3.9)],face:at(SHARE,0,2.2),faceCam:4,gems:3},
 {key:'open',no:16,slide:'s-open',pts:4,cam:camS(SHARE),path:[at(SHARE,-1.7,3.9)],face:at(SHARE,0,2.2)},
 {key:'before',no:17,slide:'m-before',pts:7,screen:shareDisplay,cam:camM(SHARE),path:[at(SHARE,-4.7,3.6),at(SHARE,-3.4,1.6)],face:at(SHARE,0,-1)},
 {key:'close',no:18,slide:'s-close',pts:2,cam:camC(END_SPOT),path:[at(SHARE,-4.7,3.6),END_SPOT],face:'cam'}
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
 const k=costLevel>=2?clamp((now-costT0)/1.2,0,1):0;
 for(let i=0;i<667;i++){const col=Math.floor(i/11),row=i%11,x=col*CW,y=(10-row)*CH;
  if(i===0){cx.fillStyle='#16171a';cx.fillRect(x,y,30,30);cx.fillStyle='#e6ff00';cx.fillRect(x+5,y+5,20,20);continue;}
  if(k>0&&(col+row*.6+(i*7%5)*.4)/68<=k){cx.fillStyle='#2b4bff';cx.fillRect(x,y,30,30);}}
 if(k>=1||costLevel<2)costDirty=false;}
function setCost(level,now){if(level===costLevel)return;if(level>=2&&costLevel<2)costT0=now;costLevel=level;costDirty=true;}

/* ---------- state ---------- */
const $=id=>document.getElementById(id),SLIDES=[...new Set(STOPS.map(s=>s.slide))].map($);
SLIDES.forEach(el=>{el._lines=[...el.querySelectorAll('.line')];el._tags=[...el.querySelectorAll('.tag')];});
const dialog=$('dialog'),dWho=dialog.querySelector('.who'),dTxt=dialog.querySelector('.txt'),flowSteps=[...document.querySelectorAll('#s-how .flowv span')];let dKey='';
function lineHtml(el,ln){let h=ln.innerHTML;if(ln.hasAttribute('data-add')){const i=el._lines.indexOf(ln);if(i>0)h=lineHtml(el,el._lines[i-1])+'<br>'+h;}return h;}
const track=$('track');for(let i=0;i<18;i++)track.appendChild(document.createElement('i'));
const tails=$('tails');
// things that pop up over the world: "Wow" over the pilot team, notes over the pianos
const FLOAT=[];
[pilot.A,pilot.B,reviewer,fans[0].p,fans[1].p].forEach((p,i)=>FLOAT.push({text:'Wow',on:()=>cur===IDX.wow&&!(i>2&&fans[i-3].way.length),at:()=>{p.head.getWorldPosition(tmp);return[tmp.x,tmp.y+.62,tmp.z];}}));
PIANO_X.forEach((x,i)=>{for(let k=0;k<2;k++)FLOAT.push({text:k?'♫':'♪',note:true,on:()=>cur===IDX.buy,at:()=>[BUY[0]+x+.9+k*.5,2+.5*k,BUY[1]+2.4]});});
FLOAT.forEach(f=>{const b=document.createElement('div');b.className='bub'+(f.note?' note2':'');b.textContent=f.text;stage.insertBefore(b,tails);f.el=b;});
const MARKS=[['Run it',OPS,-46],['Pay for it',FIN,0],['Make room for it',EST,26]].map(([text,c,dy],i)=>{const el=document.createElement('div');el.className='mark';el.style.setProperty('--d',i);el.innerHTML='<span class="mk"><b>'+text+'</b><i></i></span>';stage.insertBefore(el,tails);return{el,c,dy};});
const aim=vec(),off={x:0,y:0};let state=-1,cur=-1,travel=null,clock=0,dt=0,scale=1,arrivedAt=0,gemCount=0,quiet=true;
let roadOn=false,roadT0=-9,marksOn=false,marksT0=0,talkWho=null,activeEl=null;
const pl={yaw:0,face:0};
function stagePoint(el){const r=el.getBoundingClientRect(),s=stage.getBoundingClientRect();return[(r.left-s.left)/scale,(r.top-s.top)/scale];}
function flyGem(x,y){const g=document.createElement('i');g.className='gem fly';g.style.left=x+'px';g.style.top=y+'px';stage.appendChild(g);
 const[tx,ty]=stagePoint($('hud-gems'));g.getBoundingClientRect();g.style.left=tx+14+'px';g.style.top=ty+9+'px';
 setTimeout(()=>{g.remove();const h=$('hud-gems');h.classList.remove('bump');void h.offsetWidth;h.classList.add('bump');},500);}
function render(){const s=STOPS[cur],n=FLAT[state].n,here=!travel;activeEl=null;talkWho=null;
 for(const el of SLIDES){const on=here&&el.id===s.slide;el.classList.toggle('on',on);el.dataset.n=on?n:0;
  el.querySelectorAll('.pt').forEach(p=>p.classList.toggle('show',on&&+p.dataset.i<=n));
  if(on)activeEl=el;}
 // the dialogue box shows the latest line of whoever is speaking
 let ln=null;if(activeEl)for(const l of activeEl._lines)if(+l.dataset.i<=n)ln=l;
 const key=ln?activeEl.id+ln.dataset.i:'';talkWho=ln?ln.dataset.who||null:null;dialog.classList.toggle('on',!!ln);
 if(ln&&key!==dKey){dWho.textContent=ln.dataset.name;dTxt.innerHTML=lineHtml(activeEl,ln);dialog.classList.toggle('me',ln.dataset.who==='hero');dialog.classList.toggle('big',ln.hasAttribute('data-big'));dialog.classList.toggle('small',ln.hasAttribute('data-small'));dialog.classList.toggle('qa',ln.hasAttribute('data-qa'));dialog.classList.remove('pop');void dialog.offsetWidth;dialog.classList.add('pop');}
 dKey=key;
 setCost(here&&s.slide==='m-cost'?(n>=3?2:n>=2?1:0):0,clock);
 const mk=here&&s.key==='pilot'&&n>=2;if(mk&&!marksOn)marksT0=clock;marksOn=mk;MARKS.forEach(m=>m.el.classList.toggle('on',mk));rings.forEach(r=>r.visible=mk);}
function paintScreens(){SCREENS.forEach((idx,scr)=>scr.paint(idx.includes(cur)?'blank':idx[0]<cur?'done':'dash'));if(cur<IDX.wow)pilot.display.paint('dash');}
function direct(instant){ // where everyone in the world should be, given how far the talk has come
 const party=cur>=IDX.wow;fans.forEach((m,i)=>{const s=party?FAN_SPOT[i]:FAN_PARK[i];m.place(party?'p':'h',party?[[3,2.7],[s[0],2.1],[s[0],s[1]]]:[[m.p.root.position.x,2.1],[3,2.7],[s[0],s[1]]],s[2],instant);});
 const line=state>=fi('wait',3);PLN_CAST.forEach(c=>{const via=c.via.map(v=>at(PLN,v[0],v[1]));
  if(line)c.m.place('l',[...via,at(PLN,c.slot,2.2)],0,instant);else c.m.place('h',[...via.reverse(),at(PLN,c.home[0],c.home[1])],c.home[2],instant);});
 const tl=state>=fi('team',2)&&cur<=IDX.change,tg=cur===IDX.how;TEAM_CAST.forEach(c=>{if(tg)c.m.place('g',[at(TEAM,c.gather[0],c.gather[1])],c.gather[2],instant);else if(tl)c.m.place('l',[at(TEAM,c.slot,2.2)],0,instant);else c.m.place('h',[at(TEAM,c.home[0],c.home[1])],c.home[2],instant);});
 const sl=cur<IDX.before;SHARE_CAST.forEach(c=>{const mid=c.key==='shM',up=mid?cur===IDX.open:sl;
  if(up)c.m.place('l',[at(SHARE,c.slot[0],c.slot[1])],0,instant);else c.m.place('h',[at(SHARE,c.home[0],c.home[1])],c.home[2],instant);});
 const r=state>=fi('wait',4);if(r!==roadOn||instant){roadOn=r;roadT0=instant?-9:clock;}
}
function go(n,instant){
 n=clamp(n,0,FLAT.length-1);if(n===state)return;const from=cur,st=FLAT[n];state=n;
 if(st.stop!==from){cur=st.stop;const S=STOPS[cur],h=hero.root.position;
  let pts;
  if(instant||from<0)pts=null;
  else if(cur===from+1)pts=[[h.x,h.z],...S.path];
  else if(cur===from-1)pts=[[h.x,h.z],...STOPS[from].path.slice(0,-1).reverse(),S.spot];
  else pts=[[h.x,h.z],S.spot];
  if(!pts){hero.root.position.set(S.spot[0],0,S.spot[1]);camera.position.set(...S.cam.pos);aim.set(...S.cam.look);off.x=S.cam.ox;off.y=S.cam.oy;travel=null;arrivedAt=clock;pl.yaw=faceYaw();}
  else{const L=[0];for(let j=1;j<pts.length;j++)L.push(L[j-1]+Math.hypot(pts[j][0]-pts[j-1][0],pts[j][1]-pts[j-1][1]));
   const len=L[L.length-1],run=len>6,same=camera.position.distanceTo(tmp.set(...S.cam.pos))<.01;
   travel={t0:clock,pts,L,len,run,dir:cur>from?1:-1,pos:camera.position.clone(),aim:aim.clone(),ox:off.x,oy:off.y,cam:S.cam};
   if(run){travel.tA=.55;travel.tB=clamp(len/9,1.1,3);travel.tC=S.screen?.95:.8;travel.D=travel.tA+travel.tB+travel.tC;}
   else travel.D=same&&len<.05?.3:Math.max(1.2,len/2.4);
   GEMS.forEach(g=>{if(g.seg===cur)g.hit=false;});}
  paintScreens();
 }
 quiet=!!instant;direct(!!instant);render();
 const no=STOPS[cur].no;[...track.children].forEach((c,i)=>{c.className=i+1<no?'done':i+1===no?'now':'';});
 history.replaceState(null,'','#'+n);window.deckState={state:n,stop:cur,key:STOPS[cur].key,moving:!!travel};
}
function faceYaw(){const S=STOPS[cur],n=FLAT[state].n,f=(S.faceCam&&n>=S.faceCam)?'cam':S.face;
 return f==='cam'?yawTo(S.spot[0],S.spot[1],S.cam.pos[0],S.cam.pos[2]):yawTo(S.spot[0],S.spot[1],f[0],f[1]);}
const next=()=>go(state+1),prev=()=>go(state-1);
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
/* name tags and the "who is speaking" marker follow the people they belong to */
const spk=document.createElement('div');spk.className='spk';spk.innerHTML='<i></i>';stage.insertBefore(spk,tails);
function overlay(){let marker=false;
 if(activeEl&&!travel){let tagged=false;
  for(const el of activeEl._tags){const w=el.dataset.who,[x,y]=w?headPoint(WHO[w],.66):project(...AT[el.dataset.at]);
   const hw=el.firstElementChild.offsetWidth/2+10;el.style.left=clamp(x,hw,1280-hw)+'px';el.style.top=y+'px';if(w===talkWho&&el.classList.contains('show'))tagged=true;}
  if(talkWho&&!tagged&&STOPS[cur].cam.oy===62){const[x,y]=headPoint(WHO[talkWho],.7);spk.style.left=x+'px';spk.style.top=y+'px';marker=true;}
 }
 spk.classList.toggle('on',marker);
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
   hero.pose(clock,'walk',{phase:d/(tr.run?2.2:.71),amount:smooth(Math.min(x,1-x)/.1)*(tr.run?1.45:1)});}
  else{if(x>=1||tr.len<=.3)pl.yaw=angLerp(pl.yaw,faceYaw(),.15);hero.pose(clock,'idle',{});}
  if(tr.run){ // leave the stop, follow you from behind and above, settle into the next stop
   const fp=tmp.set(h.x+3.2,4.6,h.z+8),fa=tmp2.set(h.x,1.2,h.z);
   if(tt<tr.tA){const w=smooth(tt/tr.tA);camera.position.lerpVectors(tr.pos,fp,w);aim.lerpVectors(tr.aim,fa,w);off.x=tr.ox*(1-w);off.y=tr.oy*(1-w);}
   else if(tt<tr.tA+tr.tB){camera.position.copy(fp);aim.copy(fa);off.x=off.y=0;}
   else{const w=ease((tt-tr.tA-tr.tB)/tr.tC);camera.position.copy(fp).lerp(tmp3.set(...c.pos),w);aim.copy(fa).lerp(tmp3.set(...c.look),w);off.x=c.ox*w;off.y=c.oy*w;}
  }else{const e=ease(f);camera.position.lerpVectors(tr.pos,tmp.set(...c.pos),e);aim.lerpVectors(tr.aim,tmp.set(...c.look),e);off.x=tr.ox+(c.ox-tr.ox)*e;off.y=tr.oy+(c.oy-tr.oy)*e;}
  if(f===1){travel=null;arrivedAt=clock;render();window.deckState.moving=false;}
 }else{pl.yaw=angLerp(pl.yaw,faceYaw(),.15);const S=STOPS[cur],u=clock-arrivedAt,me=say('hero');
  const wave=S.wave?Math.max(env(u,.5,3.4,.4),env((u-3.4)%7,4.5,6.6,.4)):0;
  hero.pose(clock,'idle',{wave,talk:me,gesture:me&&!S.wave?env(clock%4,.4,2.6,.5):0,yaw:S.wave||me?0:.22*Math.sin(clock*.5),pitch:S.wave||me?0:-.08});}
 hero.root.rotation.y=pl.yaw;
 camera.setViewOffset(1280,720,off.x,off.y,1280,720);camera.lookAt(aim);camera.updateMatrixWorld();
 // diamonds
 let n=0;const trav=!!travel,dir=trav?travel.dir:1;
 for(const g of GEMS){if(trav&&dir>0&&g.seg===cur&&!g.hit&&Math.hypot(h.x-g.x,h.z-g.z)<1)g.hit=true;
  const got=g.seg<cur||(g.seg===cur&&(!trav||dir<0||g.hit))||(g.seg===cur+1&&trav&&dir<0);
  if(got&&!g.got&&!quiet){const v=tmp.copy(g.m.position).project(camera);flyGem(clamp((v.x+1)*640,-30,1300),clamp((1-v.y)*360,-30,740));}
  g.got=got;g.m.visible=g.sh.visible=!got&&(trav?g.seg===cur:cur===IDX.pilot&&g.seg===cur+1);if(got)n++;g.m.rotation.y=t*1.6+g.x;g.m.position.y=1.25+.1*Math.sin(t*2+g.x);}
 if(n!==gemCount){gemCount=n;$('gems').textContent=n;}
 quiet=false;
 // pilot team: work calmly until the pilot works, then everyone crowds the screen
 const party=cur>=IDX.wow;if(party)pilot.display.party(t);
 const rv=reviewerWalk(party?5.2:t),near=party?1:rv.name==='stay'?env(rv.u,.2,rv.dur-.2,.8):0;
 const ch=i=>party&&.5+.5*Math.sin(t*3+i*1.7)>.55?1:0;
 reviewer.pose(t,!party&&rv.walk?'walk':'idle',!party&&rv.walk?rv.walk:{tablet:near<.5?1:0,gesture:party?0:near*env(rv.u%3,.3,2.2,.5),cheer:ch(2),talk:near*env(rv.u%3,.2,2.4,.4),yaw:near*.25,pitch:party?-.15:rv.name==='waitA'?.28:0});
 if(party){pilot.A.pose(t,'sit',{yaw:-.22,pitch:-.22,cheer:ch(0),talk:ch(0)});pilot.B.pose(t,'sit',{yaw:.22,pitch:-.22,cheer:ch(1),talk:ch(1)});}
 else{seatLoop(pilot.A,t,2,-1);const ub=(t+8)%13,typB=env(ub,.3,5.5,.5)*(1-near);
  pilot.B.pose(t,'sit',{typing:typB,yaw:.22*(1-near)-1.05*near,pitch:-.14*(1-typB),talk:near*env((rv.u+1.5)%3,.2,2.2,.4)});}
 fans.forEach((m,i)=>m.update(t,dt,party?{pitch:-.2,cheer:ch(3+i),talk:ch(3+i)}:{yaw:.3*Math.sin(t*.4+i)}));
 FLOAT.forEach((f,i)=>{const on=here&&f.on()&&((clock*(f.note?1.3:.9)+i*1.37)%(f.note?2.2:2.9))<(f.note?1:1.4);
  if(on){const[x,y]=project(...f.at());f.el.style.left=x+'px';f.el.style.top=y-(f.note?((clock*1.3+i*1.37)%2.2)*26:0)+'px';}
  f.el.classList.toggle('on',on);});
 // the units that have to run, pay for, and make room for the pilot light up as groups
 const hk=marksOn?smooth((clock-marksT0-.2)/.6):0;ground.material.uniforms.hlOn.value=hk*(.75+.25*Math.sin(clock*4));
 if(marksOn){rings.forEach((r,i)=>r.scale.setScalar(.9+.1*smooth((clock-marksT0-.2-i*.45)/.4)));
  MARKS.forEach(m=>{const[x,y]=project(m.c[0],4.3,m.c[1]-1);m.el.style.left=clamp(x,110,1168)+'px';m.el.style.top=y+m.dy+'px';});}
 seatLoop(finance.A,t,4,-1);seatLoop(finance.B,t,9,1);finC.pose(t,'idle',{gesture:env(t%14,4.5,7,.5),talk:env(t%14,4.2,7.2,.4),yaw:.2});
 // operations: each person asks their question when it is their turn
 seatLoop(ops.A,t,3,-1);seatLoop(ops.B,t,10,1);
 opsS.forEach((p,i)=>{const s=say('s'+(i+1));p.pose(t,'idle',{talk:s,gesture:s*env(t%4,.4,2.6,.5),tablet:s?0:i%2,yaw:s?0:(i%2?-.5:.5)*env((t+i*3)%9,2,6,.6),pitch:s?0:.1*(i%2)});});
 // the established team keeps serving customers while its lead and an agent answer you
 seatLoop(est.A,t,5,-1,{talk:env((t+5)%13,1,5,.5)});seatLoop(est.B,t,11,1,{talk:env((t+11)%13,2,5.5,.5)});
 {const s=say('estR');estR.pose(t,'idle',{tablet:s?0:1,talk:s,gesture:s*env(t%4,.4,2.6,.5),pitch:s?0:.2-.25*env(t%10,5,9,.6),yaw:s?-.3:0});}
 {const s=say('estG');estG.pose(t,'idle',{talk:s,gesture:s*env(t%4,.4,2.6,.5),yaw:s?-.5:.3*Math.sin(t*.4)});}
 // a Steinway for everyone: a lot of expensive noise
 seatLoop(buy.A,t,8,-1);seatLoop(buy.B,t,12,1);pianists.forEach(p=>p.pose(t,'idle',{piano:1,pitch:.12}));
 seatLoop(product.A,t,1,-1);seatLoop(product.B,t,6,1);prodC.pose(t,'idle',{tablet:1,pitch:.25-.3*env(t%9,5,8,.6),yaw:.5*env(t%9,5,8,.6)});
 // planning: people talk around the table until they line up as one conventional team
 PLN_CAST.forEach((c,i)=>c.m.update(t,dt,c.m.key==='l'?{yaw:.25*Math.sin(t*.5+i*1.9)}:{gesture:i%3===0?env((t+i*2)%11,2,6,.6):0,talk:env((t+i*2.3)%11,2,6.5,.4),tablet:i%3===1?1:0,yaw:.4*Math.sin(t*.3+i)}));
 const rk=roadOn?clamp((clock-roadT0)/1.6,0,1):0; // the roadmap fills in month by month until it covers the year
 for(const nt of board.notes){const k=nt.c<3?1:clamp(rk*12-nt.c+1,0,1);nt.m.visible=k>0;nt.m.scale.setScalar(.4+.6*k);}
 for(let i=0;i<12;i++){const lit=roadOn&&rk*12>=i;board.heads[i*2].visible=!lit;board.heads[i*2+1].visible=lit;}
 TEAM_CAST.forEach((c,i)=>c.m.update(t,dt,c.m.key==='l'?{yaw:.2*Math.sin(t*.5+i*1.7),tablet:i===2?1:0}:c.m.key==='g'?{gesture:env((t+i*2.2)%6.6,.3,2,.4),talk:env((t+i*2.2)%6.6,.2,2.2,.4),pitch:-.12}:{tablet:i%2,pitch:.15,talk:env((t+i*3)%10,2,5,.4),yaw:.3*Math.sin(t*.35+i)}));
 if(cur===IDX.how&&here){const ph=teamDisplay.proto(clock-arrivedAt);flowSteps.forEach((el,i)=>el.classList.toggle('now',i===ph));} // the team builds, reviews and changes a prototype on its screen
 seatLoop(wider.A,t,3,-1);seatLoop(wider.B,t,9,1);widerC.pose(t,'idle',{tablet:1,pitch:.2});
 SHARE_CAST.forEach((c,i)=>{const s=say(c.key);c.m.update(t,dt,{talk:s,gesture:s*env(t%4,.4,2.6,.5),yaw:s?0:(i===0?.35:i===1?-.35:0)*(.6+.4*Math.sin(t*.4+i))});});
 if(costDirty)drawCost(clock);
 overlay();
 renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(post,postCam);
}
document.fonts.ready.then(()=>{go(Number(location.hash.slice(1))||0,true);requestAnimationFrame(animate);});
window.deck={go,next,prev,count:FLAT.length,fi,stops:STOPS.map(s=>s.key)};
})();
