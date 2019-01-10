const {
    app
} = adone;

const {
    DCliCommand
} = app;

class TestApp extends app.CliApplication {
    configure() {
        this.on("before run", async (command) => {
            if (command.names[0] === "failed") {
                throw new adone.error.Runtime("something bad happened");
            }
            console.log("before run", command.names.join(","));
        });
    }

    @DCliCommand({
        name: ["regular", "r"]
    })
    regular() {
        console.log("regular");
        return 0;
    }

    @DCliCommand({
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

app.runCli(TestApp);
