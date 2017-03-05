
// bin files should be placed first
const paths = [
    {
        from: ["src/app.js"],
        to: "bin"
    },
];

const transpileOptions = {
    compact: false,
    only: /\.js$/,
    sourceMaps: true,
    plugins: [
        "transform.flowStripTypes",
        "transform.decoratorsLegacy",
        "transform.classProperties",
        "transform.asyncToGenerator",
        "transform.ESModules",
        "transform.functionBind",
        "transform.objectRestSpread"
    ]
};

const chmodOptions = {
    owner: {
        read: true,
        write: true,
        execute: true
    },
    group: {
        read: true,
        write: false,
        execute: true
    },
    others: {
        read: true,
        write: false,
        execute: true
    }
};

const notifyOptions = { console: false, gui: true };