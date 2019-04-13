require("a");

const onExitPath = adone.std.path.join(adone.ROOT_PATH, "lib", "glosses", "process", "on_exit.js");

// simulate cases where the module could be loaded from multiple places

// Need to lie about this a little bit, since nyc uses this module
// for its coverage wrap-up handling
let listeners;
if (process.env.NYC_CWD) {
    const emitter = process.__signal_exit_emitter__;
    listeners = emitter.listeners("afterexit");
    process.removeAllListeners("SIGHUP");
    delete process.__signal_exit_emitter__;
    delete require("module")._cache[onExitPath];
}

const onSignalExit = require(onExitPath).default;
let counter = 0;

let unwrap = onSignalExit((code, signal) => {
    counter++;
    console.log("last counter=%j, code=%j, signal=%j",
        counter, code, signal);
}, { alwaysLast: true });
unwrap();

unwrap = onSignalExit((code, signal) => {
    counter++;
    console.log("first counter=%j, code=%j, signal=%j",
        counter, code, signal);
});
unwrap();

if (global.__coverage__ && listeners && listeners.length) {
    listeners.forEach((fn) => {
        onSignalExit(fn, { alwaysLast: true });
    });
}

process.kill(process.pid, "SIGHUP");
setTimeout(() => { }, 1000);
