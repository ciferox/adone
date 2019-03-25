const {
    app
} = adone;

class Sys111 extends app.Subsystem {
    onConfigure() {
        console.log("c111");
    }

    onInitialize() {
        console.log("i111");
    }

    onUninitialize() {
        console.log("u111");
    }
}

class Sys112 extends app.Subsystem {
    onConfigure() {
        console.log("c112");
    }

    onInitialize() {
        console.log("i112");
    }

    onUninitialize() {
        console.log("u112");
    }
}


class Sys11 extends app.Subsystem {
    async onConfigure() {
        this.addSubsystem({
            subsystem: new Sys111()
        });

        this.addSubsystem({
            subsystem: new Sys112()
        });

        console.log("c11");
    }

    onInitialize() {
        console.log("i11");
    }

    async onUninitialize() {
        await this.uninitializeSubsystem("Sys111");

        console.log("u11");
    }
}

class Sys1 extends app.Subsystem {
    async onConfigure() {
        this.addSubsystem({
            subsystem: new Sys11()
        });
        console.log("c1");
    }

    onInitialize() {
        console.log("i1");
    }

    onUninitialize() {
        console.log("u1");
    }
}

class Sys2 extends app.Subsystem {
    async onConfigure() {
        console.log("c2");
    }

    onInitialize() {
        console.log("i2");
    }

    onUninitialize() {
        console.log("u2");
    }
}

class TestApp extends app.Application {
    constructor(options) {
        super(options);
        console.log("nc");
    }

    async onConfigure() {
        this.addSubsystem({
            subsystem: new Sys1()
        });
        this.addSubsystem({
            subsystem: new Sys2()
        });
        console.log("c");
    }

    async onInitialize() {
        await this.initializeSubsystem("Sys2");
        console.log("i");
    }

    run() {
        console.log("m");
        setTimeout(() => {
            console.log("r");
            this.reinitialize();
        }, 300);
    }

    onUninitialize() {
        console.log("u");
    }
}

adone.app.run(TestApp);
