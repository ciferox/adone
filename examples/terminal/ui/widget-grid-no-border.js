adone.app.run({
    main() {
        const screen = new adone.terminal.ui.Screen();
        const grid = new adone.terminal.ui.layout.Grid({ rows: 12, cols: 12, hideBorder: true, screen });
        grid.set(0, 0, 4, 4, adone.terminal.ui.widget.WorldMap, {});
        grid.set(4, 4, 4, 4, adone.terminal.ui.widget.Element, {
            content: "My Element"
        });

        screen.key(["escape", "q", "C-c"], (ch, key) => {
            screen.destroy();
            this.exit(0);
        });

        screen.render();
    }
});
