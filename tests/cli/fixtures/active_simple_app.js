adone.application.run({
    configure() {
        adone.log("0");
    },
    initialize() {
        adone.log("1");
    },
    main() {
        adone.log("2");
        return 0;
    },
    uninitialize() {
        adone.log("3");
    }
});
