adone.app.run({
    main() {
        const screen = new adone.terminal.ui.Screen();
        const gauge = new adone.terminal.ui.widget.Gauge({ label: "Progress" });

        screen.append(gauge);

        gauge.setPercent(25);

        screen.key(["escape", "q", "C-c"], (ch, key) => {
            screen.destroy();
            this.exit(0);
        });

        screen.render();
    }
});
