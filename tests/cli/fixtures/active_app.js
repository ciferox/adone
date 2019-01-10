class TestApp extends adone.app.Application {
    configure() {
        console.log("0");
    }

    initialize() {
        console.log("1");
    }

    main() {
        console.log("2");
        return 0;
    }

    uninitialize() {
        console.log("3");
    }
}

adone.app.run(TestApp);
