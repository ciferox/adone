const {
    application
} = adone;

class AppSubsystem extends application.Subsystem {
    getData() {
        return "some_data";
    }
}

class TestApp extends adone.application.Application {
    async configure() {
        await this.addSubsystem({
            subsystem: new AppSubsystem(),
            bind: "removeListener"
        });
    }

    main() {
        adone.log(this.sys1.getData());
        return 0;
    }
}

application.run(TestApp);
