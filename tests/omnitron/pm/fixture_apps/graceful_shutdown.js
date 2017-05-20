const t = setInterval(() => {}, 1000);

process.on("SIGINT", () => {
    console.log("graceful");
    clearInterval(t);
});
