adone.app.run({
    main() {
        const bar = adone.runtime.term.progress({
            schema: " Progress [:bar] :percent :eta"
        });

        let i = 0;
        const steps = [0.1, 0.25, 0.6, 0.8, 0.4, 0.5, 0.6, 0.2, 0.8, 1.0];

        const next = () => {
            if (i < steps.length) {
                bar.update(steps[i++]);
                setTimeout(next, 500);
            }
        };
        next();
    }
});
