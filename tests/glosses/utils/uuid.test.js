describe("glosses", "util", "uuid", () => {
    const { util: { uuid } } = adone;

    const TIME = 1321644961388; // 2011-11-18 11:36:01.388-08:00

    const compare = (name, ids) => {
        it(name, () => {
            ids = ids.map((x) => x.split("-").reverse().join("-")).sort();
            const sorted = ([].concat(ids)).sort();

            assert(sorted.toString() === ids.toString(), `${name} have expected order`);
        });
    };



    compare("uuids with current time", [
        uuid.v1(),
        uuid.v1(),
        uuid.v1(),
        uuid.v1(),
        uuid.v1()
    ]);

    compare("uuids with time option", [
        uuid.v1({ msecs: TIME - 10 * 3600 * 1000 }),
        uuid.v1({ msecs: TIME - 1 }),
        uuid.v1({ msecs: TIME }),
        uuid.v1({ msecs: TIME + 1 }),
        uuid.v1({ msecs: TIME + 28 * 24 * 3600 * 1000 })
    ]);

    it("msec", () => {
        assert(
            uuid.v1({ msecs: TIME }) !== uuid.v1({ msecs: TIME }),
            "IDs created at same msec are different"
        );
    });

    it("exception thrown when > 10k ids created in 1ms", () => {
        let thrown = false;
        try {
            uuid.v1({ msecs: TIME, nsecs: 10000 });
        } catch (e) {
            thrown = true;
        }
        assert(thrown, "Exception thrown when > 10K ids created in 1 ms");
    });

    it("clock regression by msec", () => {
        const uidt = uuid.v1({ msecs: TIME });
        const uidtb = uuid.v1({ msecs: TIME - 1 });
        assert(
            parseInt(uidtb.split("-")[3], 16) - parseInt(uidt.split("-")[3], 16) === 1,
            "Clock regression by msec increments the clockseq"
        );
    });

    it("clock regression by nsec", () => {
        const uidtn = uuid.v1({ msecs: TIME, nsecs: 10 });
        const uidtnb = uuid.v1({ msecs: TIME, nsecs: 9 });
        assert(
            parseInt(uidtnb.split("-")[3], 16) - parseInt(uidtn.split("-")[3], 16) === 1,
            "Clock regression by nsec increments the clockseq"
        );
    });

    it("explicit options product expected id", () => {
        const id = uuid.v1({
            msecs: 1321651533573,
            nsecs: 5432,
            clockseq: 0x385c,
            node: [0x61, 0xcd, 0x3c, 0xbb, 0x32, 0x10]
        });
        assert(id === "d9428888-122b-11e1-b85c-61cd3cbb3210", "Explicit options produce expected id");
    });

    it("ids spanning 1ms boundary are 100ns apart", () => {
        const u0 = uuid.v1({ msecs: TIME, nsecs: 9999 });
        const u1 = uuid.v1({ msecs: TIME + 1, nsecs: 0 });

        const before = u0.split("-")[0];
        const after = u1.split("-")[0];
        const dt = parseInt(after, 16) - parseInt(before, 16);
        assert(dt === 1, "Ids spanning 1ms boundary are 100ns apart");
    });

    it("parse/unparse", () => {
        const id = "00112233445566778899aabbccddeeff";
        assert(uuid.unparse(uuid.parse(id.substr(0, 10))) === "00112233-4400-0000-0000-000000000000", "Short parse");
        assert(uuid.unparse(uuid.parse(`(this is the uuid -> ${id}${id}`)) === "00112233-4455-6677-8899-aabbccddeeff", "Dirty parse");
    });
});
