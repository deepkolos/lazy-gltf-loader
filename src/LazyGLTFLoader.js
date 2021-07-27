import { Matrix4, Skeleton, Group } from 'three';
import {
  GLTFLoader,
  GLTFParser,
  assignExtrasToUserData,
  addUnknownExtensionsToUserData,
} from './GLTFLoader.js';

export class LazyGLTFLoader extends GLTFLoader {
  parse(data, path, onLoad, onError, Parser, cfg) {
    super.parse(data, path, onLoad, onError, LazyGLTFParser, cfg);
  }
}

export class LazyGLTFParser extends GLTFParser {
  constructor(json, options) {
    super(json, options);

    this.lazyCfg = options.parserCfg || {};
    this.lazyCfg.include = this.lazyCfg.include || [];
    this.lazyCfg.exclude = this.lazyCfg.exclude || [];
    this.lazyCfg.childOfNodes = this.lazyCfg.childOfNodes || [];
  }

  splitAnimationByParent(parentNodeName) {
    // helper
    const gltf = this.json;
    const self = this;
    this.cacheisChildOfCache = this.cacheisChildOfCache || {};
    const { cacheisChildOfCache } = this;

    function traverse(startNodeIndex, cb) {
      const nodeDef = gltf.nodes[startNodeIndex];
      const breakTraverse = cb(nodeDef, startNodeIndex);

      if (nodeDef.children && !breakTraverse) {
        for (let i = 0; i < nodeDef.children.length; i++) {
          const breakTraverse = traverse(nodeDef.children[i], cb);
          if (breakTraverse) return true;
        }
      }
      return breakTraverse;
    }

    function isChildOf(childNodeIndex, parentNodeName) {
      const cacheKey = parentNodeName + childNodeIndex;
      if (cacheisChildOfCache[cacheKey] !== undefined)
        return cacheisChildOfCache[cacheKey];

      const parentIndex = self.getIndexOf(parentNodeName);

      let isChild = false;
      traverse(parentIndex, (node, nodeIndex) => {
        if (nodeIndex === childNodeIndex) {
          cacheisChildOfCache[cacheKey] = true;
          isChild = true;
          return true;
        }
      });

      return isChild;
    }

    // main
    const newAnimations = [];
    gltf.animations &&
      gltf.animations.forEach(animation => {
        const matchIndexes = animation.channels
          .map((channel, index) => {
            if (isChildOf(channel.target.node, parentNodeName)) return index;
          })
          .filter(i => i !== undefined);

        const newChannels = matchIndexes.map(i => animation.channels[i]);
        // const newSamplers = matchIndexes.map(i => animation.samplers[i]);
        const newName = animation.name + '-' + parentNodeName;
        newAnimations.push({
          name: newName,
          samplers: animation.samplers,
          channels: newChannels,
        });
      });
    return newAnimations;
  }

  generateLazyAnimation() {
    const gltf = this.json;
    const lazyNodeNames = [];

    [...this.lazyCfg.include, ...this.lazyCfg.exclude].forEach(nodeName => {
      const nodeIndex = this.getIndexOf(nodeName);
      gltf.nodes.forEach(nodeDef => {
        if (nodeDef.children && nodeDef.children.includes(nodeIndex)) {
          lazyNodeNames.push(nodeDef.name);
          nodeDef.children.forEach(nodeIndex => {
            const nodeDef = gltf.nodes[nodeIndex];
            lazyNodeNames.push(nodeDef.name);
          });
        }
      });
    });

    this.lazyCfg.childOfNodes.forEach(parentNodeName => {
      // 找节点
      const nodeIndex = this.getIndexOf(parentNodeName);
      if (nodeIndex !== undefined) {
        const nodeDef = gltf.nodes[nodeIndex];
        if (nodeDef.children) {
          nodeDef.children.forEach(nodeIndex => {
            const nodeDef = gltf.nodes[nodeIndex];
            lazyNodeNames.push(nodeDef.name);
          });
        }
      }

      // 找场景
      const sceneIndex = this.getIndexOf(parentNodeName, 'scenes');
      if (sceneIndex !== undefined) {
        const sceneDef = gltf.scenes[sceneIndex];
        if (sceneDef.nodes) {
          sceneDef.nodes.forEach(nodeIndex => {
            const nodeDef = gltf.nodes[nodeIndex];
            lazyNodeNames.push(nodeDef.name);
          });
        }
      }
    });

    const newAnimations = [];
    lazyNodeNames.forEach(parentNodeName => {
      newAnimations.push(...this.splitAnimationByParent(parentNodeName));
    });
    gltf.animations && gltf.animations.push(...newAnimations);
  }

  getIndexOf(nodeName, type = 'nodes') {
    this.cacheNodeIndex = this.cacheNodeIndex || {};
    const cacheNodeIndex = this.cacheNodeIndex;

    if (cacheNodeIndex[nodeName] !== undefined) return cacheNodeIndex[nodeName];

    for (let i = 0; i < this.json[type].length; i++) {
      if (nodeName == this.json[type][i].name) {
        cacheNodeIndex[nodeName] === i;
        return i;
      }
    }
  }

  generateSceneName() {
    for (let i = 0; i < this.json.scenes.length; i++) {
      const sceneDef = this.json.scenes[i];
      sceneDef.name = sceneDef.name || 'Scene_' + i;
    }
  }

  // overwrite
  parse(onLoad, onError) {
    const { include, exclude, childOfNodes } = this.lazyCfg;
    if (!include.length && !exclude.length && !childOfNodes.length)
      return super.parse(onLoad, onError);

    const parser = this;
    const json = this.json;
    const extensions = this.extensions;

    // Clear the loader cache
    this.cache.removeAll();
    this.lazyLoadFns = new Map();
    this.lazyGLTFAnimations = [];

    this.generateSceneName();
    this.generateLazyAnimation();

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
      buildNodeChild(pending, sceneDef.nodes, scene, json, parser, sceneDef);

    return Promise.all(pending).then(function () {
      return scene;
    });
  }

  // api
  getLazyNodeParent(name) {
    const action = this.lazyLoadFns.get(name);
    return action ? action.parent : null;
  }

  lazyNode(name, autoMount = true) {
    const action = this.lazyLoadFns.get(name);
    return action
      ? action.load().then(node => {
          autoMount && action.parent.add(node);
          return node;
        })
      : Promise.reject('no exist');
  }

  lazyNodes(names, autoMount = true) {
    return Promise.all(names.map(name => this.lazyNode(name, false))).then(
      nodes => {
        autoMount &&
          nodes.forEach((node, i) => {
            const action = this.lazyLoadFns.get(names[i]);
            action.parent.add(node);
          });
        return nodes;
      },
    );
  }

  lazyAnimation(name) {
    /** @type {Array<any>} */
    const animations = this.json.animations;
    const loaded = this.lazyGLTFAnimations.find(i => i.name === name);

    if (loaded) return Promise.resolve(loaded);

    const index = animations.findIndex(i => i.name === name);

    if (index > -1)
      return this.loadAnimation(index).then(animation => {
        this.lazyGLTFAnimations.push(animation);
        return animation;
      });

    return Promise.reject('animation none found');
  }

  lazyAnimations(names) {
    return Promise.all(names.map(name => this.lazyAnimation(name)));
  }

  dispose() {
    this.lazyLoadFns.clear();
    this.lazyGLTFAnimations.length = 0;
    this.cacheNodeIndex = null;
    this.cacheisChildOfCache = null;
  }
}

function buildNodeHierachy(nodeId, parentObject, json, parser, lazy) {
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
      !lazy && parentObject.add(node);

      const pending = [];

      if (nodeDef.children)
        buildNodeChild(pending, nodeDef.children, node, json, parser, nodeDef);

      return Promise.all(pending).then(() => node);
    });
}

function buildNodeChild(pending, children, parent, json, parser, parentDef) {
  const { include, exclude, childOfNodes } = parser.lazyCfg;
  const [includeMatched, excludeMatched] = children.reduce((acc, curr) => {
    acc[0] = acc[0] || include.includes(json.nodes[curr].name);
    acc[1] = acc[1] || exclude.includes(json.nodes[curr].name);
    return acc;
  }, []);

  const oneOfChildOfNodes = childOfNodes.includes(parentDef.name);

  for (let i = 0, il = children.length; i < il; i++) {
    const childNodeId = children[i];
    const childDef = json.nodes[childNodeId];
    const included = include.includes(childDef.name);
    const excluded = exclude.includes(childDef.name);

    if (
      !oneOfChildOfNodes &&
      ((!includeMatched && !excludeMatched) ||
        (includeMatched && included) ||
        (excludeMatched && !excluded))
    ) {
      const promise = buildNodeHierachy(childNodeId, parent, json, parser);
      pending.push(promise);

      if (includeMatched || excludeMatched)
        parser.lazyLoadFns.set(childDef.name, { parent, load: () => promise });
    } else {
      const action = {
        parent,
        load() {
          action.promise =
            action.promise ||
            buildNodeHierachy(childNodeId, parent, json, parser, true);
          return action.promise;
        },
      };
      parser.lazyLoadFns.set(childDef.name, action);
    }
  }
}
