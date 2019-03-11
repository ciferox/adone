const {
    is,
    cli: { chalk },
    std: { child_process: child, path },
    shell: { common }
} = adone;

const numLines = (str) => is.string(str) ? (str.match(/\n/g) || []).length + 1 : 0;

exports.numLines = numLines;

const getTempDir = () => path.join(__dirname, "..", (`tmp${Math.random()}${Math.random()}`).replace(/\./g, ""));

exports.getTempDir = getTempDir;

// On Windows, symlinks for files need admin permissions. This helper
// skips certain tests if we are on Windows and got an EPERM error
const skipOnWinForEPERM = (action, testCase) => {
    const ret = action();
    const error = ret.code;
    const isWindows = process.platform === "win32";
    if (isWindows && error && /EPERM:/.test(error)) {
        console.warn("Got EPERM when testing symlinks on Windows. Assuming non-admin environment and skipping test.");
    } else {
        testCase();
    }
};
exports.skipOnWinForEPERM = skipOnWinForEPERM;

const runScript = (script, cb) => {
    child.execFile(common.config.execPath, ["-e", script], cb);
};
exports.runScript = runScript;

const sleep = (time) => {
    const testDirectoryPath = path.dirname(__dirname);
    child.execFileSync(common.config.execPath, [
        path.join(testDirectoryPath, "resources", "exec", "slow.js"),
        time.toString()
    ]);
};
exports.sleep = sleep;

const mkfifo = (dir) => {
    if (process.platform !== "win32") {
        const fifo = `${dir}fifo`;
        child.execFileSync("mkfifo", [fifo]);
        return fifo;
    }
    return null;
};
exports.mkfifo = mkfifo;

const skipIfTrue = (booleanValue, t, closure) => {
    if (booleanValue) {
        console.warn(
            chalk.yellow("Warning: skipping platform-dependent test ") +
            chalk.bold.white(`'${t._test.title}'`)
        );
        t.truthy(true); // dummy assertion to satisfy ava v0.19+
    } else {
        closure();
    }
};

exports.skipOnUnix = skipIfTrue.bind(module.exports, process.platform !== "win32");
exports.skipOnWin = skipIfTrue.bind(module.exports, process.platform === "win32");
