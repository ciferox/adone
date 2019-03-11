adone.app.run({
    main() {
        const screen = new adone.cli.ui.Screen();

        const spark = new adone.cli.ui.widget.SparkLine({
            label: "Sparkline",
            tags: true,
            border: { type: "line", fg: "cyan" },
            width: "50%",
            height: "50%",
            style: { fg: "blue" }
        });

        screen.append(spark);

        spark.setData(
            ["Sparkline1", "Sparkline2"],
            [
                [10, 20, 30, 20, 50, 70, 60, 30, 35, 38],
                [40, 10, 40, 50, 20, 30, 20, 20, 19, 40]
            ]
        );

        screen.key("q", () => {
            screen.destroy();
            this.exit();
        });

        screen.render();
    }
});
