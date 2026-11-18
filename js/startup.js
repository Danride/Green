// Зелёный удел — v3.2 optimized startup
$('save').onclick=()=>{store();notify('Поселение сохранено');};
$('reset').onclick=()=>{if(confirm('Начать новое поселение? Сохранение будет перезаписано.')){startWorld();homeCamera();notify('Создано новое поселение');}};
$('helpBtn').onclick=()=>$('help').classList.add('visible');
$('closeHelp').onclick=()=>$('help').classList.remove('visible');
$('help').onclick=e=>{if(e.target===$('help'))$('help').classList.remove('visible');};

function loadModel(path,callback){
  new GLTFLoader().load(path,callback,undefined,error=>{
    console.warn('Unable to load model',path,error);
    notify('Не удалось загрузить модель: '+path);
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
  if(!sawClip)notify('У лесопилки нет анимации Saw; модель всё равно загружена');
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
window.__gameReady=true;
refresh();
let previous=performance.now(),uiTimer=0,saveTimer=0,goldTimer=0;
let pausedByError=false;
const frameInterval=window.matchMedia('(pointer:coarse)').matches?1000/30:1000/60;
let lastFrame=0;
function frame(t){
  requestAnimationFrame(frame);
  if(document.hidden){previous=t;lastFrame=t;return;}
  if(t-lastFrame<frameInterval-.5)return;
  lastFrame=t;
  const dt=Math.min(.065,Math.max(0,(t-previous)/1000));previous=t;
  if(pausedByError)return;
  try{
    updateRoadInstances();
    updateWorkers(dt);updateTrees(dt);updateCars(dt);
    for(const b of buildings.values())if(b.mixer)b.mixer.update(dt);
    goldTimer+=dt;
    if(goldTimer>.25){gold+=goldTimer*allBuildings('house').length;goldTimer=0;}
    uiTimer+=dt;saveTimer+=dt;
    if(uiTimer>.35){refresh();uiTimer=0;}
    if(saveTimer>12){store();saveTimer=0;}
    renderer.render(scene,camera);
  }catch(error){
    pausedByError=true;console.error('Game loop crashed:',error);
    const banner=$('err');
    banner.textContent='Игра остановлена из-за ошибки: '+error.message+'. Перезагрузи страницу; сохранение не удалено.';
    banner.style.display='block';
  }
}
renderer.domElement.addEventListener('webglcontextlost',e=>{
  e.preventDefault();
  const banner=$('err');banner.textContent='Потерян WebGL-контекст видеокарты. Проверь другие вкладки и перезагрузи игру.';
  banner.style.display='block';
});
requestAnimationFrame(frame);
