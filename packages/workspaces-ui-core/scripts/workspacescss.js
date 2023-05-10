const sass = require('node-sass');
const fs = require('fs');

const compileSass = async () => {
    sass.render({
        file: './assets/scss/workspaces.scss',
        outputStyle: 'expanded',
    }, (err, result) => {
        if (err) {
            console.error(err);
        } else {
            fs.writeFileSync('./assets/css/workspaces.css', result.css, 'utf-8');
            console.log('Success');
        }
    });
};

compileSass();