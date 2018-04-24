adone.app.run({
    main() {
        const screen = new adone.terminal.ui.Screen({
            smartCSR: true,
            dump: `${__dirname}/logs/obscure-sides.log`,
            autoPadding: true,
            warnings: true
        });

        const box = new adone.terminal.ui.widget.Element({
            parent: screen,
            scrollable: true,
            alwaysScroll: true,
            border: {
                type: "bg",
                ch: " "
            },
            style: {
                bg: "blue",
                border: {
                    inverse: true
                },
                scrollbar: {
                    bg: "white"
                }
            },
            height: 10,
            width: 30,
            top: "center",
            left: "center",
            cwd: process.env.HOME,
            keys: true,
            vi: true,
            scrollbar: {
                ch: " "
            }
        });

        new adone.terminal.ui.widget.Element({
            parent: box,
            content: "hello",
            style: {
                bg: "green"
            },
            // border: 'line',
            height: 5,
            width: 20,
            top: 2,
            left: 15
        });

        new adone.terminal.ui.widget.Element({
            parent: box,
            content: "hello",
            style: {
                bg: "green"
            },
            border: "line",
            height: 5,
            width: 20,
            top: 25,
            left: -5
        });

        box.focus();

        screen.key("q", () => {
            screen.destroy();
            this.exit(0);
        });

        screen.render();
    }
});
