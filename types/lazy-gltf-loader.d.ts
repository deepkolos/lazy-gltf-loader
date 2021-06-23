import type {
  GLTFParser,
  GLTFLoader,
} from 'three/examples/jsm/loaders/GLTFLoader';
import type { AnimationClip, Group, Camera, Object3D } from 'three';

export interface GLTF {
  animations: AnimationClip[];
  scene: Group;
  scenes: Group[];
  cameras: Camera[];
  asset: {
    copyright?: string;
    generator?: string;
    version?: string;
    minVersion?: string;
    extensions?: any;
    extras?: any;
  };
  parser: LazyGLTFParser;
  userData: any;
}

interface LazyCfg {
  onProgress?: (event: ProgressEvent) => void;
  include?: Array<string>;
  exclude?: Array<string>;
}

export class LazyGLTFLoader extends GLTFLoader {
  load(
    url: string,
    onLoad: (gltf: GLTF) => void,
    cfg?: LazyCfg | ((event: ProgressEvent) => void),
    onError?: (event: ErrorEvent) => void,
  ): void;
  loadAsync(
    url: string,
    cfg?: LazyCfg | ((event: ProgressEvent) => void),
  ): Promise<GLTF>;

  parse(
    data: ArrayBuffer | string,
    path: string,
    onLoad: (gltf: GLTF) => void,
    onError?: (event: ErrorEvent) => void,
    Parser?: GLTFParser,
    cfg: { include?: Array<string>; exclude?: Array<string> },
  ): void;
}

export class LazyGLTFParser extends GLTFParser {
  lazyNode(name: string): Promise<Object3D>;
  lazyNodes(names: Array<string>): Promise<Array<Object3D>>;
  lazyAnimation(name: string): Promise<AnimationClip>;
  lazyAnimations(name: string): Promise<Array<AnimationClip>>;
  dispose(): void;
}
