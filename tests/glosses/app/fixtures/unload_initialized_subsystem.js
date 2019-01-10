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
    async configure() {
        this.addSubsystem({
            name: "hello",
            subsystem: new Hello()
        });
    }

    async main() {
        console.log("main");
        await this.unloadSubsystem("hello");
        console.log("has", this.hasSubsystem("hello"));
        return 0;
    }
}

app.run(TestApp);
