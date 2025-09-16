import terser from '@rollup/plugin-terser';

const { NODE_ENV = 'production' } = process.env;

export default {
  input: 'src/index.js',
  output: [{
    file: 'dist/index.cjs',
    format: 'cjs',
  }, {
    file: 'dist/index.mjs',
    format: 'esm',
  }],
  plugins: NODE_ENV === 'production' ? [terser()] : [],
};
