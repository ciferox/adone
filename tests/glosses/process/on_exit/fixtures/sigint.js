require("a");
const { onExit } = adone.process;

onExit((code, signal) => {
    console.log(`exited with sigint, ${code}, ${signal}`);
});

// For some reason, signals appear to not always be fast enough
// to come in before the process exits.  Just a few ticks needed.
setTimeout(() => { }, 1000);

process.kill(process.pid, "SIGINT");
