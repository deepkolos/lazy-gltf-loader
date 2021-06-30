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

/**
 * include和exclude规则：
 * ```
 *        node0
 *      /    |    \
 * node1   node2  node3
 *
 * include: ['node1']: 加载node1极其子树
 * exclude: ['node1']: 加载node0子节点除了node1之外的节点极其子树
 * childOfNodes: ['node0']: node0下子节点全部懒加载
 *
 * 如果命中了include则不再命中exclude
 *
 * lazyNode取值这是命中了include或者exclude节点以及相邻节点，也就是node0所有子节点
 * ```
 */
interface LazyCfg {
  onProgress?: (event: ProgressEvent) => void;
  include?: Array<string>;
  exclude?: Array<string>;
  childOfNodes?: Array<string>;
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
  /**
   * 获取对应父节点（仅仅支持可lazyNode的节点）
   * @param name
   */
  getLazyNodeParent(name: string): Object3D;

  /**
   * 下载对应节点（包含子节点），下载完成后挂载到对应父节点\
   * 支持的范围是include或者exclude命中的节点以及相邻节点，也就是其父节点的所有子节点
   * @param name
   * @param autoMount
   */
  lazyNode(name: string, autoMount?: boolean): Promise<Object3D>;

  /**
   * 批量下载对应节点（包含子节点），均下载完成后批量挂载到对应父节点
   * @param names
   * @param autoMount
   */
  lazyNodes(
    names: Array<string>,
    autoMount?: boolean,
  ): Promise<Array<Object3D>>;

  /**
   * 加载动画（所有动画均按需加载）
   * @param name
   */
  lazyAnimation(name: string): Promise<AnimationClip>;

  /**
   * 批量加载动画
   * @param name
   */
  lazyAnimations(name: string): Promise<Array<AnimationClip>>;

  /**
   * 销毁
   */
  dispose(): void;
}
