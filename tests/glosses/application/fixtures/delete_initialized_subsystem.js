const {
    application
} = adone;

class AppSubsystem extends application.Subsystem {
    configure() {
        adone.log("configure");
    }

    initialize() {
        adone.log("initialize");
    }

    uninitialize() {
        adone.log("uninitialize");
    }
}

class TestApp extends adone.application.Application {
    async configure() {
        await this.addSubsystem({
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

application.run(TestApp);
