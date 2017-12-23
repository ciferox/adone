const path = require("path");
const execFile = require("child_process").execFile;

const {
    gyp: { command: { configure } }
} = adone;

const PythonFinder = configure.test.PythonFinder;

it("find python", () => {
    configure.test.findPython("python", (err, found) => {
        assert.strictEqual(err, null);
        const proc = execFile(found, ["-V"], (err, stdout, stderr) => {
            assert.strictEqual(err, null);
            assert.strictEqual(stdout, "");
            assert.ok(/Python 2/.test(stderr));
        });
        proc.stdout.setEncoding("utf-8");
        proc.stderr.setEncoding("utf-8");
    });
});

const poison = function (object, property) {
    const fail = function () {
        throw new Error(`Property ${property} should not have been accessed.`);
    };
    const descriptor = {
        configurable: true,
        enumerable: false,
        writable: true,
        getter: fail,
        setter: fail
    };
    Object.defineProperty(object, property, descriptor);
};

// Work around a v0.10.x CI issue where path.resolve() on UNIX systems prefixes
// Windows paths with the current working directory.  v0.12 and up are free of
// this issue because they use path.win32.resolve() which does the right thing.
const resolve = path.win32 && path.win32.resolve || function () {
    const rstrip = function (s) {
        return s.replace(/\\+$/, "");
    };
    return [].slice.call(arguments).map(rstrip).join("\\");
};

function TestPythonFinder() {
    PythonFinder.apply(this, arguments);
}
TestPythonFinder.prototype = Object.create(PythonFinder.prototype);
poison(TestPythonFinder.prototype, "env");
poison(TestPythonFinder.prototype, "execFile");
poison(TestPythonFinder.prototype, "resolve");
poison(TestPythonFinder.prototype, "stat");
poison(TestPythonFinder.prototype, "which");
poison(TestPythonFinder.prototype, "win");

it("find python - python", () => {
    const done = function (err, python) {
        assert.strictEqual(err, null);
        assert.strictEqual(python, "python");
    };

    const f = new TestPythonFinder("python", done);
    f.which = function (program, cb) {
        assert.strictEqual(program, "python");
        cb(null, program);
    };
    f.execFile = function (program, args, opts, cb) {
        assert.strictEqual(program, "python");
        assert.ok(/import platform/.test(args[1]));
        cb(null, "2.7.0");
    };
    f.checkPython();
});

it("find python - python too old", () => {
    const done = function (err, python) {
        assert.ok(/is not supported by gyp/.test(err));
    };

    const f = new TestPythonFinder("python", done);
    f.which = function (program, cb) {
        assert.strictEqual(program, "python");
        cb(null, program);
    };
    f.execFile = function (program, args, opts, cb) {
        assert.strictEqual(program, "python");
        assert.ok(/import platform/.test(args[1]));
        cb(null, "2.3.4");
    };
    f.checkPython();
});

it("find python - python too new", () => {
    const done = function (err, python) {
        assert.ok(/is not supported by gyp/.test(err));
    };

    const f = new TestPythonFinder("python", done);
    f.which = function (program, cb) {
        assert.strictEqual(program, "python");
        cb(null, program);
    };
    f.execFile = function (program, args, opts, cb) {
        assert.strictEqual(program, "python");
        assert.ok(/import platform/.test(args[1]));
        cb(null, "3.0.0");
    };
    f.checkPython();
});

it("find python - no python", () => {
    const done = function (err, python) {
        assert.ok(/Can't find Python executable/.test(err));
    };

    const f = new TestPythonFinder("python", done);
    f.which = function (program, cb) {
        assert.strictEqual(program, "python");
        cb(new Error("not found"));
    };
    f.checkPython();
});

it("find python - no python2", () => {
    const done = function (err, python) {
        assert.strictEqual(err, null);
        assert.strictEqual(python, "python");
    };

    const f = new TestPythonFinder("python2", done);
    f.which = function (program, cb) {
        f.which = function (program, cb) {
            assert.strictEqual(program, "python");
            cb(null, program);
        };
        assert.strictEqual(program, "python2");
        cb(new Error("not found"));
    };
    f.execFile = function (program, args, opts, cb) {
        assert.strictEqual(program, "python");
        assert.ok(/import platform/.test(args[1]));
        cb(null, "2.7.0");
    };
    f.checkPython();
});

it("find python - no python2, no python, unix", () => {
    const done = function (err, python) {
        assert.ok(/Can't find Python executable/.test(err));
    };

    const f = new TestPythonFinder("python2", done);
    poison(f, "checkPythonLauncher");
    f.win = false;

    f.which = function (program, cb) {
        f.which = function (program, cb) {
            assert.strictEqual(program, "python");
            cb(new Error("not found"));
        };
        assert.strictEqual(program, "python2");
        cb(new Error("not found"));
    };
    f.checkPython();
});

it("find python - no python, use python launcher", () => {
    const done = function (err, python) {
        assert.strictEqual(err, null);
        assert.strictEqual(python, "Z:\\snake.exe");
    };

    const f = new TestPythonFinder("python", done);
    f.env = {};
    f.win = true;

    f.which = function (program, cb) {
        assert.strictEqual(program, "python");
        cb(new Error("not found"));
    };
    f.execFile = function (program, args, opts, cb) {
        f.execFile = function (program, args, opts, cb) {
            assert.strictEqual(program, "Z:\\snake.exe");
            assert.ok(/import platform/.test(args[1]));
            cb(null, "2.7.0");
        };
        assert.strictEqual(program, "py.exe");
        assert.notEqual(args.indexOf("-2"), -1);
        assert.notEqual(args.indexOf("-c"), -1);
        cb(null, "Z:\\snake.exe");
    };
    f.checkPython();
});

it("find python - python 3, use python launcher", () => {
    const done = function (err, python) {
        assert.strictEqual(err, null);
        assert.strictEqual(python, "Z:\\snake.exe");
    };

    const f = new TestPythonFinder("python", done);
    f.env = {};
    f.win = true;

    f.which = function (program, cb) {
        assert.strictEqual(program, "python");
        cb(null, program);
    };
    f.execFile = function (program, args, opts, cb) {
        f.execFile = function (program, args, opts, cb) {
            f.execFile = function (program, args, opts, cb) {
                assert.strictEqual(program, "Z:\\snake.exe");
                assert.ok(/import platform/.test(args[1]));
                cb(null, "2.7.0");
            };
            assert.strictEqual(program, "py.exe");
            assert.notEqual(args.indexOf("-2"), -1);
            assert.notEqual(args.indexOf("-c"), -1);
            cb(null, "Z:\\snake.exe");
        };
        assert.strictEqual(program, "python");
        assert.ok(/import platform/.test(args[1]));
        cb(null, "3.0.0");
    };
    f.checkPython();
});

it("find python - python 3, use python launcher, python 2 too old", () => {
    const done = function (err, python) {
        assert.ok(/is not supported by gyp/.test(err));
    };

    const f = new TestPythonFinder("python", done);
    f.checkedPythonLauncher = false;
    f.env = {};
    f.win = true;

    f.which = function (program, cb) {
        assert.strictEqual(program, "python");
        cb(null, program);
    };
    f.execFile = function (program, args, opts, cb) {
        f.execFile = function (program, args, opts, cb) {
            f.execFile = function (program, args, opts, cb) {
                assert.strictEqual(program, "Z:\\snake.exe");
                assert.ok(/import platform/.test(args[1]));
                cb(null, "2.3.4");
            };
            assert.strictEqual(program, "py.exe");
            assert.notEqual(args.indexOf("-2"), -1);
            assert.notEqual(args.indexOf("-c"), -1);
            cb(null, "Z:\\snake.exe");
        };
        assert.strictEqual(program, "python");
        assert.ok(/import platform/.test(args[1]));
        cb(null, "3.0.0");
    };
    f.checkPython();
});

it("find python - no python, no python launcher, good guess", () => {
    const re = /C:[\\\/]Python27[\\\/]python[.]exe/;

    const done = function (err, python) {
        assert.ok(re.test(python));
    };
    const f = new TestPythonFinder("python", done);
    f.env = {};
    f.win = true;

    f.which = function (program, cb) {
        assert.strictEqual(program, "python");
        cb(new Error("not found"));
    };
    f.execFile = function (program, args, opts, cb) {
        f.execFile = function (program, args, opts, cb) {
            assert.ok(re.test(program));
            assert.ok(/import platform/.test(args[1]));
            cb(null, "2.7.0");
        };
        assert.strictEqual(program, "py.exe");
        cb(new Error("not found"));
    };
    f.resolve = resolve;
    f.stat = function (path, cb) {
        assert.ok(re.test(path));
        cb(null, {});
    };
    f.checkPython();
});

it("find python - no python, no python launcher, bad guess", () => {
    const done = function (err, python) {
        assert.ok(/Can't find Python executable/.test(err));
    };

    const f = new TestPythonFinder("python", done);
    f.env = { SystemDrive: "Z:\\" };
    f.win = true;

    f.which = function (program, cb) {
        assert.strictEqual(program, "python");
        cb(new Error("not found"));
    };
    f.execFile = function (program, args, opts, cb) {
        assert.strictEqual(program, "py.exe");
        cb(new Error("not found"));
    };
    f.resolve = resolve;
    f.stat = function (path, cb) {
        assert.ok(/Z:[\\\/]Python27[\\\/]python.exe/.test(path));
        const err = new Error("not found");
        err.code = "ENOENT";
        cb(err);
    };
    f.checkPython();
});
