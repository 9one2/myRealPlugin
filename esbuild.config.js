const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['code.ts'],
  bundle: true,
  outfile: 'dist/code.js',
  plugins: [
    {
      name: 'html',
      setup(build) {
        build.onLoad({ filter: /\.html$/ }, async (args) => {
          const fs = require('fs');
          const contents = await fs.promises.readFile(args.path, 'utf8');
          return {
            contents: `export const html = ${JSON.stringify(contents)};`,
            loader: 'js',
          };
        });
      },
    },
  ],
}).catch(() => process.exit(1));