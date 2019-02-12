const {
    app
} = adone;

const {
    CommandMeta
} = app;

class TestApp extends app.Application {
    configure() {
        this.on("before run", async (command) => {
            if (command.names[0] === "failed") {
                throw new adone.error.RuntimeException("something bad happened");
            }
            console.log("before run", command.names.join(","));
        });
    }

    @CommandMeta({
        name: ["regular", "r"]
    })
    regular() {
        console.log("regular");
        return 0;
    }

    @CommandMeta({
        name: "failed"
    })
    failed() {
        console.log("failed");
        return 0;
    }

    main() {
        console.log("main");
        return 0;
    }
}

app.run(TestApp, {
    useArgs: true
});
