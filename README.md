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

```sh
> pnpm/npm i -S lazy-gltf-loader
```

详细接口说明请参考`types/lazy-gltf-loader.d.ts`

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

> blender 有关联复制: ALT+D

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

> 批量把 material 关联到节点

安装 [MaterialUtilities](https://github.com/ChrisHinde/MaterialUtilities/) 最新版（直接下载.zip），通过`Shift+Q`打开面板（如果左边 Shift 不好使，试试右边的）

<img
  src="https://raw.githubusercontent.com/deepkolos/lazy-gltf-loader/master/docs/blender_link_material_to_node.jpg"
  width="300"
  alt=""
/>

> 材质独立化

<img
  src="https://raw.githubusercontent.com/deepkolos/lazy-gltf-loader/master/docs/blender_unshare_texture.jpg"
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

0. 批量切换时候，全部加载完成后再挂载（done 新增 autoMount 选项，而 lazyNodes 的行为是加载完成再批量 mount，需要手动挂载，则需要通过 getLazyNodeParent 获取对应父节点
1. blender 的合并 texture 不完全，导出的 gltf 会多个相同 source(见 examples/banzi2/banzi2.gltf), sampler 的 texture，目前通过修改 texture cacheKey 实现合并
2. 增加按照节点拆分动画，可避免动画独立化导致冗余问题 done

## 已知问题

0. 动画有 samplers.output 冗余，input 复用的问题（已通过按照节点拆分动画解决

### [CHANGELOG](https://github.com/deepkolos/lazy-gltf-loader/blob/master/CHANGELOG.md)

# 赞助

如果项目对您有帮助或者有适配需求，欢迎打赏

<img src="https://upload-images.jianshu.io/upload_images/252050-d3d6bfdb1bb06ddd.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240" alt="赞赏码" width="300">
