const log = require("npmlog");

const {
    cmake: { environment },
    std: { util },
    vendor: { lodash: _ }
} = adone;

const generateRuntimeOptions = function* () {
    const generateForNode = function* (arch) {
        // Current:
        if (environment.runtimeVersion !== "5.10.0") {
            yield {
                runtime: "node",
                runtimeVersion: "5.10.0",
                arch
            };
        }
    };

    const generateForArch = function* (arch) {
        yield* generateForNode(arch);
    };

    if (environment.isWin) {
        yield* generateForArch("x64");
        yield* generateForArch("ia32");
    } else {
        yield* generateForArch();
    }

    // Actual:
    yield {};
};

const generateOptions = function* () {
    for (const runtimeOptions of generateRuntimeOptions()) {
        if (environment.isWin) {
            // V C++:
            yield runtimeOptions;
        } else {
            // Clang, Make
            yield _.extend({}, runtimeOptions, { preferClang: true, referMake: true });

            // Clang, Ninja
            yield _.extend({}, runtimeOptions, { preferClang: true });

            // g++, Make
            yield _.extend({}, runtimeOptions, { preferGnu: true, referMake: true });

            // g++, Ninja
            yield _.extend({}, runtimeOptions, { preferGnu: true });

            // Default:
            yield runtimeOptions;
        }
    }
};

export default {
    runCase(testCase, options) {
        for (const testOptions of generateOptions()) {
            const currentOptions = _.extend({}, testOptions, options || {});
            it(`should build with: ${util.inspect(currentOptions)}`, async (done) => {
                log.info("TEST", `Running case for options of: ${util.inspect(currentOptions)}`);
                await testCase(currentOptions);
                done();
            });
        }
    }
};
