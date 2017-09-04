adone.application.run({
    main() {
        const screen = new adone.terminal.ui.Screen();

        const page1 = (screen) => {
            const grid = new adone.terminal.ui.layout.Grid({ rows: 4, cols: 4, screen });

            const line = grid.set(1, 0, 2, 2, adone.terminal.ui.widget.LineChart,
                {
                    style:
                    {
                        line: "yellow",
                        text: "green",
                        baseline: "black"
                    },
                    xLabelPadding: 3,
                    xPadding: 5,
                    label: "Stocks"
                });

            const map = grid.set(1, 2, 2, 2, adone.terminal.ui.widget.WorldMap, { label: "Servers Location" });

            const elem = new adone.terminal.ui.widget.Element({ content: "click right-left arrows or wait 3 seconds for the next layout in the carousel", top: "80%", left: "10%" });
            screen.append(elem);

            const lineData = {
                x: ["t1", "t2", "t3", "t4"],
                y: [5, 1, 7, 5]
            };

            line.setData([lineData]);
        };

        const page2 = (screen) => {
            const line = new adone.terminal.ui.widget.LineChart(
                {
                    width: 80,
                    height: 30,
                    left: 15,
                    top: 12,
                    xPadding: 5,
                    label: "Title"
                });

            const data = [{
                title: "us-east",
                x: ["t1", "t2", "t3", "t4"],
                y: [0, 0.0695652173913043, 0.11304347826087, 2],
                style: {
                    line: "red"
                }
            }
            ];

            screen.append(line);
            line.setData(data);

            const elem = new adone.terminal.ui.widget.Element({ content: "click right-left arrows or wait 3 seconds for the next layout in the carousel", top: "80%", left: "10%" });
            screen.append(elem);
        };

        screen.key(["escape", "q", "C-c"], (ch, key) => {
            return process.exit(0);
        });

        const carousel = new adone.terminal.ui.layout.Carousel([page1, page2], {
            screen,
            interval: 3000,
            controlKeys: true
        });
        carousel.start();
    }
});
