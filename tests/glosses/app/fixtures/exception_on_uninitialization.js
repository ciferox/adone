const {
    app
} = adone;

class TestApp extends adone.app.Application {
    main() {
        return 0;
    }

    async uninitialize() {
        throw new adone.error.Runtime("Something bad happend during uninitialization");
    }
}

app.run(TestApp);
