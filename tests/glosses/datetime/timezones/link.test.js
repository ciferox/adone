describe.skip("datetime", "timezone", "link", () => { // TODO: it breaks other tests
    const { datetime: { tz } } = adone;

    let tempLinks;
    let tempZones;
    let tempNames;

    const moveProperties = (a, b) => {
        let key;
        for (key in a) {
            if (a.hasOwnProperty(key)) {
                b[key] = a[key];
                delete a[key];
            }
        }

    };

    beforeEach(() => {
        tempLinks = {};
        tempZones = {};
        tempNames = {};
        moveProperties(tz._links, tempLinks);
        moveProperties(tz._zones, tempZones);
        moveProperties(tz._names, tempNames);
    });

    afterEach(() => {
        moveProperties(tz._links, {});
        moveProperties(tz._zones, {});
        moveProperties(tz._names, {});
        moveProperties(tempLinks, tz._links);
        moveProperties(tempZones, tz._zones);
        moveProperties(tempNames, tz._names);
    });

    specify("linking", () => {
        assert.ok(!tz.zone("Zone1"), "Zones should have been reset.");
        assert.ok(!tz.zone("Alias1"), "Links should have been reset.");
        assert.ok(!tz.zone("Alias2"), "Links should have been reset.");
        assert.ok(!tz.zone("Alias3"), "Links should have been reset.");
        assert.ok(!tz._zones.zone1, "Zones should have been reset.");
        assert.ok(!tz._links.alias1, "Links should have been reset.");
        assert.ok(!tz._links.alias2, "Links should have been reset.");
        assert.ok(!tz._links.alias3, "Links should have been reset.");

        tz.add("Zone1|ASDF|0|0|0");

        tz.link("Alias1|Zone1");
        tz.link(["Alias2|Zone1", "Alias3|Zone1"]);

        assert.ok(tz.zone("Zone1"), "Should be able to add a zone.");
        assert.ok(tz.zone("Alias1"), "Should be able to add an alias with 'Alias|Zone' format.");
        assert.ok(tz.zone("Alias2"), "Should be able to add an alias with ['Alias|Zone'] format.");
        assert.ok(tz.zone("Alias3"), "Should be able to add an alias with ['Alias|Zone'] format");

        assert.equal(tz.zone("Zone1").name, "Zone1", "Should get the right zone.");
        assert.equal(tz.zone("Alias1").name, "Alias1", "Should get the right zone from an alias.");
        assert.equal(tz.zone("Alias2").name, "Alias2", "Should get the right zone from an alias.");
        assert.equal(tz.zone("Alias3").name, "Alias3", "Should get the right zone from an alias.");
    });

    specify("reversed", () => {
        assert.ok(!tz.zone("Zone1"), "Zones should have been reset.");
        assert.ok(!tz.zone("Alias1"), "Links should have been reset.");
        assert.ok(!tz.zone("Alias2"), "Links should have been reset.");
        assert.ok(!tz.zone("Alias3"), "Links should have been reset.");
        assert.ok(!tz._zones.zone1, "Zones should have been reset.");
        assert.ok(!tz._links.alias1, "Links should have been reset.");
        assert.ok(!tz._links.alias2, "Links should have been reset.");
        assert.ok(!tz._links.alias3, "Links should have been reset.");

        tz.add("Zone1|ASDF|0|0|0");

        tz.link("Zone1|Alias1");
        tz.link(["Zone1|Alias2", "Zone1|Alias3"]);

        assert.ok(tz.zone("Zone1"), "Should be able to add a zone.");
        assert.ok(tz.zone("Alias1"), "Should be able to add an alias with 'Zone|Alias' format.");
        assert.ok(tz.zone("Alias2"), "Should be able to add an alias with ['Zone|Alias'] format.");
        assert.ok(tz.zone("Alias3"), "Should be able to add an alias with ['Zone|Alias'] format");

        assert.equal(tz.zone("Zone1").name, "Zone1", "Should get the right zone.");
        assert.equal(tz.zone("Alias1").name, "Alias1", "Should get the right zone from an alias.");
        assert.equal(tz.zone("Alias2").name, "Alias2", "Should get the right zone from an alias.");
        assert.equal(tz.zone("Alias3").name, "Alias3", "Should get the right zone from an alias.");
    });

    specify("out of order", () => {
        assert.ok(!tz.zone("Zone1"), "Zones should have been reset.");
        assert.ok(!tz.zone("Alias1"), "Links should have been reset.");
        assert.ok(!tz.zone("Alias2"), "Links should have been reset.");
        assert.ok(!tz.zone("Alias3"), "Links should have been reset.");

        tz.link("Alias1|Zone1");
        tz.add("Zone1|ASDF|0|0|0");

        assert.ok(tz.zone("Zone1"), "Should be able to add a zone.");
        assert.ok(tz.zone("Alias1"), "Should be able to add an alias before adding the zone.");

        assert.equal(tz.zone("Zone1").name, "Zone1", "Should get the right zone.");
        assert.equal(tz.zone("Alias1").name, "Alias1", "Should get the right zone from an alias.");

        tz.link("Alias2|Zone2");
        assert.ok(!tz.zone("Alias2"), "Aliases without zones should be null.");
    });

    specify("names of aliases", () => {
        assert.ok(!tz.zone("Zone1"), "Zones should have been reset.");
        assert.ok(!tz.zone("Alias1"), "Links should have been reset.");
        assert.ok(!tz.zone("Alias2"), "Links should have been reset.");
        assert.ok(!tz.zone("Alias3"), "Links should have been reset.");

        tz.link("Alias1|Zone1");
        tz.add("Zone1|ASDF|0|0|0");
        assert.deepEqual(tz.names(), ["Alias1", "Zone1"], "Should be able to get the names of aliased zones.");

        tz.link("Alias2|Zone1");
        assert.deepEqual(tz.names(), ["Alias1", "Alias2", "Zone1"], "Should be able to get the names of aliased zones.");

        tz.link("Alias3|Zone2");
        assert.deepEqual(tz.names(), ["Alias1", "Alias2", "Zone1"], "Should be able to get the names of aliased zones.");

        tz.link("Alias3|Zone1");
        assert.deepEqual(tz.names(), ["Alias1", "Alias2", "Alias3", "Zone1"], "Should be able to get the names of aliased zones.");
    });


    specify("zone and alias not loaded", () => {
        assert.ok(!tz.zone("Zone1"), "Zones should have been reset.");
        assert.ok(!tz.zone("Alias1"), "Links should have been reset.");

        tz.link("Alias1|Zone1");

        assert.ok(!tz.zone("Zone1"), "Zone should not exist if it wasn't loaded.");
        assert.ok(!tz.zone("Alias1"), "Link should not exist if its zone wasn't loaded.");
    });
});
