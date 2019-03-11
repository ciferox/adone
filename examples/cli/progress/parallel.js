adone.app.run({
    main() {
        const bar1 = adone.cli.progress({
            schema: "progress: \n[:bar]",
            current: 10
        });

        //var bar2 = adone.cli.progress();
        //bar1.tick()

        const iv = setInterval(() => {
            bar1.tick(1);
            //bar2.tick();
            console.log(new Date());

            if (bar1.current === 110 || bar1.completed) {
                clearInterval(iv);

                setInterval(() => {
                    console.log(new Date());
                }, 100);
            }
        }, 100);
    }
});
