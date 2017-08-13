adone.application.run({
    main() {
        const screen = new adone.cui.Screen();

        const pic = new adone.cui.widget.Picture({
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
