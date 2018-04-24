const {
    app
} = adone;

class Sys111 extends app.Subsystem {
    configure() {
        adone.log(this.root === adone.runtime.app);
    }
}

class Sys11 extends app.Subsystem {
    async configure() {
        this.addSubsystem({
            subsystem: new Sys111()
        });
        adone.log(this.root === adone.runtime.app);
    }
}

class Sys1 extends app.Subsystem {
    async configure() {
        this.addSubsystem({
            subsystem: new Sys11()
        });
        adone.log(this.root === adone.runtime.app);
    }
}

class TestApp extends app.Application {
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

app.run(TestApp);
