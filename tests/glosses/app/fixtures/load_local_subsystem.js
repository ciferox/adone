const {
    app
} = adone;

class Hello extends app.Subsystem {
    configure() {
        console.log("hello configure");
    }

    initialize() {
        console.log("hello init");
    }

    uninitialize() {
        console.log("hello uninit");
    }
}

class TestApp extends app.Application {
    async main() {
        console.log("main");
        await this.loadSubsystem(new Hello());
        return 0;
    }
}

app.run(TestApp);
