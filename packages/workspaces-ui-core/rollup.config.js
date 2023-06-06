const resolve = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const typescript = require('rollup-plugin-typescript2');
const external = require('rollup-plugin-peer-deps-external');
const copy = require('rollup-plugin-copy');
const execute = require('rollup-plugin-execute');
const del = require('rollup-plugin-delete');
const packageJson = require('./package.json');

module.exports = [
    {
        input: 'src/export.ts',
        plugins: [
            del({ targets: 'dist/*' }),
            typescript(),
            commonjs(),
            resolve({
                mainFields: ['main', 'module', 'browser'],
            }),
            external(),
            copy({
                targets: [
                    { src: './assets/css/*.css', dest: 'dist/styles' },

                ]
            }),
            execute('npm run bundle:css'),
            execute('npm run bundle:scss')
        ],
        output: [
            {
                file: packageJson.module,
                format: 'esm',
                sourcemap: true
            },
            {
                file: packageJson.main,
                name: 'workspaces-ui-core',
                format: 'umd',
                sourcemap: true,
            }
        ],
    }
];