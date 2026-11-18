// Cell occupancy, building construction, procedural resource nodes.
let wood=200,stone=0,gold=0,tool='house',rotation=0,deliveries=0,stoneDeliveries=0;
let workerId=0,buildingId=0;
const buildings=new Map(),byCell=new Map(),workers=[];
const sizes={house:[1,1],sawmill:[2,2],quarry:[2,2],road:[1,1],tree:[1,1],rock:[1,1]};
const costs={house:25,sawmill:60,quarry:70,road:3,tree:6,rock:0};
const stoneCosts={house:0,sawmill:0,quarry:0,road:1,tree:0,rock:0};
const dirs=[[0,-1],[1,0],[0,1],[-1,0]];
function cellsFor(type,i,j){const [w,h]=sizes[type];const cells=[];
  for(let dz=0;dz<h;dz++)for(let dx=0;dx<w;dx++)cells.push({i:i+dx,j:j+dz});
  return cells;
}
function allowed(type,i,j){return !!sizes[type]&&cellsFor(type,i,j).every(p=>within(p.i,p.j)&&!byCell.has(tileKey(p.i,p.j)));}
function getAt(i,j){const id=byCell.get(tileKey(i,j));return id===undefined?null:buildings.get(id)||null;}
function accessible(i,j){if(!within(i,j))return false;const b=getAt(i,j);return !b||b.type==='road';}
function tileCenter(b){return {x:b.i+(b.w-1)/2-HALF+.5,z:b.j+(b.h-1)/2-HALF+.5};}
function adjacentTo(b){const out=[];
  for(let y=b.j-1;y<=b.j+b.h;y++)for(let x=b.i-1;x<=b.i+b.w;x++){
    const edge=((x===b.i-1||x===b.i+b.w)&&y>=b.j&&y<b.j+b.h)||
      ((y===b.j-1||y===b.j+b.h)&&x>=b.i&&x<b.i+b.w);
    if(edge&&accessible(x,y))out.push({i:x,j:y});
  }
  return out;
}
function nearestEmpty(i,j){
  if(accessible(i,j))return {i,j};
  // Search in widening rings, without scanning every tile in the world.
  for(let r=1;r<=14;r++)for(let d=-r;d<=r;d++){
    for(const p of [{i:i+d,j:j+(r-Math.abs(d))},{i:i+d,j:j-(r-Math.abs(d))}])if(accessible(p.i,p.j))return p;
  }
  return {i:HALF,j:HALF};
}
function cloneAndShade(m){m.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});return m;}
function newModel(b){
  if(b.type==='road'){b.model=null;markRoadsDirty();return;}
  if(b.type==='tree'||b.type==='rock'){b.model=null;markNatureDirty();return;}
  let model;
  if(b.type==='house')model=(templates.house||houseFallback()).clone(true);
  else if(b.type==='sawmill')model=(templates.sawmill||sawmillFallback()).clone(true);
  else if(b.type==='quarry')model=quarryFallback();
  else throw new Error(`Unknown building: ${b.type}`);
  // User's house and sawmill are rotated 180 degrees as requested.
  model.rotation.y=Math.PI+(b.rot||0)*Math.PI/2;
  const p=tileCenter(b);model.position.set(p.x,0,p.z);
  cloneAndShade(model);scene.add(model);b.model=model;
  if(b.type==='sawmill'&&templates.sawmill&&sawClip){
    b.mixer=new THREE.AnimationMixer(model);b.mixer.clipAction(sawClip).play();
  }
}
function disposeBuildingModel(b){
  if(!b.model)return;
  scene.remove(b.model);
  if(b.type==='quarry')b.model.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});
  b.model=null;
}
function rebuildModel(b){disposeBuildingModel(b);b.mixer?.stopAllAction();b.mixer=null;newModel(b);}
function addBuilding(type,i,j,rot=0,opts={}){
  if(!allowed(type,i,j))return null;
  const [w,h]=sizes[type];
  const b={id:++buildingId,type,i,j,w,h,rot,
    logs:type==='tree'?Math.max(0,Math.min(3,Number.isFinite(opts.logs)?opts.logs:3)):0,
    ore:type==='rock'?Math.max(0,Math.min(4,Number.isFinite(opts.ore)?opts.ore:4)):0,
    variant:Number.isFinite(opts.variant)?opts.variant:.5,
    generated:!!opts.generated,regrow:Math.max(0,Number(opts.regrow)||0),
    reservedBy:null,model:null,mixer:null};
  buildings.set(b.id,b);
  for(const p of cellsFor(type,i,j))byCell.set(tileKey(p.i,p.j),b.id);
  newModel(b);
  if(type==='house')spawnResidents(b);
  return b;
}
function removeBuilding(b,{refund=true}={}){
  if(!b)return;
  if(b.type==='house')for(const w of [...workers])if(w.homeId===b.id)removeWorker(w);
  // A removed resource or depot invalidates a worker's current job.
  for(const w of workers){
    if(w.resourceId===b.id||w.depotId===b.id){
      if(w.resourceId===b.id)w.resourceId=null;
      if(w.depotId===b.id)w.depotId=null;
      w.path=[];w.wait=.2;w.state='idle';w.axe&&(w.axe.visible=false);
    }
  }
  b.mixer?.stopAllAction();disposeBuildingModel(b);
  for(const p of cellsFor(b.type,b.i,b.j))byCell.delete(tileKey(p.i,p.j));
  buildings.delete(b.id);
  if(b.type==='road')markRoadsDirty();
  if(b.type==='tree'||b.type==='rock')markNatureDirty();
  if(refund&&!b.generated){
    wood+=Math.floor((costs[b.type]||0)/2);
    stone+=Math.floor((stoneCosts[b.type]||0)/2);
  }
}
function allBuildings(type){return [...buildings.values()].filter(b=>b.type===type);}
