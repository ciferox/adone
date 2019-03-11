adone.app.run({
    main() {
        const screen = new adone.cli.ui.Screen();
        const log = new adone.cli.ui.widget.ExLog(
            {
                fg: "green",
                label: "Server Log",
                height: "20%",
                tags: true,
                border: { type: "line", fg: "cyan" }
            });

        screen.append(log);

        let i = 0;
        setInterval(() => {
            log.log(`new {red-fg}log{/red-fg} line ${i++}`);
        }, 500);

        screen.key("q", () => {
            screen.destroy();
            this.exit(0);
        });

        screen.render();
    }
});
