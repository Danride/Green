// v4 save key deliberately prevents old prototype settlements from pre-populating a new world.
const SAVE_KEY='green_fief_v4';
function store(){try{
  const all=[...buildings.values()].map(b=>({type:b.type,i:b.i,j:b.j,rot:b.rot,
    logs:b.logs,ore:b.ore,regrow:b.regrow,variant:b.variant,generated:b.generated}));
  localStorage.setItem(SAVE_KEY,JSON.stringify({version:4,seed:worldSeed,wood,stone,gold,
    deliveries,stoneDeliveries,buildings:all}));
}catch(e){console.warn('Save not available',e);}}
function restore(){
  try{
    const raw=localStorage.getItem(SAVE_KEY);if(!raw)return false;
    const save=JSON.parse(raw);if(!save||save.version!==4||!Array.isArray(save.buildings))return false;
    clearWorld();worldSeed=(Number(save.seed)||0)>>>0;colorTerrain(worldSeed);
    wood=Number.isFinite(save.wood)?Math.max(0,save.wood):200;
    stone=Number.isFinite(save.stone)?Math.max(0,save.stone):0;
    gold=Number.isFinite(save.gold)?Math.max(0,save.gold):0;
    deliveries=Number.isFinite(save.deliveries)?save.deliveries:0;
    stoneDeliveries=Number.isFinite(save.stoneDeliveries)?save.stoneDeliveries:0;
    // Build nodes first; structures later, to preserve the original occupancy.
    for(const b of save.buildings){
      if(!sizes[b.type]||!Number.isInteger(b.i)||!Number.isInteger(b.j))continue;
      addBuilding(b.type,b.i,b.j,Number(b.rot)||0,{logs:b.logs,ore:b.ore,
        regrow:b.regrow,variant:b.variant,generated:b.generated});
    }
    markRoadsDirty();markNatureDirty();refresh();return true;
  }catch(e){console.warn('Restore failed',e);return false;}
}
function clearWorld(){
  if(typeof clearCars==='function')clearCars();
  for(const w of [...workers])removeWorker(w);
  for(const b of [...buildings.values()])removeBuilding(b,{refund:false});
  buildings.clear();byCell.clear();buildingId=0;workerId=0;
  deliveries=0;stoneDeliveries=0;
  markRoadsDirty();markNatureDirty();
}
