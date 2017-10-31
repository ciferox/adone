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
    async main() {
        adone.log("main");
        await this.loadSubsystem(new Hello());
        return 0;
    }
}

application.run(TestApp);
