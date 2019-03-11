adone.app.run({
    main() {
        const screen = new adone.cli.ui.Screen({
            dump: `${__dirname}/logs/padding.log`,
            warnings: true
        });

        new adone.cli.ui.widget.Element({
            parent: screen,
            border: "line",
            style: {
                bg: "red"
            },
            content: "hello world\nhi",
            align: "center",
            left: "center",
            top: "center",
            width: 22,
            height: 10,
            padding: 2
        });

        screen.key("q", () => {
            screen.destroy();
            this.exit(0);
        });

        screen.render();
    }
});
