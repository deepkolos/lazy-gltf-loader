import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { LazyGLTFLoader } from '../dist/lazy-gltf-loader.esm.js';
import { GLTFGPUCompressedTexture } from 'gltf-gpu-compressed-texture';

const $btnLoadAnother = document.getElementById('btnLoadAnother');
const $btnSwitchColor = document.getElementById('btnSwitchColor');
const $btnLoadPart = document.getElementById('btnLoadPart');

console.log('THREE', THREE.REVISION);
console.log(
  'GLTFLoader的超集，不影响原有功能，比如注册GLTF扩展：gltf-gpu-compressed-texture',
);

const { innerWidth: w, innerHeight: h } = window;
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 100);
const scene = new THREE.Scene();
const clock = new THREE.Clock();
const gltfLoader = new LazyGLTFLoader();
const mixer = new THREE.AnimationMixer(scene);
const controls = new OrbitControls(camera, renderer.domElement);

camera.position.z = 2;
controls.enableDamping = true;
renderer.setPixelRatio(devicePixelRatio);
renderer.setSize(w, h);
renderer.outputEncoding = THREE.sRGBEncoding;
scene.add(new THREE.AmbientLight(0xffffff, 1));
scene.add(new THREE.DirectionalLight(0xffffff, 1));

gltfLoader.register(parser => {
  return new GLTFGPUCompressedTexture({
    parser,
    renderer,
    CompressedTexture: THREE.CompressedTexture,
  });
});

// include test case
gltfLoader
  .loadAsync('./gltf-tc/banzi2/banzi2.gltf', { include: ['FENDI_PAIZI'] })
  .then(gltf => {
    console.log(gltf);
    gltf.scene.position.x = -0.11 - 0.35;

    scene.add(gltf.scene);
    playAnimation(gltf, 'an1_FENDI_PAIZI.000');

    $btnLoadAnother.disabled = false;
    once($btnLoadAnother, 'click', async () => {
      const mesh = await gltf.parser.lazyNode('FENDI_PAIZI.001');
      mesh.position.y = 0.22;
      playAnimation(gltf, 'an1_FENDI_PAIZI.001');
    });
  });

// exclude test case
gltfLoader
  .loadAsync('./gltf-tc/banzi2/banzi2.gltf', { exclude: ['FENDI_PAIZI'] })
  .then(gltf => {
    console.log(gltf);
    gltf.scene.position.x = 0.11 - 0.35;

    scene.add(gltf.scene);
    playAnimation(gltf, 'an1_FENDI_PAIZI.001');

    $btnLoadAnother.disabled = false;
    once($btnLoadAnother, 'click', async () => {
      const mesh = await gltf.parser.lazyNode('FENDI_PAIZI');
      mesh.position.x = 0.22;
      playAnimation(gltf, 'an1_FENDI_PAIZI.000');
    });
  });

gltfLoader
  .loadAsync('./banzi+bag/banzi+bag.gltf', {
    include: ['FENDI_PAIZI', 'close-brown'],
  })
  .then(gltf => {
    console.log(gltf);
    scene.add(gltf.scene);
    gltf.scene.position.x = 0.1;

    let flag = false;
    $btnSwitchColor.disabled = false;
    on($btnSwitchColor, 'click', async () => {
      const [[banziGreenNode, closeRedNode], [banziBlueNode, closeBrownNode]] =
        await Promise.all([
          gltf.parser.lazyNodes(['FENDI_PAIZI.001', 'close-red']),
          gltf.parser.lazyNodes(['FENDI_PAIZI', 'close-brown']), // 初始化已加载的节点会被resolve
        ]);

      banziBlueNode.visible = flag;
      banziGreenNode.visible = !flag;
      closeBrownNode.visible = flag;
      closeRedNode.visible = !flag;
      flag = !flag;
    });
  });

// childOfNodes
gltfLoader
  .loadAsync('./banzi+bag/banzi+bag.gltf', {
    childOfNodes: ['Group', 'Group.001'],
  })
  .then(gltf => {
    console.log(gltf);
    scene.add(gltf.scene);
    gltf.scene.position.y = 0.3;

    $btnLoadPart.disabled = false;
    once($btnLoadPart, 'click', async () => {
      const mesh = await gltf.parser.lazyNode('FENDI_PAIZI');
      mesh.position.x = 0.22;

      $btnLoadPart.innerText = '加载另一部分';

      once($btnLoadPart, 'click', async () => {
        $btnLoadPart.disabled = true;
        const mesh = await gltf.parser.lazyNode('close-brown');
        mesh.position.x = 0.22;
      });
    });
  });

const render = () => {
  mixer?.update(clock.getDelta());
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(render);
};

document.body.append(renderer.domElement);
render();

window.onresize = () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
};

// utils
function playAnimation(gltf, name) {
  gltf.parser.lazyAnimation(name).then(animation => {
    mixer.clipAction(animation, gltf.scene).play();
  });
}

function once(el, evt, cb) {
  const _cb = e => {
    cb(e);
    el.removeEventListener(evt, _cb);
  };
  el.addEventListener(evt, _cb);
}

function on(el, evt, cb) {
  el.addEventListener(evt, cb);
}
