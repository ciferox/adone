adone.application.run({
    main() {
        const screen = new adone.terminal.ui.Screen();
        const map = new adone.terminal.ui.widget.WorldMap({ label: "World Map" });

        screen.append(map);

        map.addMarker({ lon: "-79.0000", lat: "37.5000", color: "red", char: "X" });

        screen.key("q", () => {
            screen.destroy();
            this.exit(0);
        });

        screen.render();
    }
});
