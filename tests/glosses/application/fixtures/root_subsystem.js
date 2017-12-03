const {
    application
} = adone;

class Sys111 extends application.Subsystem {
    configure() {
        adone.log(this.root === adone.runtime.app);
    }
}

class Sys11 extends application.Subsystem {
    async configure() {
        this.addSubsystem({
            subsystem: new Sys111()
        });
        adone.log(this.root === adone.runtime.app);
    }
}

class Sys1 extends application.Subsystem {
    async configure() {
        this.addSubsystem({
            subsystem: new Sys11()
        });
        adone.log(this.root === adone.runtime.app);
    }
}

class TestApp extends application.Application {
    async configure() {
        this.addSubsystem({
            subsystem: new Sys1()
        });
    }

    main() {
        adone.log(this.root === this);
        return 0;
    }
}

adone.application.run(TestApp);
