require("../../../../..");  // adone

process.on("message", (data) => {
    if (data === "graceful") {
        if (process.platform === "win32") {
            process.emit("SIGINT");  // just imitate the behaviour
        } else {
            process.kill(process.pid, "SIGINT");
        }
    }
});

process.argv[1] = process.env.pm_exec_path;
adone.require(process.env.pm_exec_path);
