# lazy-gltf-loader

一个能让 GLTF 局部懒加载的 Loader

> 注: 适用于`THREE R129`，较老 THREE 版本可能需要从对应的 GLTFLoader 重新适配

## DEMO

[DEMO 地址](https://deepkolos.github.io/lazy-gltf-loader/examples/index.html)

<img
  src="https://raw.githubusercontent.com/deepkolos/lazy-gltf-loader/master/demo.gif"
  width="350"
  alt=""
/>

## 使用

```js
import * as THREE from 'three';
import { LazyGLTFLoader } from 'lazy-gltf-loader';

const loader = new LazyGLTFLoader();

loader
  .loadAsync('./banzi+bag/banzi+bag.gltf', {
    include: ['FENDI_PAIZI', 'close-brown'],
  })
  .then(gltf => {
    console.log(gltf);

    gltf.parser
      .lazyNodes(['FENDI_PAIZI.001', 'close-red'])
      .then(([banziNode, closeNode]) => {
        console.log(banziNode, closeNode);
      });
  });

loader
  .loadAsync('./banzi2/banzi2.gltf', {
    exclude: ['FENDI_PAIZI'],
  })
  .then(gltf => {
    console.log(gltf);

    gltf.parser.lazyAnimation(name).then(animation => {
      console.log(animation);
    });
  });
```

## Blender 设置 mesh material texture 动画复用方法

> 合并 mesh

<img
  src="https://raw.githubusercontent.com/deepkolos/lazy-gltf-loader/master/docs/blender_share_mesh.jpg"
  width="300"
  alt=""
/>

> 合并 material

<img
  src="https://raw.githubusercontent.com/deepkolos/lazy-gltf-loader/master/docs/blender_share_material.jpg"
  width="300"
  alt=""
/>

> 合并 texture

<img
  src="https://raw.githubusercontent.com/deepkolos/lazy-gltf-loader/master/docs/blender_share_texture.jpg"
  width="300"
  alt=""
/>

> 动画独立化

<img
  src="https://raw.githubusercontent.com/deepkolos/lazy-gltf-loader/master/docs/blender_independent_animation.jpg"
  width="300"
  alt=""
/>

## TODO

0. 批量切换时候，全部加载完成后再挂载
1. 合并 source, sampler, extensions 相同的 texture（done

## 已知问题

0. 动画有 samplers.output 冗余，input 复用的问题

### [CHANGELOG](https://github.com/deepkolos/lazy-gltf-loader/blob/master/CHANGELOG.md)

# 赞助

如果项目对您有帮助或者有适配需求，欢迎打赏

<img src="https://upload-images.jianshu.io/upload_images/252050-d3d6bfdb1bb06ddd.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240" alt="赞赏码" width="300">
