const {
    app
} = adone;

class Sys111 extends app.Subsystem {
    configure() {
        console.log("c111");
    }

    initialize() {
        console.log("i111");
    }

    uninitialize() {
        console.log("u111");
    }
}

class Sys112 extends app.Subsystem {
    configure() {
        console.log("c112");
    }

    initialize() {
        console.log("i112");
    }

    uninitialize() {
        console.log("u112");
    }
}


class Sys11 extends app.Subsystem {
    async configure() {
        this.addSubsystem({
            subsystem: new Sys111()
        });

        this.addSubsystem({
            subsystem: new Sys112()
        });

        console.log("c11");
    }

    initialize() {
        console.log("i11");
    }

    async uninitialize() {
        await this.uninitializeSubsystem("Sys111");

        console.log("u11");
    }
}

class Sys1 extends app.Subsystem {
    async configure() {
        this.addSubsystem({
            subsystem: new Sys11()
        });
        console.log("c1");
    }

    initialize() {
        console.log("i1");
    }

    uninitialize() {
        console.log("u1");
    }
}

class Sys2 extends app.Subsystem {
    async configure() {
        console.log("c2");
    }

    initialize() {
        console.log("i2");
    }

    uninitialize() {
        console.log("u2");
    }
}

class TestApp extends app.Application {
    constructor(options) {
        super(options);
        console.log("nc");
    }

    async configure() {
        this.addSubsystem({
            subsystem: new Sys1()
        });
        this.addSubsystem({
            subsystem: new Sys2()
        });
        console.log("c");
    }

    async initialize() {
        await this.initializeSubsystem("Sys2");
        console.log("i");
    }

    main() {
        console.log("m");
        setTimeout(() => {
            console.log("r");
            this._reinitialize();
        }, 300);
    }

    uninitialize() {
        console.log("u");
    }
}

adone.app.run(TestApp);
