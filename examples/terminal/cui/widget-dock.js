adone.run({
    main() {
        const screen = new adone.cui.Screen({
            dump: `${__dirname}/logs/dock.log`,
            smartCSR: true,
            dockBorders: true,
            warnings: true
        });

        new adone.cui.widget.Element({
            parent: screen,
            left: 0,
            top: 0,
            width: "50%",
            height: "50%",
            border: {
                type: "line",
                left: false,
                top: false,
                right: true,
                bottom: false
            },
            // border: 'line',
            content: "Foo"
        });

        new adone.cui.widget.Element({
            parent: screen,
            left: "50%-1",
            top: 0,
            width: "50%+1",
            height: "50%",
            border: {
                type: "line",
                left: true,
                top: false,
                right: false,
                bottom: false
            },
            // border: 'line',
            content: "Bar"
        });

        new adone.cui.widget.Element({
            parent: screen,
            left: 0,
            top: "50%-1",
            width: "50%",
            height: "50%+1",
            border: {
                type: "line",
                left: false,
                top: true,
                right: false,
                bottom: false
            },
            border: "line",
            content: "Foo"
        });

        let bottomright = new adone.cui.widget.ListTable({
            parent: screen,
            left: "50%-1",
            top: "50%-1",
            width: "50%+1",
            height: "50%+1",
            border: {
                type: "line",
                left: true,
                top: true,
                right: false,
                bottom: false
            },
            // border: 'line',
            align: "center",
            tags: true,
            keys: true,
            vi: true,
            mouse: true,
            style: {
                header: {
                    fg: "blue",
                    bold: true
                },
                cell: {
                    fg: "magenta",
                    selected: {
                        bg: "blue"
                    }
                }
            },
            data: [
                ["Animals", "Foods", "Times", "Numbers"],
                ["Elephant", "Apple", "1:00am", "One"],
                ["Bird", "Orange", "2:15pm", "Two"],
                ["T-Rex", "Taco", "8:45am", "Three"],
                ["Mouse", "Cheese", "9:05am", "Four"]
            ]
        });

        bottomright.focus();

        new adone.cui.widget.Element({
            parent: screen,
            left: "center",
            top: "center",
            width: "50%",
            height: "50%",
            draggable: true,
            border: {
                type: "line",
                left: false,
                top: true,
                right: true,
                bottom: true
            },
            content: "Drag Me"
        });

        screen.key("q", () => {
            return screen.destroy();
        });

        screen.render();
    }
});
