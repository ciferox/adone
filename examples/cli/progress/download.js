adone.app.run({
    main() {
        const contentLength = 128 * 1024;

        const bar = adone.cli.progress({
            schema: " Downloading [:bar] :percent :eta",
            width: 80,
            total: contentLength
        });

        const next = () => {
            if (contentLength) {
                const chunk = Math.round(Math.random() * 10 * 1024);

                bar.tick(chunk);

                if (!bar.completed) {
                    setTimeout(next, Math.random() * 1000);
                } else {
                    this.exit(0);
                }
            }
        };

        next();
    }
});
