adone.run({
    main() {
        const screen = new adone.cui.Screen();
        const grid = new adone.cui.GridLayout({ rows: 12, cols: 12, hideBorder: true, screen });
        grid.set(0, 0, 4, 4, adone.cui.widget.Map, {});
        grid.set(4, 4, 4, 4, adone.cui.widget.Element, {
            content: "My Element"
        });

        screen.key(["escape", "q", "C-c"], (ch, key) => {
            screen.destroy();
            this.exit(0);
        });

        screen.render();
    }
});
