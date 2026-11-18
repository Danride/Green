// Node-only smoke tests for car traffic and road topology (no browser or GPU required)
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const source=readFileSync(resolve(root,'js/cars.js'),'utf8');
class Vec3{constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}clone(){return new Vec3(this.x,this.y,this.z);}copy(v){return this.set(v.x,v.y,v.z);}}
class Group{constructor(){this.children=[];this.position=new Vec3();this.rotation={y:0};}add(x){this.children.push(x);}clone(){const a=new Group();for(const child of this.children)a.add(child);return a;}traverse(fn){fn(this);for(const c of this.children)fn(c);}}
class Mesh{constructor(){this.isMesh=true;this.position=new Vec3();this.rotation={y:0};}traverse(fn){fn(this);}}
const map=new Map(),key=(i,j)=>i+','+j;
for(let i=0;i<8;i++)map.set(key(i,0),{i,j:0,type:'road'});
const ctx={THREE:{MeshLambertMaterial:class{},BoxGeometry:class{},Group,Mesh},scene:{add(){},remove(){}},within:(i,j)=>i>=0&&j>=0&&i<16&&j<16,getAt:(i,j)=>map.get(key(i,j)),tileKey:key,coords:(i,j)=>({x:i+.5,z:j+.5}),buildings:map,roadVersion:1,Math,console};
runInNewContext(source,ctx);
const test=s=>runInNewContext(s,ctx);
assert.equal(test('CAR_SIZE'),.68);
assert.equal(test('CAR_LIMIT'),12);
assert.equal(test('roadNetworks().length'),1);
test('syncTraffic()');
assert.equal(test('traffic.cars.length'),2);
const first=test('traffic.cars[0]');
for(let n=0;n<120;n++)test('updateCars(1/60)');
assert.equal(test('traffic.cars[0]'),first);
map.delete(key(7,0));ctx.roadVersion=2;test('updateCars(.016)');
assert.ok(test('traffic.cars.length')<=2);
map.clear();ctx.roadVersion=3;test('updateCars(.016)');
assert.equal(test('traffic.cars.length'),0);
console.log('Traffic tests passed');
