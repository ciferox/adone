adone.application.run({
    main() {
        const screen = new adone.terminal.ui.Screen({
            dump: `${__dirname}/logs/play.log`,
            smartCSR: true,
            warnings: true
        });

        const frames = require(`${__dirname}/data/frames.json`);

        const timer = setInterval(() => {
            if (!frames.length) {
                clearInterval(timer);
                return screen.destroy();
            }
            process.stdout.write(frames.shift());
        }, 100);

        screen.key("q", () => {
            screen.destroy();
            this.exit(0);
        });
    }
});
