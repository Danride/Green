// node tests/check.mjs
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const file=p=>readFileSync(join(root,p),'utf8');
const required=['index.html','css/style.css','js/main.js','js/scene.js','js/models.js','js/buildings.js','js/pathfinding.js','js/residents.js','js/ui.js','js/camera.js','js/input.js','js/save.js','js/startup.js','js/cars.js','assets/models/car.gltf','assets/models/house.gltf','assets/models/sawmill.gltf','assets/models/resident.gltf','assets/models/car.gltf','js/cars.js'];
for(const p of required)if(!existsSync(join(root,p)))throw Error('Missing '+p);
for(const p of required.filter(p=>p.endsWith('.gltf'))){const g=JSON.parse(file(p));if(!g.asset||!g.meshes||!g.scenes)throw Error('Invalid GLTF '+p);}
if(!JSON.parse(file('assets/models/sawmill.gltf')).animations?.some(x=>x.name==='Saw'))throw Error('Saw animation missing');
if(!file('js/buildings.js').includes('sawmill:[2,2]'))throw Error('2x2 footprint missing');
if(!file('js/residents.js').includes('WOOD_PER_LOG'))throw Error('Delivery reward missing');
if(!file('index.html').includes('js/main.js'))throw Error('Missing entrypoint');
if(!JSON.parse(file('assets/models/car.gltf')).animations?.length)throw Error('Car wheel animation missing');
if(!file('js/main.js').includes("'cars'"))throw Error('Car script not loaded');
if(!file('js/startup.js').includes('updateCars(dt)'))throw Error('Cars not updated');
if(!file('js/models.js').includes("mat('#202126')"))throw Error('Black asphalt missing');
console.log('OK:',required.length,'required files, GLTF animation, sawmill and economy checks');
