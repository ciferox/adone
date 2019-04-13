require("a");

const { onExit } = adone.process;

onExit((code, signal) => {
    console.error("onSignalExit(%j,%j)", code, signal);
});
setTimeout(() => {
    console.log("hello");
});
process.kill(process.pid, "SIGPIPE");
