const timer = setInterval(() => {}, 1000);


process.on("SIGINT", () => {
    console.log("shutting down");
    clearTimeout(timer);
});