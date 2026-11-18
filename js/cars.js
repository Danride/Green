// Road traffic. Exported Blockbench car headlights face local -Z.
const CAR_SIZE=.68; // 2x previous .34
const CAR_LIMIT=12;
const CAR_SPEED=.62;
const ROAD_DIRECTIONS=[[0,1],[1,0],[0,-1],[-1,0]];
const traffic={template:null,clip:null,cars:[],lastRoadVersion:-1};
const roadTile=(i,j)=>within(i,j)&&getAt(i,j)?.type==='road';
const carBody=new THREE.MeshLambertMaterial({color:'#973a37'});
const carGlass=new THREE.MeshLambertMaterial({color:'#77978a'});
const carWheel=new THREE.MeshLambertMaterial({color:'#2e3031'});
const carFallbackGeometry={body:new THREE.BoxGeometry(.40,.14,.60),roof:new THREE.BoxGeometry(.31,.16,.33),wheel:new THREE.BoxGeometry(.07,.12,.14)};
function carFallback(){
  const g=new THREE.Group();
  const body=new THREE.Mesh(carFallbackGeometry.body,carBody);body.position.y=.15;g.add(body);
  const roof=new THREE.Mesh(carFallbackGeometry.roof,carGlass);roof.position.set(0,.29,.02);g.add(roof);
  for(const x of [-.20,.20])for(const z of [-.21,.21]){
    const wheel=new THREE.Mesh(carFallbackGeometry.wheel,carWheel);wheel.position.set(x,.085,z);g.add(wheel);
  }
  return g;
}
function roadNeighbors(i,j){
  const result=[];
  for(const [dx,dz] of ROAD_DIRECTIONS){
    const a=i+dx,b=j+dz;if(roadTile(a,b))result.push({i:a,j:b});
  }
  return result;
}
function roadNetworks(){
  const seen=new Set(),groups=[];
  for(const b of buildings.values()){
    if(b.type!=='road')continue;
    const start=tileKey(b.i,b.j);if(seen.has(start))continue;
    seen.add(start);const open=[{i:b.i,j:b.j}],network=[];
    for(let k=0;k<open.length;k++){
      const p=open[k];network.push(p);
      for(const n of roadNeighbors(p.i,p.j)){
        const key=tileKey(n.i,n.j);
        if(!seen.has(key)){seen.add(key);open.push(n);}
      }
    }
    if(network.length>=2)groups.push(network);
  }
  return groups;
}
function releaseCar(c){
  c.mixer?.stopAllAction();
  scene.remove(c.model);
  // Imported assets share geometry/materials; do not dispose them.
}
function clearCars(){for(const c of traffic.cars)releaseCar(c);traffic.cars.length=0;}
function makeCarModel(){
  const model=(traffic.template||carFallback()).clone(true);
  model.traverse(obj=>{if(obj.isMesh){obj.castShadow=false;obj.receiveShadow=false;}});
  return model;
}
function chooseNextRoad(c){
  let options=roadNeighbors(c.i,c.j);
  if(!options.length){c.target=null;return;}
  if(c.previous){const ahead=options.filter(p=>p.i!==c.previous.i||p.j!==c.previous.j);if(ahead.length)options=ahead;}
  // Avoid another vehicle's current/destination tile.
  const free=options.filter(p=>!traffic.cars.some(other=>other!==c&&
    ((other.i===p.i&&other.j===p.j)||(other.target?.i===p.i&&other.target?.j===p.j))));
  if(free.length)options=free;
  else {c.target=null;c.pause=.35;return;}
  c.target=options[Math.floor(Math.random()*options.length)];
}
function makeCar(p){
  const model=makeCarModel(),at=coords(p.i,p.j);
  model.position.set(at.x,.065,at.z);scene.add(model);
  const c={model,i:p.i,j:p.j,target:null,previous:null,pause:0,speed:CAR_SPEED*(.85+Math.random()*.3),mixer:null};
  traffic.cars.push(c);
  if(traffic.template&&traffic.clip){
    c.mixer=new THREE.AnimationMixer(model);c.mixer.clipAction(traffic.clip).play();
  }
  chooseNextRoad(c);
  return c;
}
function syncTraffic(){
  const groups=roadNetworks();
  const valid=new Set(groups.flat().map(p=>tileKey(p.i,p.j)));
  // Existing cars survive road edits while their tile is still connected.
  for(let i=traffic.cars.length-1;i>=0;i--){
    const c=traffic.cars[i];
    if(!valid.has(tileKey(c.i,c.j))){releaseCar(c);traffic.cars.splice(i,1);}
    else if(c.target&&!roadTile(c.target.i,c.target.j))c.target=null;
  }
  // With 2x larger cars 4 non-overlapping vehicles no longer fit within one tile.
  const desired=Math.min(CAR_LIMIT,groups.reduce((sum,g)=>sum+Math.floor(g.length/4),0));
  if(traffic.cars.length>desired){
    for(let n=traffic.cars.length-1;n>=desired;n--){releaseCar(traffic.cars[n]);traffic.cars.pop();}
  }
  const occupied=new Set(traffic.cars.map(c=>tileKey(c.i,c.j)));
  const roads=groups.flat().filter(p=>!occupied.has(tileKey(p.i,p.j)));
  while(traffic.cars.length<desired&&roads.length){
    const index=Math.floor(Math.random()*roads.length),p=roads.splice(index,1)[0];
    makeCar(p);
  }
  traffic.lastRoadVersion=roadVersion;
}
function refreshCarModels(){
  for(const c of traffic.cars){
    const pos=c.model.position.clone(),rot=c.model.rotation.y;
    releaseCar(c);
    c.model=makeCarModel();c.model.position.copy(pos);c.model.rotation.y=rot;scene.add(c.model);c.mixer=null;
    if(traffic.template&&traffic.clip){c.mixer=new THREE.AnimationMixer(c.model);c.mixer.clipAction(traffic.clip).play();}
  }
}
function updateCars(dt){
  if(traffic.lastRoadVersion!==roadVersion)syncTraffic();
  for(const c of traffic.cars){
    c.mixer?.update(dt);
    if(!roadTile(c.i,c.j))continue;
    if(!c.target||!roadTile(c.target.i,c.target.j)){
      c.pause-=dt;
      if(c.pause<=0){chooseNextRoad(c);c.pause=.18;}
      continue;
    }
    const dest=coords(c.target.i,c.target.j),pos=c.model.position;
    const dx=c.target.i-c.i,dz=c.target.j-c.j;
    const x=dest.x,z=dest.z,deltaX=x-pos.x,deltaZ=z-pos.z;
    const dist=Math.hypot(deltaX,deltaZ);
    // Headlights are at the model's local -Z end, not +Z.
    const face=Math.atan2(-dx,-dz);
    const turn=Math.atan2(Math.sin(face-c.model.rotation.y),Math.cos(face-c.model.rotation.y));
    c.model.rotation.y+=turn*Math.min(1,dt*12);
    if(dist<=.035){
      pos.set(x,.065,z);
      c.previous={i:c.i,j:c.j};c.i=c.target.i;c.j=c.target.j;
      c.target=null;c.pause=.1;
    }else{
      const step=Math.min(dist,c.speed*dt);
      pos.x+=deltaX/dist*step;pos.z+=deltaZ/dist*step;
    }
  }
}
