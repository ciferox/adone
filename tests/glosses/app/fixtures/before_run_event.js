const {
    app
} = adone;

const {
    command
} = app;

class TestApp extends app.Application {
    onConfigure() {
        this.on("before run", async (command) => {
            if (command.names[0] === "failed") {
                throw new adone.error.RuntimeException("something bad happened");
            }
            console.log("before run", command.names.join(","));
        });
    }

    @command({
        name: ["regular", "r"]
    })
    regular() {
        console.log("regular");
        return 0;
    }

    @command({
        name: "failed"
    })
    failed() {
        console.log("failed");
        return 0;
    }

    run() {
        console.log("main");
        return 0;
    }
}

app.run(TestApp, {
    useArgs: true
});
