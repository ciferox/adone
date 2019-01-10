adone.app.run({
    configure() {
        console.log("0");
    },
    initialize() {
        console.log("1");
    },
    main() {
        console.log("2");
        return 0;
    },
    uninitialize() {
        console.log("3");
    }
});
