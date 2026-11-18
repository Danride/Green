// Initialise model loading, saves, procedural world and the optimized game loop.
$('save').onclick=()=>{store();notify('Поселение сохранено');};
$('reset').onclick=()=>{if(confirm('Сгенерировать новый мир? Постройки и ресурсы текущего мира будут сброшены.')){
  startWorld();homeCamera();notify('Сгенерирован новый мир');
}};
$('helpBtn').onclick=()=>$('help').classList.add('visible');
$('closeHelp').onclick=()=>$('help').classList.remove('visible');
$('help').onclick=e=>{if(e.target===$('help'))$('help').classList.remove('visible');};
function loadModel(path,callback){
  new GLTFLoader().load(path,callback,undefined,error=>{
    console.warn('Не удалось загрузить GLTF',path,error);
    notify('Ошибка модели: '+path);
  });
}
loadModel('./assets/models/house.gltf',gltf=>{
  templates.house=normalizedTemplate(gltf,.94);
  for(const b of buildings.values())if(b.type==='house')rebuildModel(b);
});
loadModel('./assets/models/sawmill.gltf',gltf=>{
  templates.sawmill=normalizedTemplate(gltf,1.77);
  sawClip=gltf.animations.find(a=>a.name==='Saw')||gltf.animations[0]||null;
  for(const b of buildings.values())if(b.type==='sawmill')rebuildModel(b);
});
loadModel('./assets/models/resident.gltf',gltf=>{
  templates.person=normalizedTemplate(gltf,.26,.34);
  personClip=gltf.animations[0]||null;
  replaceWorkerModels();
});
loadModel('./assets/models/car.gltf',gltf=>{
  traffic.template=normalizedTemplate(gltf,CAR_SIZE,.50);
  traffic.clip=gltf.animations[0]||null;
  refreshCarModels();
});
if(!restore())startWorld();
window.__gameReady=true;refresh();
let previous=performance.now(),lastFrame=0,uiTimer=0,saveTimer=0,goldTimer=0;
let pausedByError=false;
const frameInterval=window.matchMedia('(pointer:coarse)').matches?1000/30:1000/60;
function frame(t){
  requestAnimationFrame(frame);
  if(document.hidden){previous=t;lastFrame=t;return;}
  if(t-lastFrame<frameInterval-.5)return;
  lastFrame=t;const dt=Math.min(.07,Math.max(0,(t-previous)/1000));previous=t;
  if(pausedByError)return;
  try{
    updateRoadInstances();updateNaturalInstances();
    updateWorkers(dt);updateResources(dt);updateCars(dt);
    for(const b of buildings.values())if(b.mixer)b.mixer.update(dt);
    goldTimer+=dt;
    if(goldTimer>.3){gold+=goldTimer*allBuildings('house').length;goldTimer=0;}
    uiTimer+=dt;saveTimer+=dt;
    if(uiTimer>.4){refresh();uiTimer=0;}
    if(saveTimer>15){store();saveTimer=0;}
    renderer.render(scene,camera);
  }catch(error){
    pausedByError=true;console.error('Ошибка игрового цикла:',error);
    const banner=$('err');banner.textContent='Ошибка игры: '+error.message+'. Сохранение не удалено.';
    banner.style.display='block';
  }
}
renderer.domElement.addEventListener('webglcontextlost',e=>{
  e.preventDefault();const banner=$('err');
  banner.textContent='Потерян WebGL-контекст. Закрой другие тяжёлые вкладки и обнови страницу.';
  banner.style.display='block';
});
requestAnimationFrame(frame);
