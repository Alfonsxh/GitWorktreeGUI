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
    target: 'web',
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
      extensions: ['.tsx', '.ts', '.js'],
      fallback: {
        "path": false,
        "fs": false
      }
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'renderer.js',
      globalObject: 'this'
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './src/renderer/index.html',
        meta: {
          'Content-Security-Policy': {
            'http-equiv': 'Content-Security-Policy',
            content: isDevelopment
              ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
              : "default-src 'self' data: blob:; script-src 'self'; style-src 'self' 'unsafe-inline';"
          }
        }
      })
    ]
  }
];