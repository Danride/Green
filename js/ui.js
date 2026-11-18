// Visible resources, construction and interactions.
function refresh(){
  const houses=allBuildings('house').length,mills=allBuildings('sawmill').length,
    quarries=allBuildings('quarry').length;
  $('wood').textContent=Math.floor(wood);$('stone').textContent=Math.floor(stone);
  $('gold').textContent=Math.floor(gold);$('houses').textContent=houses;
  $('population').textContent=workers.length;$('mills').textContent=mills;
  $('quarries').textContent=quarries;$('deliveries').textContent=deliveries;
  $('stoneDeliveries').textContent=stoneDeliveries;
  $('woodDetail').textContent=`Брёвна: +${WOOD_PER_LOG} за доставку`;
  const working=workers.filter(w=>w.state==='working').length;
  const carrying=workers.filter(w=>w.carrying).length;
  $('activity').textContent=workers.length===0?'Построй дом, чтобы появились жители':
    `Добывают: ${working} · несут ресурсы: ${carrying}`;
}
let toastTimer;
function notify(text){const node=$('toast');node.textContent=text;node.classList.add('show');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.classList.remove('show'),2400);
}
function floatingText(t,pos){
  const p=pos.clone().add(new THREE.Vector3(0,.46,0)).project(camera);
  const a=document.createElement('div');a.className='floating';a.textContent=t;
  a.style.left=((p.x+1)*.5*innerWidth)+'px';a.style.top=((-p.y+1)*.5*innerHeight)+'px';
  $('flyLayer').appendChild(a);setTimeout(()=>a.remove(),1300);
}
const previewGroup=new THREE.Group();scene.add(previewGroup);
const previewMeshes=[];
for(let n=0;n<4;n++){
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(.97,.97),
    new THREE.MeshBasicMaterial({color:'#d0f4a4',transparent:true,opacity:.52,side:THREE.DoubleSide,depthWrite:false}));
  mesh.rotation.x=-Math.PI/2;mesh.position.y=.077;previewGroup.add(mesh);previewMeshes.push(mesh);
}
previewGroup.visible=false;
function choose(t){
  tool=t;document.querySelectorAll('.tool').forEach(el=>el.classList.toggle('active',el.dataset.tool===t));
  const hints={house:'Дом: 25 дерева · 1–2 жителя',sawmill:'Лесопилка: 60 дерева · 2×2 · принимает брёвна',
    quarry:'Каменоломня: 70 дерева · 2×2 · принимает камень',
    tree:'Дерево: 6 древесины · жители рубят его и доставляют брёвна',
    road:'Асфальт: 3 дерева + 1 камень · по дорогам ездят машины',
    erase:'Снос: удаляет выбранное здание или ресурс',
    view:'Камера: СКМ/Shift+ЛКМ — перемещать, ПКМ — вращать, Home — сброс'};
  $('hint').textContent=hints[t]||'';
  showPreview(lastMouse.x,lastMouse.y);
}
document.querySelectorAll('[data-tool]').forEach(btn=>btn.addEventListener('click',()=>choose(btn.dataset.tool)));
