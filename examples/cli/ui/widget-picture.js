adone.app.run({
    main() {
        const screen = new adone.cli.ui.Screen();

        const pic = new adone.cli.ui.widget.Picture({
            file: adone.std.path.resolve(__dirname, "./data/flower.png"),
            cols: 95,
            onReady: () => screen.render()
        });

        screen.append(pic);

        screen.key("q", () => {
            screen.destroy();
            this.exit(0);
        });
        
        screen.render();
    }
});
