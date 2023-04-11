import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
    input: 'table',
    output: [{
        file: '../../External/table/table.js',
    }],
    plugins: [
        commonjs(),
        nodeResolve(),
    ],
}