// Stable orthographic orbit camera. Middle mouse pans without browser autoscroll.
const cam={target:new THREE.Vector3(0,0,0),yaw:.73,pitch:.86,zoom:1.13,distance:38};
function applyCamera(){
  const cp=Math.cos(cam.pitch);
  camera.position.set(cam.target.x+Math.sin(cam.yaw)*cp*cam.distance,
    cam.target.y+Math.sin(cam.pitch)*cam.distance,
    cam.target.z+Math.cos(cam.yaw)*cp*cam.distance);
  camera.lookAt(cam.target);camera.zoom=cam.zoom;camera.updateProjectionMatrix();
}
function clampCamera(){
  cam.pitch=THREE.MathUtils.clamp(cam.pitch,.45,1.37);
  cam.zoom=THREE.MathUtils.clamp(cam.zoom,.45,4.1);
  const bound=HALF-8;
  cam.target.x=THREE.MathUtils.clamp(cam.target.x,-bound,bound);
  cam.target.z=THREE.MathUtils.clamp(cam.target.z,-bound,bound);
  if(!Number.isFinite(cam.target.x)||!Number.isFinite(cam.target.z))cam.target.set(0,0,0);
}
function pan(dx,dy){
  const rect=renderer.domElement.getBoundingClientRect();
  if(!rect.width||!rect.height||!Number.isFinite(dx)||!Number.isFinite(dy))return;
  const unitX=(camera.right-camera.left)/Math.max(cam.zoom,.001)/rect.width;
  const unitY=(camera.top-camera.bottom)/Math.max(cam.zoom,.001)/rect.height;
  // Screen-right vector and ground projection of the camera's screen-up vector.
  const sideX=Math.cos(cam.yaw),sideZ=-Math.sin(cam.yaw);
  const upX=-Math.sin(cam.yaw),upZ=-Math.cos(cam.yaw);
  const x=THREE.MathUtils.clamp(dx,-90,90),y=THREE.MathUtils.clamp(dy,-90,90);
  cam.target.x-=sideX*x*unitX+upX*y*unitY/Math.sin(cam.pitch);
  cam.target.z-=sideZ*x*unitX+upZ*y*unitY/Math.sin(cam.pitch);
  clampCamera();applyCamera();
}
function orbit(dx,dy){
  if(!Number.isFinite(dx)||!Number.isFinite(dy))return;
  cam.yaw+=THREE.MathUtils.clamp(dx,-90,90)*.007;
  cam.pitch+=THREE.MathUtils.clamp(dy,-90,90)*.005;
  clampCamera();applyCamera();
}
function zoomBy(factor){if(!Number.isFinite(factor)||factor<=0)return;
  cam.zoom*=factor;clampCamera();applyCamera();}
function homeCamera(){cam.target.set(0,0,0);cam.yaw=.73;cam.pitch=.86;cam.zoom=1.13;applyCamera();}
function fit(){const w=Math.max(1,innerWidth),h=Math.max(1,innerHeight),aspect=w/h,v=13.5;
  camera.left=-v*aspect;camera.right=v*aspect;camera.top=v;camera.bottom=-v;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.1,1700/w,1050/h));
  renderer.setSize(w,h);applyCamera();}
window.addEventListener('resize',fit);fit();
$('camLeft').onclick=()=>orbit(-64,0);
$('camRight').onclick=()=>orbit(64,0);
$('camUp').onclick=()=>orbit(0,60);
$('camDown').onclick=()=>orbit(0,-60);
$('camPlus').onclick=()=>zoomBy(1.2);
$('camMinus').onclick=()=>zoomBy(1/1.2);
$('camReset').onclick=homeCamera;
