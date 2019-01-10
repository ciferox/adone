const {
    app
} = adone;

class AppSubsystem extends app.Subsystem {
    configure() {
        console.log("configure");
    }

    initialize() {
        console.log("initialize");
    }

    uninitialize() {
        console.log("uninitialize");
    }
}

class TestApp extends adone.app.Application {
    async configure() {
        this.addSubsystem({
            name: "hello",
            subsystem: new AppSubsystem()
        });
    }

    async main() {
        console.log("main");
        try {
            await this.deleteSubsystem("hello");
        } catch (err) {
            console.log(err.message);
        }
        console.log(this.hasSubsystem("hello"));
        return 0;
    }
}

app.run(TestApp);
