adone.app.run({
    main() {
        const screen = new adone.cli.ui.Screen();
        const grid = new adone.cli.ui.layout.Grid({ rows: 2, cols: 2, hideBorder: true, screen });
        grid.set(0, 0, 1, 2, adone.cli.ui.widget.GaugeList, {
            gaugeSpacing: 0,
            gaugeHeight: 1,
            gauges:
            [
                { showLabel: false, stack: [{ percent: 30, stroke: "green" }, { percent: 30, stroke: "magenta" }, { percent: 40, stroke: "cyan" }] },
                { showLabel: false, stack: [{ percent: 40, stroke: "yellow" }, { percent: 20, stroke: "magenta" }, { percent: 40, stroke: "green" }] },
                { showLabel: false, stack: [{ percent: 50, stroke: "red" }, { percent: 10, stroke: "magenta" }, { percent: 40, stroke: "cyan" }] }
            ]
        });

        screen.key(["escape", "q", "C-c"], (ch, key) => {
            screen.destroy();
            this.exit(0);
        });

        screen.render();
    }
});
