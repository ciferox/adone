const {
    app
} = adone;

class Hello extends app.Subsystem {
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

class TestApp extends app.Application {
    async main() {
        adone.log("main");
        await this.loadSubsystem(new Hello(), { name: "hello" });
        await this.loadSubsystem("hello");
        return 0;
    }
}

app.run(TestApp);
