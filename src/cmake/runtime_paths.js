const {
    assert,
    semver,
    lodash: _
} = adone;

const NODE_MIRROR = process.env.NVM_NODEJS_ORG_MIRROR || "https://nodejs.org/dist";
const IOJS_MIRROR = process.env.NVM_IOJS_ORG_MIRROR || "https://iojs.org/dist";
const ELECTRON_MIRROR = process.env.ELECTRON_MIRROR || "https://atom.io/download/atom-shell";

const runtimePaths = {
    node(targetOptions) {
        if (semver.lt(targetOptions.runtimeVersion, "4.0.0")) {
            return {
                externalPath: `${NODE_MIRROR}/v${targetOptions.runtimeVersion}/`,
                winLibs: [{
                    dir: targetOptions.isX64 ? "x64" : "",
                    name: `${targetOptions.runtime}.lib`
                }],
                tarPath: `${targetOptions.runtime}-v${targetOptions.runtimeVersion}.tar.gz`,
                headerOnly: false
            };
        }

        return {
            externalPath: `${NODE_MIRROR}/v${targetOptions.runtimeVersion}/`,
            winLibs: [{
                dir: targetOptions.isX64 ? "win-x64" : "win-x86",
                name: `${targetOptions.runtime}.lib`
            }],
            tarPath: `${targetOptions.runtime}-v${targetOptions.runtimeVersion}-headers.tar.gz`,
            headerOnly: true
        };

    },
    iojs(targetOptions) {
        return {
            externalPath: `${IOJS_MIRROR}/v${targetOptions.runtimeVersion}/`,
            winLibs: [{
                dir: targetOptions.isX64 ? "win-x64" : "win-x86",
                name: `${targetOptions.runtime}.lib`
            }],
            tarPath: `${targetOptions.runtime}-v${targetOptions.runtimeVersion}.tar.gz`,
            headerOnly: false
        };
    },
    nw(targetOptions) {
        if (semver.gte(targetOptions.runtimeVersion, "0.13.0")) {
            return {
                externalPath: `https://node-webkit.s3.amazonaws.com/v${targetOptions.runtimeVersion}/`,
                winLibs: [
                    {
                        dir: targetOptions.isX64 ? "x64" : "",
                        name: `${targetOptions.runtime}.lib`
                    },
                    {
                        dir: targetOptions.isX64 ? "x64" : "",
                        name: "node.lib"
                    }
                ],
                tarPath: `nw-headers-v${targetOptions.runtimeVersion}.tar.gz`,
                headerOnly: false
            };
        }
        return {
            externalPath: `http://node-webkit.s3.amazonaws.com/v${targetOptions.runtimeVersion}/`,
            winLibs: [{
                dir: targetOptions.isX64 ? "x64" : "",
                name: `${targetOptions.runtime}.lib`
            }],
            tarPath: `nw-headers-v${targetOptions.runtimeVersion}.tar.gz`,
            headerOnly: false
        };
    },
    electron(targetOptions) {
        return {
            externalPath: `${ELECTRON_MIRROR}/v${targetOptions.runtimeVersion}/`,
            winLibs: [{
                dir: targetOptions.isX64 ? "x64" : "",
                name: "node.lib"
            }],
            tarPath: `${"node" + "-v"}${targetOptions.runtimeVersion}.tar.gz`,
            headerOnly: semver.gte(targetOptions.runtimeVersion, "4.0.0-alpha")
        };
    },
    get(targetOptions) {
        assert(_.isObject(targetOptions));

        const runtime = targetOptions.runtime;
        const func = runtimePaths[runtime];
        let paths;
        if (_.isFunction(func) && _.isPlainObject(paths = func(targetOptions))) {
            return paths;
        }
        throw new Error(`Unknown runtime: ${runtime}`);
    }
};

export default runtimePaths;
