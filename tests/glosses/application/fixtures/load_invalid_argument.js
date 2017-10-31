const {
    application
} = adone;

class TestApp extends application.Application {
    async main() {
        adone.log("main");
        await this.loadSubsystem([], { name: "hello" });
        return 0;
    }
}

application.run(TestApp);
