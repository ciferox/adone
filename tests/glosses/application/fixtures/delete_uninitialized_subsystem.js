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

application.run(TestApp);
