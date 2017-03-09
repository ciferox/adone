describe("glosses", "templating", "nunjucks", "loader", () => {
    const { std: { path }, templating: { nunjucks: { Environment } } } = adone;
    const templatesPath = path.resolve(__dirname, "templates");

    it("should allow a simple loader to be created", () => {
        // From Docs: http://mozilla.github.io/nunjucks/api.html#writing-a-loader
        // We should be able to create a loader that only exposes getSource
        function MyLoader() {
            // configuration
        }

        MyLoader.prototype.getSource = function () {
            return {
                src: "Hello World",
                path: "/tmp/somewhere"
            };
        };

        const env = new Environment(new MyLoader(templatesPath));
        const parent = env.getTemplate("fake.njk");
        expect(parent.render()).to.be.equal("Hello World");
    });

    it("should catch loader error", (done) => {
        // From Docs: http://mozilla.github.io/nunjucks/api.html#writing-a-loader
        // We should be able to create a loader that only exposes getSource
        function MyLoader() {
            // configuration
            this.async = true;
        }

        MyLoader.prototype.getSource = function (s, cb) {
            setTimeout(() => {
                cb(new Error("test"));
            }, 1);
        };

        const env = new Environment(new MyLoader(templatesPath));
        env.getTemplate("fake.njk", (err, parent) => {
            expect(err).to.be.a("Error");
            expect(parent).to.be.undefined;

            done();
        });

    });
});
