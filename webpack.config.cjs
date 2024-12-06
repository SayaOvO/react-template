// A lot of configs here are stolen from Suka'b blog: https://blog.skk.moe/post/webpack-react-without-create-react-app
const path = require("node:path");

const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const LightningCSS = require("lightningcss");
const { LightningCssMinifyPlugin } = require("lightningcss-loader");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const ReactRefreshWebpackPlugin = require("@pmmmwh/react-refresh-webpack-plugin");
const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");
const WebpackBarPlugin = require("webpackbar");
const TerserPlugin = require("terser-webpack-plugin");

const isAnalyze = !!process.env.ANALYZE;
const isDevelopment = process.env.NODE_ENV !== "production";
const topLevelFrameworkPaths = isDevelopment ? [] : getTopLevelFrameworkPaths();

/**
 * @type {webpack.Configuration}
 **/
const config = {
  mode: isDevelopment ? "development" : "production",
  entry: "./src/index.tsx",
  output: {
    filename: isDevelopment ? "[name].js" : "[contenthash].js",
    cssFilename: isDevelopment ? "[name].css" : "[contenthash].css",
    path: path.resolve(__dirname, "dist"),
    library: "_R",
    hashFunction: "xxhash64",
    hashDigestLength: 16,
  },
  devtool: isDevelopment ? "eval-source-map" : false,
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          "css-loader",
          {
            loader: "lightningcss-loader",
            options: {
              implementation: LightningCSS,
            },
          },
        ],
      },
      {
        test: /assets\//,
        type: "asset/resource",
        generator: {
          filename: "assets/[hash][ext][query]",
        },
      },
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: {
          loader: "swc-loader",
          options: {
            jsc: {
              parser: {
                syntax: "typescript",
                tsx: true,
              },
              transform: {
                react: {
                  runtime: "automatic",
                  refresh: isDevelopment,
                  development: isDevelopment,
                },
                optimizer: {
                  simplify: true,
                  globals: {
                    typeofs: {
                      window: "object",
                    },
                    envs: {
                      NODE_ENV: isDevelopment ? "development" : "production",
                    },
                  },
                },
              },
            },
          },
        },
      },
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: isDevelopment ? "[name].css" : "[contenthash].css",
    }),
    new HtmlWebpackPlugin({
      templateContent: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>React App built with Webpack</title>
        </head>
        <body>
            <div id="app"></div>
        </body>
        </html>
        `,
    }),
    isAnalyze &&
      new BundleAnalyzerPlugin({
        analyzerMode: "static",
      }),
  ].concat(
    isDevelopment
      ? [new CleanWebpackPlugin(), new ReactRefreshWebpackPlugin()]
      : [new WebpackBarPlugin()],
  ),
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
    cache: true,
    unsafeCache: false,
    conditionNames: ["import", "require", "default"],
  },
  optimization: {
    splitChunks: {
      cacheGroups: {
        framework: {
          chunks: "all",
          name: "framework",
          test(module) {
            const resource = module.nameForCondition?.();
            return resource
              ? topLevelFrameworkPaths.some((pkgPath) =>
                  resource.startsWith(pkgPath),
                )
              : false;
          },
          priority: 40,
          enforce: false,
        },
      },
    },
    runtimeChunk: {
      name: "webpack",
    },
    minimizer: [
      new TerserPlugin({
        minify: TerserPlugin.swcMinify,
        terserOptions: {
          compress: {
            ecma: 5,
            comparisons: false,
            inline: 2,
          },
          mangle: { safari10: true },
          format: {
            ecma: 2015,
            safari10: true,
            comments: false,
            ascii_only: true,
          },
        },
      }),
      new LightningCssMinifyPlugin({
        implementation: LightningCSS,
      }),
    ],
  },
  devServer: {
    static: "./dist",
    open: true,
    port: 3000,
    historyApiFallback: true,
  },
  externals: {
    "node-fetch": "fetch",
    "isomorphic-fetch": "fetch",
    "@trust/webscrypto": "crypto",
    module: "module",
  },
  cache: {
    type: "filesystem",
    maxMemoryGenerations: isDevelopment ? 5 : Infinity,
    cacheDirectory: path.join(__dirname, "node_modules", ".cache", "webpack"),
    compression: isDevelopment ? "gzip" : false,
  },
  experiments: {
    cacheUnaffected: true,
  },
};

function getTopLevelFrameworkPaths(
  frameworkPackages = ["react", "react-dom"],
  dir = path.resolve(__dirname),
) {
  // Only top-level packages are included, e.g. nested copies like
  // 'node_modules/meow/node_modules/react' are not included.
  const topLevelFrameworkPaths = [];
  const visitedFrameworkPackages = new Set();

  // Adds package-paths of dependencies recursively
  const addPackagePath = (packageName, relativeToPath) => {
    try {
      if (visitedFrameworkPackages.has(packageName)) return;
      visitedFrameworkPackages.add(packageName);

      const packageJsonPath = require.resolve(`${packageName}/package.json`, {
        paths: [relativeToPath],
      });

      // Include a trailing slash so that a `.startsWith(packagePath)` check avoids false positives
      // when one package name starts with the full name of a different package.
      // For example:
      //   "node_modules/react-slider".startsWith("node_modules/react")  // true
      //   "node_modules/react-slider".startsWith("node_modules/react/") // false
      const directory = path.join(packageJsonPath, "../");

      // Returning from the function in case the directory has already been added and traversed
      if (topLevelFrameworkPaths.includes(directory)) return;
      topLevelFrameworkPaths.push(directory);

      const dependencies = require(packageJsonPath).dependencies || {};
      for (const name of Object.keys(dependencies)) {
        addPackagePath(name, directory);
      }
    } catch {
      // don't error on failing to resolve framework packages
    }
  };

  for (const packageName of frameworkPackages) {
    addPackagePath(packageName, dir);
  }

  return topLevelFrameworkPaths;
}

module.exports = config;
