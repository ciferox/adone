adone.application.run({
    main() {
        const screen = new adone.cui.Screen({
            dump: `${__dirname}/logs/autopad.log`,
            smartCSR: true,
            autoPadding: true,
            warnings: true
        });

        const elem1 = new adone.cui.widget.Element({
            parent: screen,
            top: "center",
            left: "center",
            width: 20,
            height: 10,
            border: "line"
        });

        new adone.cui.widget.Element({
            parent: elem1,
            top: 0,
            left: 0,
            width: 10,
            height: 5,
            border: "line"
        });

        screen.key("q", () => {
            return screen.destroy();
        });

        screen.render();
    }
});
