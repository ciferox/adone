adone.application.run({
    main() {
        const screen = new adone.terminal.ui.Screen({
            dump: `${__dirname}/logs/layout.log`,
            smartCSR: true,
            autoPadding: true,
            warnings: true
        });

        const layout = new adone.terminal.ui.widget.Layout({
            parent: screen,
            top: "center",
            left: "center",
            width: "50%",
            height: "50%",
            border: "line",
            layout: process.argv[2] === "grid" ? "grid" : "inline",
            style: {
                bg: "red",
                border: {
                    fg: "blue"
                }
            }
        });

        new adone.terminal.ui.widget.Element({
            parent: layout,
            top: "center",
            left: "center",
            width: 20,
            height: 10,
            border: "line",
            content: "1"
        });

        new adone.terminal.ui.widget.Element({
            parent: layout,
            top: 0,
            left: 0,
            width: 10,
            height: 5,
            border: "line",
            content: "2"
        });

        new adone.terminal.ui.widget.Element({
            parent: layout,
            top: 0,
            left: 0,
            width: 10,
            height: 5,
            border: "line",
            content: "3"
        });

        new adone.terminal.ui.widget.Element({
            parent: layout,
            top: 0,
            left: 0,
            width: 10,
            height: 5,
            border: "line",
            content: "4"
        });

        new adone.terminal.ui.widget.Element({
            parent: layout,
            top: 0,
            left: 0,
            width: 10,
            height: 5,
            border: "line",
            content: "5"
        });

        new adone.terminal.ui.widget.Element({
            parent: layout,
            top: 0,
            left: 0,
            width: 10,
            height: 5,
            border: "line",
            content: "6"
        });

        new adone.terminal.ui.widget.Element({
            parent: layout,
            top: 0,
            left: 0,
            width: 10,
            height: 5,
            border: "line",
            content: "7"
        });

        new adone.terminal.ui.widget.Element({
            parent: layout,
            top: "center",
            left: "center",
            width: 20,
            height: 10,
            border: "line",
            content: "8"
        });

        new adone.terminal.ui.widget.Element({
            parent: layout,
            top: 0,
            left: 0,
            width: 10,
            height: 5,
            border: "line",
            content: "9"
        });

        new adone.terminal.ui.widget.Element({
            parent: layout,
            top: "center",
            left: "center",
            width: 20,
            height: 10,
            border: "line",
            content: "10"
        });

        new adone.terminal.ui.widget.Element({
            parent: layout,
            top: 0,
            left: 0,
            width: 10,
            height: 5,
            border: "line",
            content: "11"
        });

        new adone.terminal.ui.widget.Element({
            parent: layout,
            top: "center",
            left: "center",
            width: 20,
            height: 10,
            border: "line",
            content: "12"
        });

        if (process.argv[2] !== "grid") {
            for (let i = 0; i < 10; i++) {
                new adone.terminal.ui.widget.Element({
                    parent: layout,
                    // width: i % 2 === 0 ? 10 : 20,
                    // height: i % 2 === 0 ? 5 : 10,
                    width: Math.random() > 0.5 ? 10 : 20,
                    height: Math.random() > 0.5 ? 5 : 10,
                    border: "line",
                    content: String(i + 1 + 12)
                });
            }
        }

        screen.key("q", () => {
            return screen.destroy();
        });

        screen.render();
    }
});
