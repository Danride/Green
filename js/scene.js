// Зелёный удел 4.0: большой мир, стандартный sRGB, насыщенные цвета.
const $=id=>document.getElementById(id);
const scene=new THREE.Scene();
scene.background=new THREE.Color('#b9e1ed');
const camera=new THREE.OrthographicCamera(-15,15,15,-15,.1,600);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.15));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.NoToneMapping;
renderer.toneMappingExposure=1;
renderer.shadowMap.enabled=false;
$('game').appendChild(renderer.domElement);
const ambient=new THREE.HemisphereLight('#ffffff','#83b36f',2.1);scene.add(ambient);
const sunlight=new THREE.DirectionalLight('#ffffff',2.0);
sunlight.position.set(-18,32,25);sunlight.castShadow=false;scene.add(sunlight);

const N=128, HALF=N/2, FELL_SECONDS=3.0, MINE_SECONDS=3.8;
const WOOD_PER_LOG=8, STONE_PER_ROCK=5, TREE_REGEN_SECONDS=70, ROCK_REGEN_SECONDS=170;
const coords=(i,j)=>({x:i-HALF+.5,z:j-HALF+.5});
const indexAt=(x,z)=>({i:Math.floor(x+HALF),j:Math.floor(z+HALF)});
const tileKey=(i,j)=>`${i},${j}`;
const within=(i,j)=>i>=0&&j>=0&&i<N&&j<N;

// One terrain mesh: terrain colors change with the procedural world seed.
const landGeometry=new THREE.PlaneGeometry(N,N,N,N);
const landColorArray=new Float32Array(landGeometry.attributes.position.count*3);
landGeometry.setAttribute('color',new THREE.BufferAttribute(landColorArray,3));
const ground=new THREE.Mesh(landGeometry,new THREE.MeshLambertMaterial({vertexColors:true}));
ground.rotation.x=-Math.PI/2;
ground.receiveShadow=false;scene.add(ground);
const base=new THREE.Mesh(new THREE.BoxGeometry(N+.4,.28,N+.4),new THREE.MeshLambertMaterial({color:'#679f59'}));
base.position.y=-.16;scene.add(base);
// No random green cones/pebbles. The land surface itself provides the grass variation.
const grid=new THREE.GridHelper(N,N,'#d8f5bc','#d8f5bc');
grid.position.y=.014;grid.material.transparent=true;grid.material.opacity=.065;
grid.material.depthWrite=false;scene.add(grid);
