adone.application.run({
    main() {
        const screen = new adone.cui.Screen();
        const bar = new adone.cui.widget.BarChart({
            label: "Server Utilization (%)",
            barWidth: 4,
            barSpacing: 6,
            xOffset: 0,
            maxHeight: 9,
            height: "40%"
        });

        screen.append(bar);

        bar.setData({
            titles: ["bar1", "bar2"],
            data: [5, 10]
        });

        screen.key("q", () => {
            return screen.destroy();
        });
        
        screen.render();
    }
});
