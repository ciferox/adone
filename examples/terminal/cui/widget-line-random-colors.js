adone.application.run({
    main() {
        const randomColor = () => {
            return [Math.random() * 255, Math.random() * 255, Math.random() * 255];
        };

        const screen = new adone.cui.Screen();
        const line = new adone.cui.widget.LineChart({
            width: 80,
            height: 30,
            left: 15,
            top: 12,
            xPadding: 5,
            minY: 30,
            maxY: 90,
            label: "Title",
            style: { line: randomColor(), text: randomColor(), baseline: randomColor() }
        });

        const data = [{
            title: "us-east",
            x: ["t1", "t2", "t3", "t4"],
            y: [50, 88, 72, 91],
            style: {
                line: "red"
            }
        }];

        screen.append(line); //must append before setting data
        line.setData(data);

        screen.key(["escape", "q", "C-c"], (ch, key) => {
            screen.destroy();
            return this.exit(0);
        });

        screen.render();
    }
});
