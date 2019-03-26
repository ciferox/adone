const path = require("path");

const {
    gyp: { Gyp, command: { configure } }
} = adone;

const EXPECTED_PYPATH = path.join(__dirname, "..", "gyp", "pylib");
const SEPARATOR = process.platform === "win32" ? ";" : ":";
const SPAWN_RESULT = { on() { } };

it("configure PYTHONPATH with no existing env", () => {
    delete process.env.PYTHONPATH;

    const prog = new Gyp();
    prog.run([]);
    prog.spawn = function () {
        assert.equal(process.env.PYTHONPATH, EXPECTED_PYPATH);
        return SPAWN_RESULT;
    };
    configure(prog, [], assert.fail);
});

it("configure PYTHONPATH with existing env of one dir", () => {
    const existingPath = path.join("a", "b");
    process.env.PYTHONPATH = existingPath;

    const prog = new Gyp();
    prog.run([]);
    prog.spawn = function () {
        assert.equal(process.env.PYTHONPATH, [EXPECTED_PYPATH, existingPath].join(SEPARATOR));

        const dirs = process.env.PYTHONPATH.split(SEPARATOR);
        assert.deepEqual(dirs, [EXPECTED_PYPATH, existingPath]);

        return SPAWN_RESULT;
    };
    configure(prog, [], assert.fail);
});

it("configure PYTHONPATH with existing env of multiple dirs", () => {
    const pythonDir1 = path.join("a", "b");
    const pythonDir2 = path.join("b", "c");
    const existingPath = [pythonDir1, pythonDir2].join(SEPARATOR);
    process.env.PYTHONPATH = existingPath;

    const prog = new Gyp();
    prog.run([]);
    prog.spawn = function () {
        assert.equal(process.env.PYTHONPATH, [EXPECTED_PYPATH, existingPath].join(SEPARATOR));

        const dirs = process.env.PYTHONPATH.split(SEPARATOR);
        assert.deepEqual(dirs, [EXPECTED_PYPATH, pythonDir1, pythonDir2]);

        return SPAWN_RESULT;
    };
    configure(prog, [], assert.fail);
});
