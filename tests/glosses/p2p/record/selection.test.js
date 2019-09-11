const {
    p2p: { record: { selection } }
} = adone;

const records = [Buffer.alloc(0), Buffer.from("hello")];

describe("p2p", "record", "selection", () => {
    describe("bestRecord", () => {
        it("throws no records given when no records received", () => {
            expect(
                () => selection.bestRecord({}, Buffer.from("/"), [])
            ).to.throw(
                /No records given/
            );
        });

        it("throws on missing selector in the record key", () => {
            expect(
                () => selection.bestRecord({}, Buffer.from("/"), records)
            ).to.throw(
                /Record key does not have a selector function/
            );
        });

        it("throws on unknown key prefix", () => {
            expect(
                () => selection.bestRecord({ world() { } }, Buffer.from("/hello/"), records)
            ).to.throw(
                /Unrecognized key prefix: hello/
            );
        });

        it("returns the index from the matching selector", () => {
            const selectors = {
                hello(k, recs) {
                    expect(k).to.be.eql(Buffer.from("/hello/world"));
                    expect(recs).to.be.eql(records);

                    return 1;
                }
            };

            expect(
                selection.bestRecord(selectors, Buffer.from("/hello/world"), records)
            ).to.equal(
                1
            );
        });
    });

    describe("selectors", () => {
        it("public key", () => {
            expect(
                selection.selectors.pk(Buffer.from("/hello/world"), records)
            ).to.equal(
                0
            );
        });
    });
});
