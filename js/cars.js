// Traffic on road tiles. Cars are intentionally much smaller than one tile:
// a 2×2 arrangement fits inside a single road cell.
const traffic={template:null,clip:null,cars:[],roadStamp:'',countdown:0};
const CAR_SIZE=.34;
const CAR_LIMIT=18;
const CAR_SPEED=.55;
const ROAD_DIRECTIONS=[[0,1],[1,0],[0,-1],[-1,0]];
const roadTile=(i,j)=>getAt(i,j)?.type==='road';
function carFallback(){
  const car=new THREE.Group();
  const body=new THREE.Mesh(new THREE.BoxGeometry(.24,.095,.36),new THREE.MeshLambertMaterial({color:0x202328}));
  body.position.y=.14;car.add(body);
  const top=new THREE.Mesh(new THREE.BoxGeometry(.19,.09,.19),new THREE.MeshLambertMaterial({color:0x383f47}));
  top.position.set(0,.22,-.03);car.add(top);
  for(const x of [-.13,.13])for(const z of [-.11,.11]){
    const wheel=new THREE.Mesh(new THREE.BoxGeometry(.045,.09,.095),new THREE.MeshLambertMaterial({color:0x0b0b0e}));
    wheel.position.set(x,.095,z);car.add(wheel);
  }
  return car;
}
function carMesh(){
  const root=(traffic.template||carFallback()).clone(true);
  root.traverse(obj=>{if(obj.isMesh){obj.castShadow=true;obj.receiveShadow=true;}});
  return root;
}
function roadNeighbors(i,j){
  return ROAD_DIRECTIONS.map(([di,dj])=>({i:i+di,j:j+dj}))
    .filter(p=>within(p.i,p.j)&&roadTile(p.i,p.j));
}
function collectRoadNetworks(){
  const seen=new Set(),networks=[];
  for(const road of allBuildings('road')){
    const first={i:road.i,j:road.j},key=tileKey(first.i,first.j);
    if(seen.has(key))continue;
    const stack=[first],network=[];seen.add(key);
    while(stack.length){
      const p=stack.pop();network.push(p);
      for(const next of roadNeighbors(p.i,p.j)){
        const k=tileKey(next.i,next.j);
        if(!seen.has(k)){seen.add(k);stack.push(next);}
      }
    }
    if(network.length>1)networks.push(network);
  }
  return networks;
}
function disposeCars(){
  for(const c of traffic.cars){
    c.mixer?.stopAllAction();
    scene.remove(c.model);
    if(!traffic.template)c.model.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});
  }
  traffic.cars.length=0;
}
function spawnCar(network,slot){
  const tile=network[Math.floor(Math.random()*network.length)];
  const neighbors=roadNeighbors(tile.i,tile.j);
  if(!neighbors.length)return;
  const model=carMesh(),lane=(slot%2===0?-.16:.16);
  const p=coords(tile.i,tile.j);
  model.position.set(p.x+lane,0,p.z+lane);
  scene.add(model);
  const c={model,i:tile.i,j:tile.j,previous:null,target:null,lane,slot:slot%4,speed:CAR_SPEED*(.83+Math.random()*.3),mixer:null};
  if(traffic.template&&traffic.clip){
    c.mixer=new THREE.AnimationMixer(model);c.mixer.clipAction(traffic.clip).play();
  }
  traffic.cars.push(c);
  pickCarDestination(c);
}
function pickCarDestination(c){
  const neighbors=roadNeighbors(c.i,c.j);
  if(!neighbors.length){c.target=null;return;}
  let candidates=neighbors.filter(p=>!c.previous||p.i!==c.previous.i||p.j!==c.previous.j);
  if(!candidates.length)candidates=neighbors;
  // Four quarter-tile slots mean no more than four vehicles start on one tile.
  const p=candidates[Math.floor(Math.random()*candidates.length)];
  c.target=p;
}
function rebuildTraffic(){
  const networks=collectRoadNetworks();
  disposeCars();
  let slot=0;
  for(const net of networks){
    let amount=Math.max(1,Math.floor(net.length/3));
    amount=Math.min(amount,CAR_LIMIT-slot,net.length*4);
    for(let n=0;n<amount;n++)spawnCar(net,slot++);
    if(slot>=CAR_LIMIT)break;
  }
}
function updateCars(dt){
  traffic.countdown-=dt;
  if(traffic.countdown<=0){
    traffic.countdown=1.4;
    const roads=allBuildings('road').map(b=>tileKey(b.i,b.j)).sort().join(';');
    if(traffic.roadStamp!==roads){traffic.roadStamp=roads;rebuildTraffic();}
  }
  for(const c of traffic.cars){
    if(c.mixer)c.mixer.update(dt);
    if(!roadTile(c.i,c.j)||!c.target||!roadTile(c.target.i,c.target.j)){
      c.target=null;continue;
    }
    const p=coords(c.target.i,c.target.j);
    // Each lane is offset from the center so two cars can pass each other.
    const dx=c.target.i-c.i,dz=c.target.j-c.j;
    const lateralX=-dz*c.lane,lateralZ=dx*c.lane;
    const tx=p.x+lateralX,tz=p.z+lateralZ;
    const deltaX=tx-c.model.position.x,deltaZ=tz-c.model.position.z;
    const dist=Math.hypot(deltaX,deltaZ);
    if(dist<.035){
      c.model.position.set(tx,0,tz);
      c.previous={i:c.i,j:c.j};c.i=c.target.i;c.j=c.target.j;
      pickCarDestination(c);continue;
    }
    const heading=Math.atan2(deltaX,deltaZ); // GLTF local +Z as car's forward
    const turn=Math.atan2(Math.sin(heading-c.model.rotation.y),Math.cos(heading-c.model.rotation.y));
    c.model.rotation.y+=turn*Math.min(1,dt*9);
    const step=Math.min(dist,c.speed*dt);
    c.model.position.x+=deltaX/dist*step;
    c.model.position.z+=deltaZ/dist*step;
  }
}
