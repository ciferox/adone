adone.app.run({
    main() {
        const screen = new adone.cli.ui.Screen({
            dump: `${__dirname}/logs/autopad.log`,
            smartCSR: true,
            autoPadding: true,
            warnings: true
        });

        const elem1 = new adone.cli.ui.widget.Element({
            parent: screen,
            top: "center",
            left: "center",
            width: 20,
            height: 10,
            border: "line"
        });

        new adone.cli.ui.widget.Element({
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
