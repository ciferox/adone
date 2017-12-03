const {
    application
} = adone;

class Hello extends application.Subsystem {
    configure() {
        adone.log("hello configure");
    }

    initialize() {
        adone.log("hello init");
    }

    uninitialize() {
        adone.log("hello uninit");
    }
}

class TestApp extends application.Application {
    async configure() {
        this.addSubsystem({
            name: "hello",
            subsystem: new Hello()
        });
    }

    async main() {
        adone.log("main");
        await this.unloadSubsystem("hello");
        adone.log("has", this.hasSubsystem("hello"));
        return 0;
    }
}

application.run(TestApp);
