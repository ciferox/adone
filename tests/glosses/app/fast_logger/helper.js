const writer = require("flush-write-stream");
const split = require("split2");
const pid = process.pid;
const v = 1;

const {
    std: { os }
} = adone;

const hostname = os.hostname();


const once = function (emitter, name) {
    return new Promise((resolve, reject) => {
        if (name !== "error") {
            emitter.once("error", reject);
        }
        emitter.once(name, (...args) => {
            emitter.removeListener("error", reject);
            resolve(...args);
        });
    });
};

const sink = function (func) {
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

const check = (chunk, level, msg) => {
    assert.isTrue(new Date(chunk.time) <= new Date(), "time is greater than Date.now()");
    delete chunk.time;
    assert.equal(chunk.pid, pid);
    assert.equal(chunk.hostname, hostname);
    assert.equal(chunk.level, level);
    assert.equal(chunk.msg, msg);
    assert.equal(chunk.v, v);
};

const sleep = function (ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
};

module.exports = { sink, check, once, sleep };
