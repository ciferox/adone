require("adone");

setTimeout(() => { });

let calledListener = 0;
const listener = function () {
    calledListener++;
    if (calledListener > 3) {
        process.removeListener("SIGHUP", listener);
    }

    setTimeout(() => {
        process.kill(process.pid, "SIGHUP");
    });
};

adone.process.onExit((code, signal) => {
    console.log("exited calledListener=%j, code=%j, signal=%j",
        calledListener, code, signal);
});

process.on("SIGHUP", listener);
process.kill(process.pid, "SIGHUP");

