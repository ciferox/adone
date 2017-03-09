import nodeGlob from "glob";

const globDir = adone.std.path.resolve(__dirname, "..");

const globs = {
    "1 file": "./src/glosses/netron/consts.js",
    ">10 file": "./src/glosses/netron/**/*.js",
    ">1000 file": "./src/glosses/**/*"
};

const optionsSets = {
    "simple options": {
        cwd: globDir
    },
    "hardcore options": {
        realpath: true,
        stat: true,
        mark: true,
        nodir: true,
        cwd: globDir
    }
};

export default (() => {
    const suites = {};

    for (const globName in globs) {
        for (const optionsSetName in optionsSets) {
            suites[`${globName} - ${optionsSetName}`] = {
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
                }, { defer: true }]
            };
        }
    }

    return suites;
})();
