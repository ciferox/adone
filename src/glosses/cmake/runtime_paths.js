const _ = require("lodash");
const assert = require("assert");

const {
    semver
} = adone;

const runtimePaths = {
    node(targetOptions) {
        if (semver.lt(targetOptions.runtimeVersion, "4.0.0")) {
            return {
                externalPath: `http://nodejs.org/dist/v${targetOptions.runtimeVersion}/`,
                winLibs: [{
                    dir: targetOptions.isX64 ? "x64" : "",
                    name: `${targetOptions.runtime}.lib`
                }],
                tarPath: `${targetOptions.runtime}-v${targetOptions.runtimeVersion}.tar.gz`,
                headerOnly: false
            };
        }

        return {
            externalPath: `http://nodejs.org/dist/v${targetOptions.runtimeVersion}/`,
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
            externalPath: `https://iojs.org/dist/v${targetOptions.runtimeVersion}/`,
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
                externalPath: `http://node-webkit.s3.amazonaws.com/v${targetOptions.runtimeVersion}/`,
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
            externalPath: `http://atom.io/download/atom-shell/v${targetOptions.runtimeVersion}/`,
            winLibs: [{
                dir: targetOptions.isX64 ? "x64" : "",
                name: "node.lib"
            }],
            tarPath: `${"node" + "-v"}${targetOptions.runtimeVersion}.tar.gz`,
            headerOnly: false
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
