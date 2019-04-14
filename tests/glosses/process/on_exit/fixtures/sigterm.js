require("adone");

const { onExit } = adone.process;

onExit((code, signal) => {
    console.log(`exited with sigterm, ${code}, ${signal}`);
});

setTimeout(() => { }, 1000);

process.kill(process.pid, "SIGTERM");
