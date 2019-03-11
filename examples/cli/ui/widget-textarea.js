adone.app.run({
    main() {
        const screen = new adone.cli.ui.Screen({
            dump: `${__dirname}/logs/textarea.log`,
            fullUnicode: true,
            warnings: true
        });

        const box = new adone.cli.ui.widget.TextArea({
            parent: screen,
            // Possibly support:
            // align: 'center',
            style: {
                bg: "blue"
            },
            height: "half",
            width: "half",
            top: "center",
            left: "center",
            tags: true
        });

        screen.render();

        screen.key("q", () => {
            screen.destroy();
        });

        screen.key("i", () => {
            box.readInput(adone.noop);
        });

        screen.key("e", () => {
            box.readEditor(adone.noop);
        });
    }
});
