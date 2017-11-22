const { datetime } = adone;
const { tz } = datetime;

describe("datetime", "timezone", "add", () => {
    specify("adding", () => {
        // gE = 1000; 1E = 100; 2k = 140
        tz.add("SomeZone|TIM TAM IAM|60.u 50 60|012101|gE 1E 2k 1E 2k");

        const zone = tz.zone("SomeZone");

        assert.ok(zone, "Add a zone with tz.add(string) and get it back with tz.zone(name).");
        assert.equal(zone.name, "SomeZone", "Should unpack name onto .name property.");
        assert.deepEqual(zone.abbrs, ["TIM", "TAM", "IAM", "TAM", "TIM", "TAM"], "Should unpack abbrs onto .abbrs property.");
        assert.deepEqual(zone.offsets, [360.5, 300, 360, 300, 360.5, 300], "Should unpack offsets onto .offsets property.");
        assert.deepEqual(zone.untils, [
            1000 * 60000,
            1100 * 60000,
            1240 * 60000,
            1340 * 60000,
            1480 * 60000,
            Infinity
        ], "Should unpack untils onto .untils property.");
    });

    specify("addingMany", () => {
        tz.add([
            "AddingMany/Test1|QWE RTY|60 30|0101|-30 10 8",
            "AddingMany/Test2|QWE RTY|60 30|1010|-30 10 8",
            "AddingMany/Test3|QWE RTY|60 30|0101|-30 10 8"
        ]);
        tz.add("AddingMany/Test4|QWE RTY|60 30|0101|-30 10 8");

        assert.ok(tz.zone("AddingMany/Test1"), "Should be able to add items in an array of strings.");
        assert.ok(tz.zone("AddingMany/Test2"), "Should be able to add items in an array of strings.");
        assert.ok(tz.zone("AddingMany/Test3"), "Should be able to add items in an array of strings.");
        assert.ok(tz.zone("AddingMany/Test4"), "Should be able to add an item in a single string.");
    });

    specify("caching", () => {
        tz._zones.somezone = undefined;

        assert.equal(tz.zone("SomeZone"), null, "If moment.tz._zones does not have an zone, tz.zone(name) should return null.");

        // gE = 1000; 1E = 100; 2k = 140
        tz.add("SomeZone|TIM TAM IAM|60.u 50 60|012101|gE 1E 2k 1E 2k");

        assert.ok(tz.zone("SomeZone"), "Should be able to add and retrieve a zone.");
        assert.ok(tz._zones.somezone, "The cache should be updated when adding a zone.");
    });

    specify("caseInsensitive", () => {
        tz.add("CASE_INSENSITIVE|ASD|60|0|234");

        assert.ok(tz.zone("case_insensitive"), "getting zones should not be case sensitive.");
        assert.ok(tz.zone("Case_Insensitive"), "getting zones should not be case sensitive.");
        assert.ok(tz.zone("case/insensitive"), "getting zones should not differentiate between _ and /.");

        tz.add("Case/Insens_Itive2|ASD|60|0|234");

        assert.ok(tz.zone("CASE_insens_itive2"), "getting zones should not be case sensitive.");
        assert.ok(tz.zone("case_insens_itive2"), "getting zones should not be case sensitive.");
        assert.ok(tz.zone("Case_Insens_itive2"), "getting zones should not be case sensitive.");
        assert.ok(tz.zone("case/insens/itive2"), "getting zones should not differentiate between _ and /.");
    });
});
