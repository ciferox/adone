require(process.argv[2]); // the main process passes adone's absolute path

adone.sourcemap.support(Error).install();

// if i use adone.app.runCli sometimes it requires "Enter" in console after exit

const main = async () => {
    const p = new Promise((resolve) => {
        process.once("message", resolve);
    });
    process.send("ready");

    const {
        defaultTimeout,
        defaultHookTimeout,
        transpilerOptions,
        skipSlow,
        onlySlow,
        root,
        path,
        dryRun
    } = adone.data.bson.decode(Buffer.from(await p, "hex"));

    const engine = new adone.shani.Engine({
        defaultHookTimeout,
        defaultTimeout,
        transpilerOptions,
        skipSlow,
        onlySlow,
        root,
        dryRun
    });

    engine.include(path);

    await new Promise((resolve) => {
        process.send("got");
        process.once("message", resolve);
    });

    const emitter = engine.start();

    process.once("message", (msg) => {
        if (msg === "stop") {
            emitter.stop();
        }
    });


    const events = [
        "enter block", "exit block",
        "start test", "end test", "skip test",
        "start before hook", "end before hook",
        "start after hook", "end after hook",
        "start before each hook", "end before each hook",
        "start before test hook", "end before test hook",
        "start after each hook", "end after each hook",
        "start after test hook", "end after test hook",
        "done", "error"
    ];

    for (const event of events) {
        emitter.on(event, (...args) => {
            process.send({ event, args });
        });
    }

    await new Promise((resolve) => {
        emitter.once("done", resolve);
    });
};

main().catch(() => process.exit(1));
