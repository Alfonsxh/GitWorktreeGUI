const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const isDevelopment = process.env.NODE_ENV !== 'production';

module.exports = [
  {
    mode: isDevelopment ? 'development' : 'production',
    entry: './src/main/index.ts',
    target: 'electron-main',
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/
        }
      ]
    },
    resolve: {
      extensions: ['.ts', '.js']
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'main.js'
    },
    node: {
      __dirname: false,
      __filename: false
    },
    externals: {
      'node-pty': 'commonjs2 node-pty'
    }
  },
  {
    mode: isDevelopment ? 'development' : 'production',
    entry: './src/main/preload.ts',
    target: 'electron-preload',
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/
        }
      ]
    },
    resolve: {
      extensions: ['.ts', '.js']
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'preload.js'
    }
  },
  {
    mode: isDevelopment ? 'development' : 'production',
    entry: './src/renderer/index.tsx',
    target: 'electron-renderer',
    devtool: isDevelopment ? 'source-map' : false,
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader']
        }
      ]
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js']
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'renderer.js'
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './src/renderer/index.html'
      })
    ]
  }
];