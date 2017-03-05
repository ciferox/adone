const cluster = require("cluster");

console.log("start", cluster.worker.id);

process.on("message", (msg) => {
    if (msg === "shutdown") {
        console.log("shutdown", cluster.worker.id);
    }
});

setInterval(() => {}, 1000);