const {
    app
} = adone;

class TestApp extends app.Application {
    async run() {
        console.log("main");
        await this.loadSubsystem([], { name: "hello" });
        return 0;
    }
}

app.run(TestApp);
