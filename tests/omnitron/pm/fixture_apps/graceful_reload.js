const cluster = require("cluster");

console.log("start", cluster.worker.id);

const interval = setInterval(() => {}, 1000);

process.on("SIGINT", () => {
    console.log("shutdown", cluster.worker.id);
    clearInterval(interval);
});

