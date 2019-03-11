adone.app.run({
    main() {
        const screen = new adone.cli.ui.Screen({
            dump: `${__dirname}/logs/dock.log`,
            smartCSR: true,
            dockBorders: true,
            warnings: true
        });

        new adone.cli.ui.widget.Element({
            parent: screen,
            left: -1,
            top: -1,
            width: "50%+1",
            height: "50%+1",
            border: "line",
            content: "Foo"
        });

        new adone.cli.ui.widget.Element({
            parent: screen,
            left: "50%-1",
            top: -1,
            width: "50%+3",
            height: "50%+1",
            content: "Bar",
            border: "line"
        });

        new adone.cli.ui.widget.Element({
            parent: screen,
            left: -1,
            top: "50%-1",
            width: "50%+1",
            height: "50%+3",
            border: "line",
            content: "Foo"
        });

        new adone.cli.ui.widget.ListTable({
            parent: screen,
            left: "50%-1",
            top: "50%-1",
            width: "50%+3",
            height: "50%+3",
            border: "line",
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
        }).focus();

        // blessed.box({
        //   parent: screen,
        //   left: '50%-1',
        //   top: '50%-1',
        //   width: '50%+1',
        //   height: '50%+1',
        //   border: 'line',
        //   content: 'Bar'
        // });

        screen.key("q", () => {
            return screen.destroy();
        });

        screen.render();
    }
});
