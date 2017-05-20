const t = setInterval(adone.noop, 1000);

process.on("SIGINT", () => {
    console.log("graceful");
    clearInterval(t);
});
