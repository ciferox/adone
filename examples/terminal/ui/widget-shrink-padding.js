adone.application.run({
    main() {
        const screen = new adone.terminal.ui.Screen({
            dump: `${__dirname}/logs/shrink-padding.log`,
            warnings: true
        });

        const outer = new adone.terminal.ui.widget.Element({
            parent: screen,
            //left: 0,
            //top: 0,
            //left: '50%',
            //top: '50%',
            left: "center",
            top: "center",
            padding: 1,
            shrink: true,
            style: {
                bg: "green"
            }
        });

        new adone.terminal.ui.widget.Element({
            parent: outer,
            left: 0,
            top: 0,
            //width: 5,
            //height: 5,
            shrink: true,
            content: "foobar",
            //padding: 1,
            //content: 'f',
            style: {
                bg: "magenta"
            }
        });

        screen.key("q", () => {
            screen.destroy();
            this.exit();
        });

        screen.render();
    }
});
