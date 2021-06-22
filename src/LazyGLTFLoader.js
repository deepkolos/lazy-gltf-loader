import { Matrix4, Skeleton, Group } from 'three';
import {
  GLTFLoader,
  GLTFParser,
  assignExtrasToUserData,
  addUnknownExtensionsToUserData,
} from './GLTFLoader.js';

export class LazyGLTFLoader extends GLTFLoader {
  parse(data, path, onLoad, onError, cfg) {
    super.parse(data, path, onLoad, onError, LazyGLTFParser, cfg);
  }
}

export class LazyGLTFParser extends GLTFParser {
  constructor(json, options) {
    super(json, options);

    this.lazyCfg = options.parserCfg || {};
    this.lazyCfg.include = this.lazyCfg.include || [];
    this.lazyCfg.exclude = this.lazyCfg.exclude || [];
  }

  // overwrite
  parse(onLoad, onError) {
    const parser = this;
    const json = this.json;
    const extensions = this.extensions;

    // Clear the loader cache
    this.cache.removeAll();
    this.lazyLoadFns = new Map();
    this.lazyGLTFAnimations = [];

    // Mark the special nodes/meshes in json for efficient parse
    this._invokeAll(function (ext) {
      return ext._markDefs && ext._markDefs();
    });

    Promise.all(
      this._invokeAll(function (ext) {
        return ext.beforeRoot && ext.beforeRoot();
      }),
    )
      .then(function () {
        return Promise.all([
          parser.getDependencies('scene'),
          parser.getDependencies('camera'),
        ]);
      })
      .then(function (dependencies) {
        const result = {
          scene: dependencies[0][json.scene || 0],
          scenes: dependencies[0],
          cameras: dependencies[1],
          animations: parser.lazyGLTFAnimations,
          asset: json.asset,
          parser: parser,
          userData: {},
        };

        addUnknownExtensionsToUserData(extensions, result, json);

        assignExtrasToUserData(result, json);

        Promise.all(
          parser._invokeAll(function (ext) {
            return ext.afterRoot && ext.afterRoot(result);
          }),
        ).then(function () {
          onLoad(result);
        });
      })
      .catch(onError);
  }

  loadScene(sceneIndex) {
    const json = this.json;
    const extensions = this.extensions;
    const sceneDef = this.json.scenes[sceneIndex];
    const parser = this;

    // Loader returns Group, not Scene.
    // See: https://github.com/mrdoob/three.js/issues/18342#issuecomment-578981172
    const scene = new Group();
    if (sceneDef.name) scene.name = parser.createUniqueName(sceneDef.name);

    assignExtrasToUserData(scene, sceneDef);

    if (sceneDef.extensions)
      addUnknownExtensionsToUserData(extensions, scene, sceneDef);

    const pending = [];

    if (sceneDef.nodes)
      buildNodeChild(pending, sceneDef.nodes, scene, json, parser);

    return Promise.all(pending).then(function () {
      return scene;
    });
  }

  // api
  lazyNode(name) {
    const loadFn = this.lazyLoadFns.get(name);

    return loadFn ? loadFn() : Promise.reject('no exist');
  }

  lazyNodes(names) {
    return Promise.all(names.map(name => this.lazyNode(name)));
  }

  lazyAnimation(name) {
    const animations = this.json.animations;
    const loaded = this.lazyGLTFAnimations.filter(i => i.name === name);

    if (loaded.length) return Promise.resolve(loaded[0]);

    for (let i = 0, il = animations.length; i < il; i++) {
      if (name === animations[i].name) {
        return this.loadAnimation(i).then(animation => {
          this.lazyGLTFAnimations.push(animation);
          return animation;
        });
      }
    }
  }

  lazyAnimations(names) {
    return Promise.all(names.map(name => this.lazyAnimation(name)));
  }

  dispose() {
    this.lazyLoadFns.clear();
    this.lazyGLTFAnimations.length = 0;
  }
}

function buildNodeHierachy(nodeId, parentObject, json, parser) {
  const nodeDef = json.nodes[nodeId];

  return parser
    .getDependency('node', nodeId)
    .then(function (node) {
      if (nodeDef.skin === undefined) return node;

      // build skeleton here as well
      let skinEntry;

      return parser
        .getDependency('skin', nodeDef.skin)
        .then(function (skin) {
          skinEntry = skin;

          const pendingJoints = [];

          for (let i = 0, il = skinEntry.joints.length; i < il; i++) {
            pendingJoints.push(
              parser.getDependency('node', skinEntry.joints[i]),
            );
          }

          return Promise.all(pendingJoints);
        })
        .then(function (jointNodes) {
          node.traverse(function (mesh) {
            if (!mesh.isMesh) return;

            const bones = [];
            const boneInverses = [];

            for (let j = 0, jl = jointNodes.length; j < jl; j++) {
              const jointNode = jointNodes[j];

              if (jointNode) {
                bones.push(jointNode);

                const mat = new Matrix4();

                if (skinEntry.inverseBindMatrices !== undefined) {
                  mat.fromArray(skinEntry.inverseBindMatrices.array, j * 16);
                }

                boneInverses.push(mat);
              } else {
                console.warn(
                  'THREE.GLTFLoader: Joint "%s" could not be found.',
                  skinEntry.joints[j],
                );
              }
            }

            mesh.bind(new Skeleton(bones, boneInverses), mesh.matrixWorld);
          });

          return node;
        });
    })
    .then(function (node) {
      // build node hierachy
      parentObject.add(node);

      const pending = [];

      if (nodeDef.children)
        buildNodeChild(pending, nodeDef.children, node, json, parser);

      return Promise.all(pending).then(() => node);
    });
}

function buildNodeChild(pending, children, parent, json, parser) {
  const { include, exclude } = parser.lazyCfg;
  const [includeMatched, excludeMatched] = children.reduce((acc, curr) => {
    acc[0] = acc[0] || include.includes(json.nodes[curr].name);
    acc[1] = acc[1] || exclude.includes(json.nodes[curr].name);
    return acc;
  }, []);

  for (let i = 0, il = children.length; i < il; i++) {
    const childNodeId = children[i];
    const childDef = json.nodes[childNodeId];
    const included = include.includes(childDef.name);
    const excluded = exclude.includes(childDef.name);

    if (
      (!includeMatched && !excludeMatched) ||
      (includeMatched && included) ||
      (excludeMatched && !excluded)
    ) {
      const promise = buildNodeHierachy(childNodeId, parent, json, parser);
      pending.push(promise);

      if (includeMatched || excludeMatched)
        parser.lazyLoadFns.set(childDef.name, () => promise);
    } else {
      const load = () => {
        load.promise =
          load.promise || buildNodeHierachy(childNodeId, parent, json, parser);
        return load.promise;
      };
      parser.lazyLoadFns.set(childDef.name, load);
    }
  }
}
