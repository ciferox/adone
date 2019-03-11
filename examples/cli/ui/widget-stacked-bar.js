adone.app.run({
    main() {
        const screen = new adone.cli.ui.Screen();
        const bar = new adone.cli.ui.widget.StackedBarChart(
            {
                label: "Server Utilization (%)",
                barWidth: 4,
                barSpacing: 6,
                xOffset: 0,
                //, maxValue: 15,
                height: "40%",
                width: "50%",
                barBgColor: ["red", "blue", "green"]
            });

        screen.append(bar);

        bar.setData({
            barCategory: ["Q1", "Q2", "Q3", "Q4"],
            stackedCategory: ["US", "EU", "AP"],
            data:
            [
                [7, 7, 5],
                [8, 2, 0],
                [0, 0, 0],
                [2, 3, 2]
            ]
        });

        screen.key("q", () => {
            screen.destroy();
            this.exit();
        });

        screen.render();
    }
});
