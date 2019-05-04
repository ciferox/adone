const {
    is,
    app
} = adone;

class Sys111 extends app.Subsystem {
    onConfigure() {
        console.log(this.root === adone.__app__);
    }
}

class Sys11 extends app.Subsystem {
    async onConfigure() {
        this.addSubsystem({
            subsystem: new Sys111()
        });
        console.log(this.root === adone.__app__);
    }
}

class Sys1 extends app.Subsystem {
    async onConfigure() {
        this.addSubsystem({
            subsystem: new Sys11()
        });
        console.log(this.root === adone.__app__);
    }
}

class TestApp extends app.Application {
    async onConfigure() {
        this.addSubsystem({
            subsystem: new Sys1()
        });
    }

    run() {
        console.log(is.undefined(this.root));
        return 0;
    }
}

app.run(TestApp);
