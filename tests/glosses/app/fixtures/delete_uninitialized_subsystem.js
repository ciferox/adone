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
        await this.uninitializeSubsystem("hello");
        await this.deleteSubsystem("hello");
        console.log(this.hasSubsystem("hello"));
        return 0;
    }
}

app.run(TestApp);
