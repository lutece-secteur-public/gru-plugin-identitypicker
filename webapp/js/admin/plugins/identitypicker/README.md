# Identity Picker Plugin

This project is a JavaScript plugin for identity picking and management.

## Available Commands

Here are the commands available for this project:

### Build

To build the project for production:

```
npm run build
```

This command uses Rollup to bundle the JavaScript files and outputs a minified version in the `dist` folder.

### Development

To run the project in development mode with hot reloading:

```
npm run dev
```

This starts Rollup in watch mode, automatically rebuilding the project when files change.

**Important**: Before running the development command, you need to configure the Rollup config file. In the `rollup.config.js` file, locate the `output` section and set the `file` path to:

```javascript
file: process.env.NODE_ENV === 'production'
  ? path.resolve('dist/identitypicker.min.js')
  : path.resolve('YOUR_SITE_TARGET/target/lutece/js/admin/plugins/identitypicker/dist/identitypicker.min.js'),
```

Make sure to replace `YOUR_SITE_TARGET` with the actual path to your site's target directory.