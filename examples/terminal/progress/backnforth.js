adone.application.run({
    main() {
        const bar = adone.terminal.progress({
            schema: " :title [:bar] :percent"
        });

        const backward = () => {
            bar.tick(-1, { title: "Backward" });
            if (bar.current === 0) {
                bar.destroy();
                this.exit(0);
            } else {
                setTimeout(backward, 10);
            }
        };

        const forward = () => {
            bar.tick(1, { title: "Forward " });
            if (bar.current > 60) {
                backward();
            } else {
                setTimeout(forward, 20);
            }
        };

        forward();
    }
});
