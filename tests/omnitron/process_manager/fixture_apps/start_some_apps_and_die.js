const ProcessManager = require("../../../../lib/omnitron/services/process_manager").default;
const Database = require("../database.js");

process.on("message", (config) => {
    const pm = new ProcessManager({
        basePath: config.basePath,
        omnitron: {
            iDatabase: new Database({ persistent: true, directory: config.basePath })
        },
        datastore: {
            applications: "pm-applications",
            runtime: "pm-runtime"
        },
        defaultProcessConfig: {
            args: [],
            env: {},
            mode: "single",
            startup: false,
            autorestart: false,
            maxRestarts: 3,
            restartDelay: 0,
            killTimeout: 1600,
            instances: 4
        }
    });
    pm.init().then(() => {
        return Promise.all(config.tasks.map((x) => pm.start(x))).then((interfaces) => {
            process.send(interfaces.map((x) => x.pid()));
        });
    }).then(() => {
        setTimeout(() => process.exit(), 1000);
    });
});