const fsPromises = require('fs').promises;
const fs = require('fs');
const postcss = require('postcss');
const atImport = require('postcss-import');

const bundleWorkspaceTabV2css = async () => {
    const css = await fsPromises.readFile('./assets/css/workspaceTabV2.css', 'utf8');
    const result = await postcss()
        .use(atImport())
        .process(css, {
            from: './assets/css/workspaceTabV2.css'
        });
    const output = result.css;

    if (!fs.existsSync('./dist')) {
        await fsPromises.writeFile('./dist');
    }

    if (!fs.existsSync('./dist/styles')) {
        await fsPromises.writeFile('./dist/styles');
    }

    await fsPromises.writeFile('./dist/styles/workspaceTabV2.css', output);
};

bundleWorkspaceTabV2css();


// process css
