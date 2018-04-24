const {
    app
} = adone;

class TestApp extends app.Application {
    async main() {
        adone.log("main");
        await this.unloadSubsystem("hello");
        return 0;
    }
}

app.run(TestApp);
