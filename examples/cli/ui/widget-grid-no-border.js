adone.app.run({
    main() {
        const screen = new adone.cli.ui.Screen();
        const grid = new adone.cli.ui.layout.Grid({ rows: 12, cols: 12, hideBorder: true, screen });
        grid.set(0, 0, 4, 4, adone.cli.ui.widget.WorldMap, {});
        grid.set(4, 4, 4, 4, adone.cli.ui.widget.Element, {
            content: "My Element"
        });

        screen.key(["escape", "q", "C-c"], (ch, key) => {
            screen.destroy();
            this.exit(0);
        });

        screen.render();
    }
});
