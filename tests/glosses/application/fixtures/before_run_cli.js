const {
    application
} = adone;

const {
    DCliCommand
} = application;

class TestApp extends application.CliApplication {
    configure() {
        this.on("before run", async (command) => {
            if (command.names[0] === "failed") {
                throw new adone.x.Runtime("something bad happened");
            }
            adone.log("before run", command.names.join(","));
        });
    }

    @DCliCommand({
        name: ["regular", "r"]
    })
    regular() {
        adone.log("regular");
        return 0;
    }

    @DCliCommand({
        name: "failed"
    })
    failed() {
        adone.log("failed");
        return 0;
    }

    main() {
        adone.log("main");
        return 0;
    }
}

application.runCli(TestApp);
