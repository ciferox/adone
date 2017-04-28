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
require("module")._load(process.env.pm_exec_path, null, true);
