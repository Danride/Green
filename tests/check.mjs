// Complete static checks for Green Udel 4.0.
import {readFileSync,existsSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFileSync(join(root,p),'utf8');
const files=['index.html','css/style.css','js/main.js','js/scene.js','js/world.js','js/models.js',
  'js/buildings.js','js/pathfinding.js','js/residents.js','js/ui.js','js/camera.js','js/input.js',
  'js/save.js','js/startup.js','js/cars.js','assets/models/car.gltf','assets/models/house.gltf',
  'assets/models/sawmill.gltf','assets/models/resident.gltf'];
for(const p of files)if(!existsSync(join(root,p)))throw Error('Missing '+p);
for(const p of files.filter(p=>p.endsWith('.gltf'))){
  const gltf=JSON.parse(read(p));if(!gltf.asset||!gltf.scenes||!gltf.meshes)throw Error('Bad GLTF '+p);
}
if(!JSON.parse(read('assets/models/sawmill.gltf')).animations?.some(a=>a.name==='Saw'))throw Error('Saw animation missing');
if(!JSON.parse(read('assets/models/car.gltf')).animations?.length)throw Error('Car animation missing');
const cars=read('js/cars.js'),scene=read('js/scene.js'),models=read('js/models.js'),buildings=read('js/buildings.js');
if(!cars.includes('const CAR_SIZE=.68'))throw Error('Car size changed unexpectedly');
if(!cars.includes('Math.atan2(-dx,-dz)'))throw Error('Car faces backward');
if(!scene.includes('N=128'))throw Error('World is not 128x128');
if(scene.includes('grassGeometry')||scene.includes('scene.fog='))throw Error('Old pebbles or fog still enabled');
if(!scene.includes('THREE.NoToneMapping'))throw Error('Expected standard sRGB');
if(!models.includes('new THREE.InstancedMesh')||!models.includes('naturalMeshes'))throw Error('Nature instancing missing');
if(!models.includes('new THREE.InstancedMesh(roadGeometry'))throw Error('Unbatched roads');
if(!buildings.includes('sawmill:[2,2]')||!buildings.includes('quarry:[2,2]'))throw Error('Building footprint wrong');
if(!buildings.includes('stoneCosts'))throw Error('Stone cost missing');
if(!read('js/residents.js').includes('STONE_PER_ROCK'))throw Error('Stone harvesting missing');
if(!read('js/world.js').includes('generateNature'))throw Error('Procedural generation missing');
if(!read('js/save.js').includes("green_fief_v4"))throw Error('New save key missing');
if(!read('js/main.js').includes("'world'"))throw Error('World script not loaded');
if(!read('js/input.js').includes('intersectPlane'))throw Error('Pointer ray not optimized');
for(const id of ['stone','stoneDeliveries','quarries'])if(!read('index.html').includes('id="'+id+'"'))throw Error('Missing HUD '+id);
console.log(`OK: ${files.length} files, models, seed, stone economy, camera and instancing`);
