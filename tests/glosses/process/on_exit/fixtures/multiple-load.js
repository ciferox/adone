require("adone");

const onExitPath = adone.path.join(adone.ROOT_PATH, "lib", "glosses", "process", "on_exit.js");

// simulate cases where the module could be loaded from multiple places
let onExit = require(onExitPath).default;

let counter = 0;

onExit((code, signal) => {
    counter++;
    console.log("last counter=%j, code=%j, signal=%j",
        counter, code, signal);
}, { alwaysLast: true });

onExit((code, signal) => {
    counter++;
    console.log("first counter=%j, code=%j, signal=%j",
        counter, code, signal);
});

delete require("module")._cache[onExitPath];
onExit = require(onExitPath).default;

onExit((code, signal) => {
    counter++;
    console.log("last counter=%j, code=%j, signal=%j",
        counter, code, signal);
}, { alwaysLast: true });

onExit((code, signal) => {
    counter++;
    console.log("first counter=%j, code=%j, signal=%j",
        counter, code, signal);
});

// Lastly, some that should NOT be shown
delete require("module")._cache[onExitPath];
onExit = require(onExitPath).default;

let unwrap = onExit((code, signal) => {
    counter++;
    console.log("last counter=%j, code=%j, signal=%j",
        counter, code, signal);
}, { alwaysLast: true });
unwrap();

unwrap = onExit((code, signal) => {
    counter++;
    console.log("first counter=%j, code=%j, signal=%j",
        counter, code, signal);
});

unwrap();

process.kill(process.pid, "SIGHUP");
setTimeout(() => { }, 1000);
