require("a");

adone.process.onExit((code, signal) => {
    console.log(`reached end of execution, ${code}, ${signal}`);
});
