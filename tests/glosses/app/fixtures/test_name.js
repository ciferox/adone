class TestApp extends adone.app.Application {
    main() {
        adone.log(this.name);
        return 0;
    }
}

adone.app.run(TestApp);
