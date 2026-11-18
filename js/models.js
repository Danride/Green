// Зелёный удел 3.1 — models.js
function mat(color){return new THREE.MeshLambertMaterial({color});}
const mats={wood:mat('#99673e'),leaf:mat('#346f45'),lightLeaf:mat('#518758'),stump:mat('#7b5437'),log:mat('#a87944'),cut:mat('#dab38c'),metal:mat('#b9c5c1')};
// Trees and stone deposits use batched instances (five draw calls for the whole 128×128 world).
const NATURE_CAP=N*N;
function natureMesh(geometry,material){
  const mesh=new THREE.InstancedMesh(geometry,material,NATURE_CAP);
  mesh.count=0;mesh.frustumCulled=false;mesh.castShadow=false;mesh.receiveShadow=false;
  scene.add(mesh);return mesh;
}
const naturalMeshes={
  trunks:natureMesh(new THREE.CylinderGeometry(.095,.15,.54,6),mats.wood),
  leaves1:natureMesh(new THREE.ConeGeometry(.44,.73,6),mats.leaf),
  leaves2:natureMesh(new THREE.ConeGeometry(.34,.59,6),mats.lightLeaf),
  stumps:natureMesh(new THREE.CylinderGeometry(.12,.15,.19,6),mats.stump),
  rocks:natureMesh(new THREE.DodecahedronGeometry(.40,0),mat('#92999f'))
};
const naturalObject=new THREE.Object3D();let natureDirty=true;
function markNatureDirty(){natureDirty=true;}
function updateNaturalInstances(){
  if(!natureDirty)return;
  natureDirty=false;
  const count={trunks:0,leaves1:0,leaves2:0,stumps:0,rocks:0};
  for(const b of buildings.values()){
    if(b.type!=='tree'&&b.type!=='rock')continue;
    const p=coords(b.i,b.j),v=b.variant??.5;
    const scale=.84+v*.33;
    const set=(name,x,y,z,sx,sy,sz)=>{
      naturalObject.position.set(x,y,z);
      naturalObject.rotation.set(0,v*6.283185307179586,0);
      naturalObject.scale.set(sx,sy,sz);naturalObject.updateMatrix();
      naturalMeshes[name].setMatrixAt(count[name]++,naturalObject.matrix);
    };
    if(b.type==='tree'){
      if(b.logs>0){
        set('trunks',p.x,.27,p.z,scale,scale,scale);
        set('leaves1',p.x,.77*scale,p.z,scale,scale,scale);
        set('leaves2',p.x,1.07*scale,p.z,scale,scale,scale);
      }else set('stumps',p.x,.09,p.z,scale,scale,scale);
    }else{
      const factor=b.ore>0?(.75+v*.28):.18;
      set('rocks',p.x,.17*factor,p.z,factor,factor*.80,factor*.96);
    }
  }
  for(const [name,mesh] of Object.entries(naturalMeshes)){
    mesh.count=count[name];mesh.instanceMatrix.needsUpdate=true;
  }
}
// One GPU draw call for ALL roads, instead of five meshes per tile.
const roadGeometry=new THREE.BoxGeometry(.97,.045,.97);
const roadMaterial=new THREE.MeshLambertMaterial({color:'#25272a'});
const roadLayer=new THREE.InstancedMesh(roadGeometry,roadMaterial,N*N);
roadLayer.count=0;roadLayer.receiveShadow=false;
// Conservative culling because instance matrices change while playing.
roadLayer.frustumCulled=false;
scene.add(roadLayer);
const roadInstance=new THREE.Object3D();
let roadsDirty=true,roadVersion=0;
function markRoadsDirty(){roadsDirty=true;roadVersion++;}
function updateRoadInstances(){
  if(!roadsDirty)return;
  roadsDirty=false;let count=0;
  for(const b of buildings.values())if(b.type==='road'){
    const p=coords(b.i,b.j);
    roadInstance.position.set(p.x,.028,p.z);
    roadInstance.rotation.set(0,0,0);roadInstance.scale.set(1,1,1);
    roadInstance.updateMatrix();roadLayer.setMatrixAt(count++,roadInstance.matrix);
  }
  roadLayer.count=count;roadLayer.instanceMatrix.needsUpdate=true;
}
function houseFallback(){
  const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.BoxGeometry(.73,.58,.70),mat('#cfad83'));
  body.position.y=.29;g.add(body);
  const roof=new THREE.Mesh(new THREE.ConeGeometry(.67,.48,4),mat('#a75543'));
  roof.position.y=.78;roof.rotation.y=Math.PI/4;g.add(roof);
  const door=new THREE.Mesh(new THREE.BoxGeometry(.18,.3,.04),mat('#5d4634'));
  door.position.set(0,.15,-.37);g.add(door);return g;
}
function quarryFallback(){
  const g=new THREE.Group();
  const base=new THREE.Mesh(new THREE.BoxGeometry(1.52,.60,1.48),mat('#9b978f'));
  base.position.y=.30;g.add(base);
  const roof=new THREE.Mesh(new THREE.BoxGeometry(1.65,.15,1.55),mat('#5d6663'));
  roof.position.y=.69;g.add(roof);
  return g;
}
function sawmillFallback(){
  const g=new THREE.Group(),body=new THREE.Mesh(new THREE.BoxGeometry(1.42,.67,1.35),mat('#b78c65'));
  body.position.y=.34;g.add(body);
  const roof=new THREE.Mesh(new THREE.BoxGeometry(1.53,.13,1.47),mat('#8a5344'));
  roof.position.y=.75;g.add(roof);
  const saw=new THREE.Mesh(new THREE.CylinderGeometry(.34,.34,.075,12),mats.metal);
  saw.rotation.x=Math.PI/2;saw.position.set(.3,.4,-.65);g.add(saw);return g;
}
function personFallback(){
  const g=new THREE.Group();const body=new THREE.Mesh(new THREE.BoxGeometry(.13,.2,.12),mat('#526970'));
  body.position.y=.12;g.add(body);
  const head=new THREE.Mesh(new THREE.BoxGeometry(.16,.16,.16),mat('#e5b28d'));
  head.position.y=.29;g.add(head);
  for(const x of [-.045,.045]){
    const eye=new THREE.Mesh(new THREE.BoxGeometry(.026,.028,.012),mat('#21241e'));
    eye.position.set(x,.30,-.087);g.add(eye);
  }return g;
}
function normalizedTemplate(gltf,scaleWidth,scaleHeight){
  const raw=gltf.scene;
  raw.updateMatrixWorld(true);
  const bb=new THREE.Box3().setFromObject(raw),size=bb.getSize(new THREE.Vector3());
  const center=bb.getCenter(new THREE.Vector3());
  raw.position.sub(new THREE.Vector3(center.x,bb.min.y,center.z));
  const group=new THREE.Group();group.add(raw);
  const widthScale=scaleWidth/Math.max(size.x,size.z,.01);
  group.scale.setScalar(scaleHeight?Math.min(widthScale,scaleHeight/Math.max(size.y,.01)):widthScale);
  raw.traverse(o=>{if(o.isMesh){
    o.material=o.material.clone();o.material.side=THREE.DoubleSide;
    if(o.material.map){o.material.map.magFilter=THREE.NearestFilter;o.material.map.minFilter=THREE.NearestMipmapNearestFilter;o.material.map.colorSpace=THREE.SRGBColorSpace;}
    o.material.needsUpdate=true;
  }});
  return group;
}
let templates={house:null,sawmill:null,person:null}, sawClip=null, personClip=null;
