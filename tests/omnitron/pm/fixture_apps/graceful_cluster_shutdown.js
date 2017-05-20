const timer = setInterval(adone.noop, 1000);


process.on("SIGINT", () => {
    console.log("shutting down");
    clearTimeout(timer);
});
