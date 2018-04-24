class TestApp extends adone.app.Application {
    main() {
        try {
            this.isMain = false;
            adone.log("bad");
        } catch (err) {
            adone.log("ok");
        }
        return 0;
    }
}

adone.app.run(TestApp);
