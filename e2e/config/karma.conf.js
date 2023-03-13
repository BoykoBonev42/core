const config = require('../config.js');

module.exports = (config) => {
    console.log(`Runner in Karma Config: ${process.env.RUNNER}`);

    let files;

    if (process.env.RUNNER === "Puppet") {
        files = [
            {
                pattern: 'e2e/config/gtf.js'
            },
            `e2e/tests/temp-test-collection/**/*.spec.js`
        ]
    } else if (process.env.RUNNER === "Fdc3") {
        files = [
            {
                pattern: 'packages/web-platform/dist/platform.web.umd.js'
            },
            {
                pattern: 'packages/fdc3/dist/fdc3.umd.js'
            },
            {
                pattern: 'packages/workspaces-api/dist/workspaces.umd.js'
            },
            {
                pattern: 'packages/search-api/dist/search-api.umd.js'
            },
            {
                pattern: 'e2e/config/gtf.js'
            },
            `e2e/tests/temp-test-collection/**/*.spec.js`
        ]
    } else {
        files = [
            {
                pattern: 'packages/web-platform/dist/platform.web.umd.js'
            },
            {
                pattern: 'packages/workspaces-api/dist/workspaces.umd.js'
            },
            {
                pattern: 'packages/search-api/dist/search-api.umd.js'
            },
            {
                pattern: 'e2e/config/gtf.js'
            },
            `e2e/tests/temp-test-collection/**/*.spec.js`
        ];
    }

    config.set({
        frameworks: ["mocha", "chai"],
        browsers: ["ChromeHeadless"],
        reporters: ["spec"],
        specReporter: {
            suppressFailed: false,
            suppressPassed: false,
            suppressSkipped: true
        },
        basePath: process.cwd(),
        colors: true,
        client: {
            mocha: {
                timeout: 15000
            },
            captureConsole: true
        },
        files,
        port: 9999,
        singleRun: true,
        concurrency: Infinity,
        browserNoActivityTimeout: 100000,
        browserDisconnectTimeout: 100000
    });
};
