require("adone");

adone.process.onExit((code, signal) => {
    console.log(`exited with process.exit(), ${code}, ${signal}`);
});

process.exit(32);
