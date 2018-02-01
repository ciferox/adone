const {
    application
} = adone;

class TestApp extends adone.application.Application {
    main() {
        return 0;
    }
    async uninitialize() {
        throw new adone.exception.Runtime("Something bad happend during uninitialization");
    }
}

application.run(TestApp);
