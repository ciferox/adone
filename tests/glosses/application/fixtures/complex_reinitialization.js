const {
    application
} = adone;

class Sys111 extends application.Subsystem {
    configure() {
        adone.log("c111");
    }

    initialize() {
        adone.log("i111");
    }

    uninitialize() {
        adone.log("u111");
    }
}

class Sys112 extends application.Subsystem {
    configure() {
        adone.log("c112");
    }

    initialize() {
        adone.log("i112");
    }

    uninitialize() {
        adone.log("u112");
    }
}


class Sys11 extends application.Subsystem {
    async configure() {
        this.addSubsystem({
            subsystem: new Sys111()
        });

        this.addSubsystem({
            subsystem: new Sys112()
        });

        adone.log("c11");
    }

    initialize() {
        adone.log("i11");
    }

    uninitialize() {
        adone.log("u11");
    }
}

class Sys1 extends application.Subsystem {
    async configure() {
        this.addSubsystem({
            subsystem: new Sys11()
        });
        adone.log("c1");
    }

    initialize() {
        adone.log("i1");
    }

    uninitialize() {
        adone.log("u1");
    }
}

class Sys2 extends application.Subsystem {
    async configure() {
        adone.log("c2");
    }

    initialize() {
        adone.log("i2");
    }

    uninitialize() {
        adone.log("u2");
    }
}

class TestApp extends application.Application {
    constructor(options) {
        super(options);
        adone.log("nc");
    }

    async configure() {
        this.addSubsystem({
            subsystem: new Sys1()
        });
        this.addSubsystem({
            subsystem: new Sys2()
        });
        adone.log("c");
    }

    initialize() {
        adone.log("i");
    }

    main() {
        adone.log("m");
        setTimeout(() => {
            adone.log("r");
            this._reinitialize();
        }, 300);
    }

    uninitialize() {
        adone.log("u");
    }
}

adone.application.run(TestApp);
