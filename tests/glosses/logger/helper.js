const {
    std: { os }
} = adone;

const writer = require("flush-write-stream");
const split = require("split2");
const pid = process.pid;
const hostname = os.hostname();
const v = 1;

const isWin = process.platform === "win32";

export const getPathToNull = () => isWin ? "\\\\.\\NUL" : "/dev/null";


export const once = (emitter, name) => new Promise((resolve, reject) => {
    if (name !== "error") {
        emitter.once("error", reject);
    }
    emitter.once(name, (...args) => {
        emitter.removeListener("error", reject);
        resolve(...args);
    });
});

export const sink = (func) => {
    const result = split((data) => {
        try {
            return JSON.parse(data);
        } catch (err) {
            console.log(err);
            console.log(data);
        }
    });
    if (func) {
        result.pipe(writer.obj(func));
    }
    return result;
};

export const check = function (chunk, level, msg) {
    assert.equal(new Date(chunk.time) <= new Date(), true, "time is greater than Date.now()");
    delete chunk.time;
    assert.equal(chunk.pid, pid);
    assert.equal(chunk.hostname, hostname);
    assert.equal(chunk.level, level);
    assert.equal(chunk.msg, msg);
    assert.equal(chunk.v, v);
};

export const sleep = (ms) => new Promise((resolve) => {
    setTimeout(resolve, ms);
});
