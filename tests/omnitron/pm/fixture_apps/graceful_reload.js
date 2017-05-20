const cluster = require("cluster");

console.log("start", cluster.worker.id);

process.on("SIGINT", () => {
    console.log("shutdown", cluster.worker.id);
    clearInterval(interval);
});

const interval = setInterval(adone.noop, 1000);
