adone.app.run({
    main() {
        const screen = new adone.terminal.ui.Screen({
            smartCSR: true,
            dump: `${__dirname}/logs/video.log`,
            warnings: true
        });

        const video = new adone.terminal.ui.widget.Video({
            parent: screen,
            left: 1,
            top: 1,
            width: "90%",
            height: "90%",
            border: "line",
            file: process.argv[2]
        });

        video.focus();

        screen.key(["q", "C-q", "C-c"], () => {
            screen.destroy();
            this.exit(0);
        });

        screen.render();
    }
});
