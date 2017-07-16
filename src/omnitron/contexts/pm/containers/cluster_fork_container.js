require("adone"); // adone

process.on("message", (data) => {
    if (data === "graceful") {
        if (adone.is.windows) {
            process.emit("SIGINT"); // just imitate the behaviour
        } else {
            process.kill(process.pid, "SIGINT");
        }
    }
});

process.argv[1] = process.env.pm_exec_path;
if (process.env.pm_sourcemaps === "true") {
    adone.sourcemap.support(Error).install();
}
adone.require(process.env.pm_exec_path);
