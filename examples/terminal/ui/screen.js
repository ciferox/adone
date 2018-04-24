adone.app.run({
    main() {
        const screen = new adone.terminal.ui.Screen({
            dump: `${__dirname}/logs/widget.log`,
            title: "terminal screen",
            resizeTimeout: 300,
            // dockBorders: true,
            // cursor: {
            //     artificial: true,
            //     shape: "line",
            //     blink: true,
            //     color: null
            // },
            //debug: true,
            warnings: true
        });

        screen.render();
    }
});
