const {
    app
} = adone;

class TestApp extends app.Application {
    async main() {
        adone.log("main");
        await this.loadSubsystem([], { name: "hello" });
        return 0;
    }
}

app.run(TestApp);
