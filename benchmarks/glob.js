import nodeGlob from "glob";

const globDir = adone.std.path.resolve(__dirname, "..");

const globs = {
    "1 file": "./src/glosses/netron/consts.js",
    "~20 files": "./src/glosses/netron/**/*.js",
    ">1000 files": "./src/glosses/**/*"
};

const optionsSets = {
    "simple options": {
        cwd: globDir
    },
    "medium options": {
        mark: true,
        absolute: true,
        cwd: globDir
    },
    "hardcore options": {
        realpath: true,
        stat: true,
        mark: true,
        nodir: true,
        absolute: true,
        cwd: globDir
    }
};

export default (() => {
    const suites = {};

    for (const optionsSetName in optionsSets) {
        for (const globName in globs) {
            suites[`${optionsSetName} - ${globName}`] = {
                "adone.fs.glob.Glob": [(defer) => {
                    const g = new adone.fs.glob.Glob(globs[globName], optionsSets[optionsSetName]);
                    g.on("end", () => defer.resolve());
                }, { defer: true }],
                "adone.fs.glob": [(defer) => {
                    adone.fs.glob(globs[globName], optionsSets[optionsSetName]).toArray(() => {
                        defer.resolve();
                    });
                }, { defer: true }],
                "node-glob": [(defer) => {
                    const g = nodeGlob(globs[globName], optionsSets[optionsSetName]);
                    g.on("end", () => defer.resolve());
                }, { defer: true }],
                "node-glob sync": () => {
                    nodeGlob.sync(globs[globName], optionsSets[optionsSetName]);
                }
            };
        }
    }

    return suites;
})();
