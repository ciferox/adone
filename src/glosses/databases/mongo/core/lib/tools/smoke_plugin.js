const fs = require("fs");

/* Note: because this plugin uses process.on('uncaughtException'), only one
 * of these can exist at any given time. This plugin and anything else that
 * uses process.on('uncaughtException') will conflict. */
exports.attachToRunner = function (runner, outputFile) {
    const smokeOutput = { results: [] };
    const runningTests = {};

    const integraPlugin = {
        beforeTest (test, callback) {
            test.startTime = Date.now();
            runningTests[test.name] = test;
            callback();
        },
        afterTest (test, callback) {
            smokeOutput.results.push({
                status: test.status,
                start: test.startTime,
                end: Date.now(),
                test_file: test.name,
                exit_code: 0,
                url: ""
            });
            delete runningTests[test.name];
            callback();
        },
        beforeExit (obj, callback) {
            fs.writeFile(outputFile, JSON.stringify(smokeOutput), function () {
                callback();
            });
        }
    };

    // In case of exception, make sure we write file
    process.on("uncaughtException", function (err) {
        // Mark all currently running tests as failed
        for (const testName in runningTests) {
            smokeOutput.results.push({
                status: "fail",
                start: runningTests[testName].startTime,
                end: Date.now(),
                test_file: testName,
                exit_code: 0,
                url: ""
            });
        }

        // write file
        fs.writeFileSync(outputFile, JSON.stringify(smokeOutput));

        // Standard NodeJS uncaught exception handler
        console.error(err.stack);
        process.exit(1);
    });

    runner.plugin(integraPlugin);
    return integraPlugin;
};
