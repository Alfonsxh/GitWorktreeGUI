const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');

module.exports = (_, argv = {}) => {
  const mode = argv.mode || process.env.NODE_ENV || 'development';
  const isDevelopment = mode !== 'production';

  return [
    {
      mode,
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
      mode,
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
      mode,
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
          },
          {
            test: /\.(ttf|woff|woff2|eot)$/,
            type: 'asset/resource',
            generator: {
              filename: 'fonts/[name].[contenthash][ext]'
            }
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
                ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; font-src 'self' data:;"
                : "default-src 'self' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; font-src 'self' data:;"
            }
          }
        }),
        new MonacoWebpackPlugin({
          languages: ['typescript', 'javascript', 'css', 'html', 'json', 'python', 'yaml', 'shell', 'markdown']
        })
      ]
    }
  ];
};
