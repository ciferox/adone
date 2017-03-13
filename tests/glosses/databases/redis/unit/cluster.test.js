describe("glosses", "databases", "redis", "unit", "cluster", () => {
    const { database: { redis: { Cluster } } } = adone;

    beforeEach(() => {
        stub(Cluster.prototype, "connect").callsFake(() => {
            return Promise.resolve();
        });
    });

    afterEach(() => {
        Cluster.prototype.connect.restore();
    });

    it("throws when scaleReads is invalid", () => {
        expect(() => {
            new Cluster([{}], { scaleReads: "invalid" });
        }).to.throw(/Invalid option scaleReads/);
    });

    describe("#nodes()", () => {
        it("throws when role is invalid", () => {
            const cluster = new Cluster([{}]);
            expect(() => {
                cluster.nodes("invalid");
            }).to.throw(/Invalid role/);
        });
    });
});
