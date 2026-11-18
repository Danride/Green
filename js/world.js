// Deterministic procedural vegetation, deposits and grassy terrain on a 128×128 grid.
let worldSeed=0;
function seededRng(seed){let x=seed>>>0;return ()=>{
  x+=0x6d2b79f5;let t=x;t=Math.imul(t^(t>>>15),t|1);
  t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;
};}
function hash2(i,j,seed){let x=(Math.imul(i,374761393)+Math.imul(j,668265263)+seed)|0;
  x=Math.imul(x^(x>>>13),1274126177);return ((x^(x>>>16))>>>0)/4294967296;}
function colorTerrain(seed){
  const colors=landGeometry.attributes.color;
  const c=new THREE.Color();
  for(let k=0;k<colors.count;k++){
    const i=k%(N+1),j=Math.floor(k/(N+1));
    const regional=Math.sin((i+seed%113)*.105)*Math.cos((j-seed%67)*.092);
    const fine=hash2(i,j,seed)-.5;
    const tone=Math.max(0,Math.min(1,.53+regional*.32+fine*.13));
    c.setRGB(.40+tone*.21,.64+tone*.23,.32+tone*.13,THREE.SRGBColorSpace);
    colors.setXYZ(k,c.r,c.g,c.b);
  }
  colors.needsUpdate=true;
}
function generateNature(seed){
  const random=seededRng(seed);worldSeed=seed>>>0;
  colorTerrain(worldSeed);
  for(let j=2;j<N-2;j++)for(let i=2;i<N-2;i++){
    const distance=Math.hypot(i-HALF,j-HALF);
    if(distance<5.2)continue; // clear central starting area, but no starting buildings
    const patch=Math.sin(i*.17+seed%97)*Math.cos(j*.12+seed%71);
    const r=random(),variant=random();
    const forestChance=.027+Math.max(0,patch)*.072;
    const rockChance=.015+Math.max(0,-patch)*.025;
    const type=r<rockChance?'rock':r<rockChance+forestChance?'tree':null;
    if(type)addBuilding(type,i,j,0,{generated:true,variant});
  }
  // Guarantee usable wood and stone close to the first settlement.
  for(const [type,di,dj] of [['tree',7,2],['tree',-8,1],['tree',4,-8],['tree',-5,-7],
    ['rock',-7,5],['rock',8,-3],['rock',5,8],['rock',-8,-4]]){
    const i=HALF+di,j=HALF+dj;
    if(allowed(type,i,j))addBuilding(type,i,j,0,{generated:true,variant:.5});
  }
  markNatureDirty();
}
function startWorld(){
  clearWorld();wood=200;stone=0;gold=0;deliveries=0;stoneDeliveries=0;
  generateNature((Math.random()*0xffffffff)>>>0);
  if(typeof homeCamera==='function')homeCamera();
  if(typeof refresh==='function')refresh();
  store();
}
