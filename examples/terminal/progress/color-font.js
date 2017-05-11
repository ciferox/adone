adone.run({
    main() {
        const bar = adone.terminal.progress({
            total: 100
        });

        const tokens = "{underline}{magenta-fg}:current{/}/{italic}{green-fg}:total{/} {bold}{yellow-fg}:percent{/} {italic}{blue-fg}:elapsed{/} {italic}{cyan-fg}:eta{/}";

        const iv = setInterval(() => {
            let completedColor = "";
            const current = bar.current;
            if (current < 20) {
                completedColor = "red";
            } else if (current < 40) {
                completedColor = "magenta";
            } else if (current < 60) {
                completedColor = "yellow";
            } else if (current < 80) {
                completedColor = "blue";
            } else if (current < 100) {
                completedColor = "green";
            }

            const schema = ` {white-fg}[{/}{${completedColor}-fg}:filled{/}{gray-fg}:blank{/}{white-fg}] {/}${tokens}`;

            bar.setSchema(schema);
            bar.tick();

            if (bar.completed) {
                clearInterval(iv);
                this.exit(0);
            }
        }, 30);
    }
});
