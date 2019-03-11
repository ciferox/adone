adone.app.run({
    main() {
        const screen = new adone.cli.ui.Screen();
        const grid = new adone.cli.ui.layout.Grid({ rows: 12, cols: 12, screen });
        // const map = grid.set(0, 0, 12, 12, adone.cli.ui.widget.WorldMap, { label: "World Map" });
        grid.set(0, 0, 12, 12, adone.cli.ui.widget.Element, { content: "1" });
        grid.set(0, 4, 4, 4, adone.cli.ui.widget.Element, { content: "2" });
        grid.set(0, 8, 4, 4, adone.cli.ui.widget.Element, { content: "3" });
        grid.set(4, 0, 4, 6, adone.cli.ui.widget.Element, { content: "4" });
        grid.set(4, 6, 4, 6, adone.cli.ui.widget.Element, { content: "5" });
        grid.set(8, 0, 4, 12, adone.cli.ui.widget.Element, { content: "6" });

        screen.key(["q"], () => {
            screen.destroy();
        });

        screen.render();
    }
});
