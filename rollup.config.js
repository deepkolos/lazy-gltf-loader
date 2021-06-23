import json from '@rollup/plugin-json';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import pkg from './package.json';

const plugins = [json(), resolve(), commonjs({ ignoreDynamicRequires: true })];

export default [
  {
    input: 'src/LazyGLTFLoader.js',
    output: [
      {
        name: 'LazyGLTFLoader',
        file: pkg.browser,
        format: 'umd',
        globals: { three: 'THREE' },
      },
      { file: pkg.main, format: 'cjs', exports: 'auto' },
      { file: pkg.module, format: 'es' },
    ],
    plugins,
    external: ['three'],
  },
  {
    input: 'examples/main.js',
    output: { file: 'examples/main.min.js', format: 'iife' },
    plugins: [
      ...plugins,
      terser({ output: { comments: false } })
    ],
  },
];
