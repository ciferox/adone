const {
    app
} = adone;

class TestApp extends adone.app.Application {
    run() {
        return 0;
    }

    async onUninitialize() {
        throw new adone.error.RuntimeException("Something bad happend during uninitialization");
    }
}

app.run(TestApp);
