import resolve from '@rollup/plugin-node-resolve';
import babel from '@rollup/plugin-babel';
import terser from '@rollup/plugin-terser';
import path from 'path';
import postcss from 'rollup-plugin-postcss';
import commonjs from '@rollup/plugin-commonjs';

const isProd = process.env.NODE_ENV === 'production';

const config = {
  input: './identitypicker.js',
  output: {
    file: isProd
      ? path.resolve('dist/identitypicker.min.js')
      : path.resolve('YOUR_SITE_PATH/target/lutece/js/admin/plugins/identitypicker/dist/identitypicker.min.js'),
    format: 'es',
    sourcemap: !isProd
  },
  plugins: [
    resolve({ browser: true, preferBuiltins: false }),
    commonjs(),
    postcss({ inject: true, minimize: true, extract: false }),
    babel({
      babelHelpers: 'bundled',
      presets: ['@babel/preset-env'],
      exclude: 'node_modules/**/*.js'
    }),
    terser()
  ]
};

export default config;