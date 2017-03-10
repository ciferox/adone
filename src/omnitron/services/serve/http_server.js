class HTTPServe extends adone.web.Application {
    initialize() {
        this.address = "0.0.0.0";

        this.defineArguments({
            options: [
                { name: ["-r", "--root"], nargs: 1, help: "path to root directory", handler: (root) => {
                    if (!adone.std.path.isAbsolute(root)) {
                        this.root = adone.std.path.resolve(process.cwd(), root);
                    } else {
                        this.root = root;
                    }
                }},
                { name: ["-a", "--address"], nargs: 1, help: "address to use", default: "0.0.0.0" },
                { name: ["-p", "--port"], nargs: 1, help: "listening port", default: 8080 }
            ]
        });
    }

    main(args, opts) {
        this.use(adone.web.middleware.logger());
        this.use(adone.web.middleware.rewrite(/^(?!^\/[^\\]*\.(\w+)$).*$/, "/index.html"));
        this.use(adone.web.middleware.static({
            root: this.root,
            forceNotModifiedOnError: true
        }));

        return this.listen({
            port: opts.get("port"),
            address: opts.get("address")
        });
    }

    static run() {
        const app = new HTTPServe();
        return app.run();
    }
}

HTTPServe.run();
