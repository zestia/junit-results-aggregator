import commonjs from '@rollup/plugin-commonjs';
import copy from 'rollup-plugin-copy';
import nodeResolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';

export default {
  input: 'src/index.ts',
  output: {
    esModule: true,
    file: 'dist/index.js',
    format: 'es',
    sourcemap: true,
  },
  plugins: [
    copy({
      targets: [{ src: 'src/templates', dest: 'dist' }],
    }),
    typescript(),
    nodeResolve({ preferBuiltins: true }),
    commonjs(),
    // needed as some dependencies load JSON
    json(),
  ],
};
