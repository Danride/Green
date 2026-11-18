// Residents mine stone and chop timber. Rewards are credited only after delivery.
function workerCell(w){return indexAt(w.model.position.x,w.model.position.z);}
function overlapsResident(type,i,j){
  if(type==='road')return false;
  const occupied=new Set(cellsFor(type,i,j).map(p=>tileKey(p.i,p.j)));
  return workers.some(w=>{const p=workerCell(w);return occupied.has(tileKey(p.i,p.j));});
}
function pathTo(w,b){return walkPath(workerCell(w),adjacentTo(b));}
function attachEquipment(w){
  const axe=new THREE.Group();
  const handle=new THREE.Mesh(new THREE.CylinderGeometry(.012,.014,.18,5),mats.wood);
  handle.position.y=.075;axe.add(handle);
  const blade=new THREE.Mesh(new THREE.BoxGeometry(.083,.044,.028),mats.metal);
  blade.position.set(.033,.148,0);axe.add(blade);
  axe.position.set(.12,.13,-.10);axe.visible=false;w.model.add(axe);w.axe=axe;
  const log=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,.24,7),mats.log);
  log.rotation.z=Math.PI/2;log.position.set(0,.19,-.13);log.visible=false;w.model.add(log);w.log=log;
  const stoneProp=new THREE.Mesh(new THREE.DodecahedronGeometry(.09,0),new THREE.MeshLambertMaterial({color:'#a0a5aa'}));
  stoneProp.position.set(0,.20,-.14);stoneProp.visible=false;w.model.add(stoneProp);w.stoneProp=stoneProp;
}
function createWorker(home,slot){
  const exits=adjacentTo(home),spawn=exits[slot%Math.max(1,exits.length)]||nearestEmpty(home.i+1,home.j);
  const p=coords(spawn.i,spawn.j),model=(templates.person||personFallback()).clone(true);
  model.position.set(p.x,0,p.z);model.rotation.y=Math.PI;cloneAndShade(model);scene.add(model);
  const w={id:++workerId,homeId:home.id,slot,model,state:'idle',path:[],resourceId:null,depotId:null,
    carrying:null,chop:0,wait:Math.random()*.5,mixer:null,axe:null,log:null,stoneProp:null,phase:Math.random()*6.28};
  attachEquipment(w);
  if(templates.person&&personClip){w.mixer=new THREE.AnimationMixer(model);w.mixer.clipAction(personClip).play();}
  workers.push(w);return w;
}
function spawnResidents(home){const count=1+((home.i*13+home.j*7)%2);for(let n=0;n<count;n++)createWorker(home,n);}
function removeWorker(w){
  if(w.resourceId){const b=buildings.get(w.resourceId);if(b&&b.reservedBy===w.id)b.reservedBy=null;}
  w.mixer?.stopAllAction();scene.remove(w.model);
  for(const prop of [w.axe,w.log,w.stoneProp])prop?.traverse(o=>{
    if(o.isMesh){o.geometry?.dispose();if(o===w.stoneProp)o.material?.dispose();}
  });
  const i=workers.indexOf(w);if(i>=0)workers.splice(i,1);
}
function replaceWorkerModels(){
  for(const w of workers){
    const position=w.model.position.clone(),rot=w.model.rotation.y;
    w.mixer?.stopAllAction();scene.remove(w.model);
    for(const prop of [w.axe,w.log,w.stoneProp])prop?.traverse(o=>{
      if(o.isMesh){o.geometry?.dispose();if(o===w.stoneProp)o.material?.dispose();}
    });
    w.model=(templates.person||personFallback()).clone(true);
    w.model.position.copy(position);w.model.rotation.y=rot;cloneAndShade(w.model);
    scene.add(w.model);attachEquipment(w);
    w.axe.visible=w.state==='working';w.log.visible=w.carrying==='wood';w.stoneProp.visible=w.carrying==='stone';
    w.mixer=null;
    if(templates.person&&personClip){w.mixer=new THREE.AnimationMixer(w.model);w.mixer.clipAction(personClip).play();}
  }
}
function lookToward(w,x,z,dt){
  const dx=x-w.model.position.x,dz=z-w.model.position.z;
  if(Math.abs(dx)+Math.abs(dz)<.0001)return;
  // The original Blockbench eyes are located on local -Z.
  const desired=Math.atan2(-dx,-dz);
  const delta=Math.atan2(Math.sin(desired-w.model.rotation.y),Math.cos(desired-w.model.rotation.y));
  w.model.rotation.y+=delta*Math.min(1,dt*15);
}
function depotType(type){return type==='stone'?'quarry':'sawmill';}
function matchingDepots(type){return allBuildings(depotType(type));}
function assignDelivery(w){
  if(!w.carrying)return false;
  let best=null;
  for(const depot of matchingDepots(w.carrying)){
    const path=pathTo(w,depot);
    if(path&&(!best||path.length<best.path.length))best={depot,path};
  }
  if(!best)return false;
  w.depotId=best.depot.id;w.path=best.path;w.state='toDepot';return true;
}
function assignWork(w){
  if(w.carrying)return assignDelivery(w);
  const p=workerCell(w),sources=[];
  const canWood=matchingDepots('wood').length>0,canStone=matchingDepots('stone').length>0;
  if(!canWood&&!canStone)return false;
  for(const b of buildings.values()){
    const type=b.type==='tree'?'wood':b.type==='rock'?'stone':null;
    if(!type||(type==='wood'&&!canWood)||(type==='stone'&&!canStone))continue;
    if(b.reservedBy!==null||(type==='wood'?b.logs:b.ore)<1)continue;
    const dist=Math.abs(b.i-p.i)+Math.abs(b.j-p.j);
    if(dist>19)continue; // no expensive world-wide path search per worker
    sources.push({b,dist,type});
  }
  sources.sort((a,b)=>a.dist-b.dist);
  for(const candidate of sources.slice(0,14)){
    const path=pathTo(w,candidate.b);
    if(!path)continue;
    candidate.b.reservedBy=w.id;
    w.resourceId=candidate.b.id;w.path=path;w.state='toResource';return true;
  }
  return false;
}
function wander(w){
  const home=buildings.get(w.homeId);if(!home)return;
  const p=workerCell(w);
  for(let n=0;n<7;n++){
    const i=home.i+Math.floor(Math.random()*13)-6,j=home.j+Math.floor(Math.random()*13)-6;
    if(!accessible(i,j))continue;
    const path=walkPath(p,[{i,j}]);
    if(path){w.path=path;w.state='wander';return;}
  }
  w.wait=1.5;
}
function stopJob(w){
  if(w.resourceId){const r=buildings.get(w.resourceId);if(r&&r.reservedBy===w.id)r.reservedBy=null;}
  w.resourceId=null;w.depotId=null;w.path=[];w.state='idle';w.wait=.3;
  w.axe.visible=false;
}
function finishHarvest(w){
  const b=buildings.get(w.resourceId);
  if(!b||(b.type==='tree'&&b.logs<1)||(b.type==='rock'&&b.ore<1)){stopJob(w);return;}
  const material=b.type==='rock'?'stone':'wood';
  if(material==='wood')b.logs--;else b.ore--;
  b.reservedBy=null;
  if((material==='wood'?b.logs:b.ore)===0)b.regrow=material==='wood'?TREE_REGEN_SECONDS:ROCK_REGEN_SECONDS;
  markNatureDirty();
  w.resourceId=null;w.carrying=material;
  w.axe.visible=false;w.log.visible=material==='wood';w.stoneProp.visible=material==='stone';
  if(!assignDelivery(w)){w.state='idle';w.wait=1;}
}
function atDestination(w){
  if(w.state==='toResource'){
    const b=buildings.get(w.resourceId);
    if(!b||(b.type==='tree'&&b.logs<1)||(b.type==='rock'&&b.ore<1)){stopJob(w);return;}
    const p=tileCenter(b);lookToward(w,p.x,p.z,1);
    w.state='working';w.chop=b.type==='rock'?MINE_SECONDS:FELL_SECONDS;
    w.axe.visible=true;return;
  }
  if(w.state==='toDepot'){
    const b=buildings.get(w.depotId);
    if(!b||b.type!==depotType(w.carrying)){w.depotId=null;w.state='idle';return;}
    if(w.carrying==='wood'){
      wood+=WOOD_PER_LOG;deliveries++;floatingText(`+${WOOD_PER_LOG} 🪵`,w.model.position);
    }else if(w.carrying==='stone'){
      stone+=STONE_PER_ROCK;stoneDeliveries++;floatingText(`+${STONE_PER_ROCK} 🪨`,w.model.position);
    }
    w.carrying=null;w.depotId=null;w.log.visible=false;w.stoneProp.visible=false;
    w.state='idle';w.wait=.25;refresh();return;
  }
  w.state='idle';w.wait=.4;
}
function updateWorkers(dt){
  for(const w of workers){
    w.mixer?.update(dt);
    if(w.state==='working'){
      const b=buildings.get(w.resourceId);
      if(!b||(b.type==='tree'&&!b.logs)||(b.type==='rock'&&!b.ore)){stopJob(w);continue;}
      const p=tileCenter(b);lookToward(w,p.x,p.z,dt);
      w.axe.rotation.z=Math.sin((FELL_SECONDS-w.chop)*13)*.65;
      w.chop-=dt;if(w.chop<=0)finishHarvest(w);
      continue;
    }
    if(w.path.length){
      const next=w.path[0];
      if(!accessible(next.i,next.j)){
        w.path=[];
        if(w.state==='toResource'){
          const b=buildings.get(w.resourceId),alternate=b?pathTo(w,b):null;
          if(alternate)w.path=alternate;else stopJob(w);
        }else if(w.state==='toDepot'){
          if(!assignDelivery(w))w.state='idle';
        }else w.state='idle';
        continue;
      }
      const p=coords(next.i,next.j),pos=w.model.position;
      const dx=p.x-pos.x,dz=p.z-pos.z,dist=Math.hypot(dx,dz);
      if(dist<.045){pos.x=p.x;pos.z=p.z;w.path.shift();if(!w.path.length)atDestination(w);}
      else{
        lookToward(w,p.x,p.z,dt);
        const speed=getAt(next.i,next.j)?.type==='road'?1.1:.84;
        const step=Math.min(dist,speed*dt);
        pos.x+=dx/dist*step;pos.z+=dz/dist*step;
        if(!w.mixer)pos.y=Math.abs(Math.sin(performance.now()*.010+w.phase))*.018;
      }
      continue;
    }
    if(!w.mixer)w.model.position.y=0;
    if(w.wait>0){w.wait-=dt;continue;}
    if(w.state==='toResource'||w.state==='toDepot'){atDestination(w);continue;}
    if(w.state==='idle'||w.state==='wander'){
      if(assignWork(w))continue;
      if(w.carrying){w.wait=1.5;continue;}
      wander(w);w.wait=1.5;
    }
  }
}
let resourceTimer=0;
function updateResources(dt){
  resourceTimer+=dt;
  if(resourceTimer<.8)return;
  const elapsed=resourceTimer;resourceTimer=0;
  let dirty=false;
  for(const b of buildings.values()){
    if((b.type==='tree'&&b.logs===0)||(b.type==='rock'&&b.ore===0)){
      b.regrow-=elapsed;
      if(b.regrow<=0){if(b.type==='tree')b.logs=3;else b.ore=4;b.regrow=0;dirty=true;}
    }
  }
  if(dirty)markNatureDirty();
}
