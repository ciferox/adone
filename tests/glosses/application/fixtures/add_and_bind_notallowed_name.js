const {
    app
} = adone;

class AppSubsystem extends app.Subsystem {
    getData() {
        return "some_data";
    }
}

class TestApp extends adone.app.Application {
    async configure() {
        this.addSubsystem({
            subsystem: new AppSubsystem(),
            bind: "removeListener"
        });
    }

    main() {
        adone.log(this.sys1.getData());
        return 0;
    }
}

app.run(TestApp);
