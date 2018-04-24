const {
    app,
    is
} = adone;

class AppSubsystem extends app.Subsystem {
    getData() {
        return "some_data";
    }
}

class TestApp extends adone.app.Application {
    async configure() {
        this.addSubsystem({
            name: "sys1",
            subsystem: new AppSubsystem(),
            bind: true
        });
    }

    async main() {
        adone.log(is.subsystem(this.sys1));
        adone.log(this.sys1.getData());

        await this.uninitializeSubsystem("sys1");
        await this.deleteSubsystem("sys1");

        adone.log(is.subsystem(this.sys1));
        return 0;
    }
}

app.run(TestApp);
