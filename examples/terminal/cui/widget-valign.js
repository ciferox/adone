adone.run({
    main() {
        const screen = new adone.cui.Screen({
            dump: `${__dirname}/logs/valign.log`,
            smartCSR: true,
            autoPadding: false,
            warnings: true
        });

        new adone.cui.widget.Element({
            parent: screen,
            top: "center",
            left: "center",
            width: "50%",
            height: 5,
            align: "center",
            valign: "middle",
            // valign: 'bottom',
            content: "Foobar.",
            border: "line"
        });

        screen.key("q", () => {
            screen.destroy();
            this.exit(0);
        });

        screen.render();
    }
});
