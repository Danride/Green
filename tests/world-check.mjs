// Test procedural generation, central clearing, repeatability, and resource distribution.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const base=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const js=readFileSync(resolve(base,'js/world.js'),'utf8');
function run(seed){
 const nodes=[],n=128,center=n/2;
 const ctx={N:n,HALF:center,landGeometry:{attributes:{color:{count:(n+1)**2,setXYZ(){}}}},
  THREE:{Color:class{setRGB(r,g,b){this.r=r;this.g=g;this.b=b;return this;}},SRGBColorSpace:'srgb'},
  addBuilding:(type,i,j,rot,opts)=>{nodes.push({type,i,j,...opts});return true;},
  allowed:()=>true,markNatureDirty(){},Math};
 runInNewContext(js,ctx);
 runInNewContext(`generateNature(${seed})`,ctx);
 return nodes;
}
const a=run(2026),b=run(2026),c=run(2027);
assert.equal(JSON.stringify(a),JSON.stringify(b),'Seed must be reproducible');
assert.notEqual(JSON.stringify(a),JSON.stringify(c),'Different seed must change world');
assert.ok(a.length>200&&a.length<3000,`Expected sparse world resources, got ${a.length}`);
assert.ok(a.some(x=>x.type==='tree')&&a.some(x=>x.type==='rock'));
assert.ok(a.every(x=>x.type==='tree'||x.type==='rock'));
assert.ok(a.filter(x=>Math.hypot(x.i-64,x.j-64)<5.1).length===0,'Starting zone should be empty');
console.log(`WORLD OK: ${a.length} resource nodes, deterministic 128x128 world, clearing`);
