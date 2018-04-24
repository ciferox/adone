class TestApp extends adone.app.Application {
    configure() {
        adone.log("0");
    }

    initialize() {
        adone.log("1");
    }

    main() {
        adone.log("2");
        return 0;
    }

    uninitialize() {
        adone.log("3");
    }
}

adone.app.run(TestApp);
