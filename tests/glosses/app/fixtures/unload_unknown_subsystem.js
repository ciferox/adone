const {
    app
} = adone;

class TestApp extends app.Application {
    async main() {
        console.log("main");
        await this.unloadSubsystem("hello");
        return 0;
    }
}

app.run(TestApp);
