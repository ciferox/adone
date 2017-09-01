const { is } = adone;
let vaultIndex = 0;

describe("Vault", () => {
    let vault;
    let location;

    const openVault = (loc, options = {}) => {
        location = loc || adone.std.path.join(__dirname, `_vault_${vaultIndex++}`);
        vault = new adone.vault.Vault(adone.vendor.lodash.defaults(options, {
            location
        }));
        return vault.open();
    };

    // beforeEach(() => {
    //     vault = new adone.vault.Vault();
    // });

    afterEach(async () => {
        await vault.close();
        let list = await adone.fs.readdir(__dirname);
        list = list.filter((f) => (/^_vault_/).test(f));

        for (const f of list) {
            await adone.fs.rm(adone.std.path.join(__dirname, f));
        }
    });

    it("create/open vault", async () => {
        await openVault();
        assert.equal(vault.location(), location);
        assert.lengthOf(vault.vids, 0);
        assert.lengthOf(vault.tids, 0);
        assert.equal(vault.nextTagId, 1);
        assert.equal(vault.nextValuableId, 1);
        await vault.close();

        await openVault(location);
        assert.equal(vault.location(), location);
        assert.lengthOf(vault.vids, 0);
        assert.lengthOf(vault.tids, 0);
        assert.equal(vault.nextTagId, 1);
        assert.equal(vault.nextValuableId, 1);
    });

    it("create/get valuable", async () => {
        await openVault();
        assert.equal(vault.location(), location);
        assert.lengthOf(vault.vids, 0);
        assert.equal(vault.nextValuableId, 1);
        let valuable = await vault.create("v1");
        assert.equal(valuable.id, 1);
        assert.equal(valuable.name(), "v1");
        assert.lengthOf(valuable.tags(), 0);
        await vault.close();

        await openVault(location);
        assert.equal(vault.location(), location);
        assert.lengthOf(vault.vids, 1);
        assert.equal(vault.nextValuableId, 2);
        assert.isTrue(vault.has("v1"));
        valuable = await vault.get("v1");
        assert.equal(valuable.id, 1);
        assert.equal(valuable.name(), "v1");
        assert.lengthOf(valuable.tags(), 0);
    });

    it("vault notes", async () => {
        const NOTES = "some description!";
        await openVault();
        let notes = await vault.getNotes();
        assert.equal(notes, "");

        await vault.setNotes(NOTES);

        notes = await vault.getNotes();
        assert.equal(notes, NOTES);
    });

    it("create/get valuable with tags", async () => {
        await openVault();
        assert.equal(vault.location(), location);
        assert.lengthOf(vault.vids, 0);
        assert.equal(vault.nextValuableId, 1);
        const tags = ["tag1", "tag3"];
        const normTags = adone.vault.normalizeTags(tags);
        let valuable = await vault.create("v1", tags);
        assert.equal(valuable.id, 1);
        assert.equal(valuable.name(), "v1");
        assert.sameDeepMembers(valuable.tags(), normTags);
        await vault.close();

        await openVault(location);
        assert.equal(vault.location(), location);
        assert.lengthOf(vault.vids, 1);
        assert.equal(vault.nextValuableId, 2);
        assert.isTrue(vault.has("v1"));
        valuable = await vault.get("v1");
        assert.equal(valuable.id, 1);
        assert.equal(valuable.name(), "v1");
        assert.sameDeepMembers(valuable.tags(), normTags);
    });

    it("create/get multiple valuables", async () => {
        await openVault();
        assert.equal(vault.location(), location);
        const tags1 = ["tag1", "tag3"];
        const normTags1 = adone.vault.normalizeTags(tags1);
        const tags2 = ["tag2", "tag3"];
        const normTags2 = adone.vault.normalizeTags(tags2);
        let valuable1 = await vault.create("v1", tags1);
        assert.equal(valuable1.id, 1);
        assert.equal(valuable1.name(), "v1");
        assert.sameDeepMembers(valuable1.tags(), normTags1);

        let valuable2 = await vault.create("v2", tags2);
        assert.equal(valuable2.id, 2);
        assert.equal(valuable2.name(), "v2");
        assert.sameDeepMembers(valuable2.tags(), normTags2);
        assert.lengthOf(vault.tids, 3);
        await vault.close();

        await openVault(location);
        assert.lengthOf(vault.vids, 2);
        assert.equal(vault.nextValuableId, 3);
        assert.isTrue(vault.has("v1"));
        assert.isTrue(vault.has("v2"));
        valuable1 = await vault.get("v1");
        assert.equal(valuable1.id, 1);
        assert.equal(valuable1.name(), "v1");
        assert.sameDeepMembers(valuable1.tags(), normTags1);
        valuable2 = await vault.get("v2");
        assert.equal(valuable2.id, 2);
        assert.equal(valuable2.name(), "v2");
        assert.sameDeepMembers(valuable2.tags(), normTags2);
    });

    it("valuable set/get/delete", async () => {
        await openVault();
        let val = await vault.create("val");
        await val.set("a b c", "some string value");
        await val.set("num", 17);
        const buf = Buffer.from("01101010101010101010100101010101010101010101");
        await val.set("buf", buf);
        assert.equal(await val.get("a b c"), "some string value");
        assert.equal(await val.get("num"), 17);
        assert.deepEqual(await val.get("buf"), buf);
        await vault.close();

        await openVault(location);
        assert.lengthOf(vault.vids, 1);
        val = await vault.get("val");
        assert.equal(await val.get("a b c"), "some string value");
        assert.equal(await val.get("num"), 17);
        assert.deepEqual(await val.get("buf"), buf);
        await val.delete("num");
        let err = await assert.throws(async () => val.get("num"));
        assert.instanceOf(err, adone.x.NotExists);
        await vault.close();

        await openVault(location);
        val = await vault.get("val");
        err = await assert.throws(async () => val.delete("num"));
        assert.instanceOf(err, adone.x.NotExists);
    });

    it("valuabe set/get null or undefined value", async () => {
        await openVault();
        const val = await vault.create("val");
        await val.set("undefined", undefined);
        expect(await val.get("undefined")).to.be.undefined;
        await val.set("null", null);
        expect(await val.get("null")).to.be.null;
    });

    it("valuable add/delete simple tags", async () => {
        await openVault();
        const tags = ["tag1", "tag3"];
        let val = await vault.create("val", tags);
        await val.set("num", 17);
        const allNormTags = adone.vault.normalizeTags(["tag1", "tag2", "tag3", "tag4"]);
        assert.equal(await val.get("num"), 17);
        assert.isNumber(await val.addTag("tag2"));
        assert.isNull(await val.addTag("tag3"));
        assert.isNumber(await val.addTag("tag4"));
        assert.sameDeepMembers(await val.tags(), allNormTags);
        assert.sameDeepMembers(await vault.tags(), allNormTags);
        assert.isTrue(await val.deleteTag("tag3"));
        assert.notIncludeMembers(await val.tags(), [{ name: "tag3" }]);
        await vault.close();

        // reopen
        await openVault(location);
        val = await vault.get("val");
        assert.equal(await val.get("num"), 17);
        assert.sameDeepMembers(await val.tags(), [{ name: "tag1" }, { name: "tag2" }, { name: "tag4" }]);
        assert.sameDeepMembers(await vault.tags(), allNormTags);
    });

    it("valuable add/delete complex tags", async () => {
        await openVault();
        const tag1 = {
            name: "tag1",
            color: "red"
        };
        const tag2 = "tag2";
        const tag3 = {
            name: "tag3",
            color: "green"
        };
        const tag4 = {
            name: "tag4"
        };
        const allNormTags = adone.vault.normalizeTags([tag1, tag2, tag3, tag4]);
        const tags = [tag1, tag3];
        let val = await vault.create("val", tags);
        await val.set("num", 17);
        assert.equal(await val.get("num"), 17);
        assert.isNumber(await val.addTag(tag2));
        assert.isNull(await val.addTag("tag3"));
        assert.isNumber(await val.addTag(tag4));

        assert.sameDeepMembers(await val.tags(), allNormTags);
        assert.sameDeepMembers(await vault.tags(), allNormTags);
        assert.isTrue(await val.deleteTag("tag3"));
        assert.notIncludeDeepMembers(await val.tags(), [tag3]);
        await vault.close();

        // reopen
        await openVault(location);
        val = await vault.get("val");
        assert.equal(await val.get("num"), 17);
        assert.sameDeepMembers(await val.tags(), [tag1, { name: tag2 }, tag4]);
        assert.sameDeepMembers(await vault.tags(), allNormTags);
    });

    it("delete tags at vault side", async () => {
        await openVault();
        const tag1 = {
            name: "tag1"
        };
        const tag2 = {
            name: "tag2"
        };
        const tag3 = {
            name: "tag3"
        };
        const tags = [tag1, tag2, tag3];
        let val = await vault.create("val", tags);
        assert.sameDeepMembers(await val.tags(), tags);
        assert.sameDeepMembers(await vault.tags(), tags);
        assert.isTrue(await vault.deleteTag("tag2"));
        assert.sameDeepMembers(await val.tags(), [tag1, tag3]);
        assert.sameDeepMembers(await vault.tags(), [tag1, tag3]);
        await vault.close();

        // reopen
        await openVault(location);
        val = await vault.get("val");
        assert.sameDeepMembers(await val.tags(), [tag1, tag3]);
        assert.sameDeepMembers(await vault.tags(), [tag1, tag3]);
    });

    it("create valuable with name of one existing", async () => {
        await openVault();
        const val = await vault.create("val");
        await val.set("num", 17);
        const err = await assert.throws(async () => vault.create("val"));
        assert.instanceOf(err, adone.x.Exists);
    });

    it("get nonexistent valuable", async () => {
        await openVault();
        const err = await assert.throws(async () => vault.get("nonexistent"));
        assert.instanceOf(err, adone.x.NotExists);
    });

    it("delete valuable", async () => {
        await openVault();
        const val = await vault.create("val");
        await val.set("num", 17);
        await vault.delete("val");
        await vault.close();

        const err = await assert.throws(async () => vault.get("val"));
        assert.instanceOf(err, adone.x.NotExists);
    });

    it("get nonexistent item of valuable", async () => {
        await openVault();
        const val = await vault.create("val");
        await val.set("num", 17);
        const err = await assert.throws(async () => val.get("num1"));
        assert.instanceOf(err, adone.x.NotExists);
    });

    it("delete nonexistent item of valuable", async () => {
        await openVault();
        const val = await vault.create("val");
        await val.set("num", 17);
        await val.delete("num");
        const err = await assert.throws(async () => val.delete("num1"));
        assert.instanceOf(err, adone.x.NotExists);
    });

    it("set/get notes", async () => {
        const NOTES = "some notes";
        await openVault();
        const val = await vault.create("val");

        assert.equal(val.getNotes(), "");
        await val.setNotes(NOTES);
        assert.equal(val.getNotes(), NOTES);
    });

    it("clear all items and tags in a valuable", async () => {
        const NOTES = "some notes";

        await openVault();
        const val = await vault.create("val");
        await val.set("a b c", "some string value");
        await val.set("num", 17);
        await val.set("buf", Buffer.from("01101010101010101010100101010101010101010101"));
        await val.setNotes(NOTES);
        await val.addTag("tag1");
        await val.addTag("tag2");

        assert.lengthOf(val.keys(), 3);
        assert.equal(val.getNotes(), NOTES);
        assert.sameDeepMembers(val.tags(), [{ name: "tag1" }, { name: "tag2" }]);
        await val.clear();
        assert.lengthOf(val.keys(), 0);
        assert.equal(val.getNotes(), "");
        assert.equal(val.tags().length, 0);
    });

    it("clear all valuables in a vault", async () => {
        await openVault();
        await vault.create("val1");
        await vault.create("val2");
        await vault.create("val3");
        await vault.addTag("tag1");
        await vault.addTag("tag2");
        assert.lengthOf(vault.keys(), 3);
        assert.lengthOf(vault.tags(), 2);
        await vault.clear({
            hosts: true,
            tags: true
        });
        assert.lengthOf(vault.keys(), 0);
        assert.lengthOf(vault.tags(), 0);
        await vault.close();

        // reopen
        await openVault(location);
        assert.lengthOf(vault.keys(), 0);
        assert.lengthOf(vault.tags(), 0);
    });

    it("valuable substitution", async () => {
        class ExValuable extends adone.vault.Valuable {
            constructor(vault, id, metaData, tags) {
                super(vault, id, metaData, tags);
                this.exProperty = "extended";
            }
        }
        await openVault(null, {
            ValuableClass: ExValuable
        });
        const val = await vault.create("val");
        assert.equal(val.exProperty, "extended");
    });

    it("valuables cache", async () => {
        await openVault();
        const val = await vault.create("val");
        const val1 = await vault.get("val");
        assert.deepEqual(val, val1);
    });

    it("keys()", async () => {
        await openVault();
        await vault.create("foo");
        await vault.create("bar");
        await vault.create("baz");
        assert.sameMembers(vault.keys(), ["foo", "bar", "baz"]);
    });

    it("entries() valuables in order of creating", async () => {
        await openVault();
        const v1 = await vault.create("v1");
        const v2 = await vault.create("v2");
        const v3 = await vault.create("v3");
        await v1.set("kv1", "vv1");
        await v2.set("kv2", "vv2");
        await v3.set("kv3", "vv3");

        const entries = await vault.entries();
        assert.sameMembers(Object.keys(entries), ["v1", "v2", "v3"]);

        for (const [name, v] of Object.entries(entries)) {
            assert.equal(await v.get(`k${name}`), `v${name}`);
        }
    });

    describe("Valuable#toJSON()", () => {
        const createSampleVault = async (tags = null) => {
            const val = await vault.create("descriptor");
            await val.set("k1", "adone");
            await val.set("k2", 2);
            await val.set("k3", true);
            await val.set("k4", [1, 2, 3]);
            await val.set("k5", {
                a: 1,
                b: "2",
                c: false
            });
            if (!is.null(tags)) {
                await val.addTag(tags);
            }

            return val;
        };

        const tags1 = [
            {
                name: "tag1",
                type: "type1"
            },
            {
                name: "tag2",
                type: "type2"
            }
        ];

        it("includeId = false; tags = 'none'", async () => {
            await openVault();
            const val = await createSampleVault(tags1);
            const obj = await val.toJSON({
                includeId: false,
                tags: "none"
            });

            assert.equal(obj.name, "descriptor");
            assert.equal(obj.entries.k1, "adone");
            assert.equal(obj.entries.k2, 2);
            assert.equal(obj.entries.k3, true);
            assert.deepEqual(obj.entries.k4, [1, 2, 3]);
            assert.isUndefined(obj.id);
            assert.isUndefined(obj.tags);
        });

        it("includeId = true; tags = 'none'", async () => {
            await openVault();
            const val = await createSampleVault(tags1);
            const obj = await val.toJSON({
                includeId: true,
                tags: "none"
            });

            assert.equal(obj.name, "descriptor");
            assert.equal(obj.entries.k1, "adone");
            assert.equal(obj.entries.k2, 2);
            assert.equal(obj.entries.k3, true);
            assert.deepEqual(obj.entries.k4, [1, 2, 3]);
            assert.isNumber(obj.id);
            assert.isUndefined(obj.tags);
        });

        it("includeId = true; tags = 'normal'", async () => {
            await openVault();
            const val = await createSampleVault(tags1);
            const obj = await val.toJSON({
                includeId: true,
                tags: "normal"
            });

            assert.equal(obj.name, "descriptor");
            assert.equal(obj.entries.k1, "adone");
            assert.equal(obj.entries.k2, 2);
            assert.equal(obj.entries.k3, true);
            assert.deepEqual(obj.entries.k4, [1, 2, 3]);
            assert.isNumber(obj.id);
            assert.deepEqual(obj.tags, tags1);
        });

        it("includeId = true; tags = 'onlyName'", async () => {
            await openVault();
            const val = await createSampleVault(tags1);
            const obj = await val.toJSON({
                includeId: true,
                tags: "onlyName"
            });

            assert.equal(obj.name, "descriptor");
            assert.equal(obj.entries.k1, "adone");
            assert.equal(obj.entries.k2, 2);
            assert.equal(obj.entries.k3, true);
            assert.deepEqual(obj.entries.k4, [1, 2, 3]);
            assert.isNumber(obj.id);
            assert.deepEqual(obj.tags, tags1.map((t) => t.name));
        });

        it("includeId = true; tags = 'onlyName'", async () => {
            await openVault();
            const val = await createSampleVault(tags1);
            const obj = await val.toJSON({
                includeId: true,
                tags: "onlyId"
            });

            assert.equal(obj.name, "descriptor");
            assert.equal(obj.entries.k1, "adone");
            assert.equal(obj.entries.k2, 2);
            assert.equal(obj.entries.k3, true);
            assert.deepEqual(obj.entries.k4, [1, 2, 3]);
            assert.isNumber(obj.id);
            assert.sameMembers(obj.tags, [1, 2]);
        });

        it("includeId = false; tags = 'onlyId' (valuable without tags)", async () => {
            await openVault();
            const val = await createSampleVault();
            const obj = await val.toJSON({
                includeId: false,
                tags: "onlyId"
            });

            assert.equal(obj.name, "descriptor");
            assert.equal(obj.entries.k1, "adone");
            assert.equal(obj.entries.k2, 2);
            assert.equal(obj.entries.k3, true);
            assert.deepEqual(obj.entries.k4, [1, 2, 3]);
            assert.isUndefined(obj.id);
            assert.equal(obj.tags.length, 0);
        });

        it("includeId = false; includeEntryId = true; entriesAsArray = true; tags = 'onlyId' (valuable without tags)", async () => {
            await openVault();
            const val = await createSampleVault();
            const obj = await val.toJSON({
                includeId: false,
                includeEntryId: true,
                entriesAsArray: true,
                tags: "onlyId"
            });

            assert.equal(obj.name, "descriptor");
            assert.deepInclude(obj.entries, { id: 1, name: "k1", value: "adone", type: "string" });
            assert.deepInclude(obj.entries, { id: 2, name: "k2", value: 2, type: "number" });
            assert.deepInclude(obj.entries, { id: 3, name: "k3", value: true, type: "boolean" });
            assert.deepInclude(obj.entries, { id: 4, name: "k4", value: [1, 2, 3], type: "Array" });
            assert.deepInclude(obj.entries, {
                id: 5, name: "k5", value: {
                    a: 1,
                    b: "2",
                    c: false
                }, type: "Object"
            });
            assert.isUndefined(obj.id);
            assert.equal(obj.tags.length, 0);
        });
    });

    describe("Vault#toJSON", () => {
        const tags1 = [
            {
                name: "tag1",
                type: "type1"
            },
            {
                name: "tag2",
                type: "type2"
            }
        ];

        const tags2 = [
            {
                name: "tag3",
                type: "type3"
            },
            {
                name: "tag4",
                type: "type5"
            }
        ];

        beforeEach(async () => {
            await openVault();
            const val1 = await vault.create("descriptor1");
            await val1.set("k11", "adone");
            await val1.set("k12", 2);
            await val1.set("k13", true);
            await val1.set("k14", [1, 2, 3]);
            await val1.addTag(tags1);

            const val2 = await vault.create("descriptor2");
            await val2.set("k21", "adone");
            await val2.set("k22", 2);
            await val2.set("k23", true);
            await val2.set("k24", [1, 2, 3]);
            await val2.addTag(tags2);
        });

        it("Vault#toJSON({ valuable })", async () => {
            const result = await vault.toJSON({
                valuable: {
                    includeId: true,
                    tags: "normal"
                }
            });

            const obj = result.valuables;

            assert.isUndefined(result.stats);

            assert.equal(obj.length, 2);

            assert.equal(obj[0].name, "descriptor1");
            assert.equal(obj[0].entries.k11, "adone");
            assert.equal(obj[0].entries.k12, 2);
            assert.equal(obj[0].entries.k13, true);
            assert.deepEqual(obj[0].entries.k14, [1, 2, 3]);
            assert.isNumber(obj[0].id);
            assert.deepEqual(obj[0].tags, tags1);

            assert.equal(obj[1].name, "descriptor2");
            assert.equal(obj[1].entries.k21, "adone");
            assert.equal(obj[1].entries.k22, 2);
            assert.equal(obj[1].entries.k23, true);
            assert.deepEqual(obj[1].entries.k24, [1, 2, 3]);
            assert.isNumber(obj[1].id);
            assert.deepEqual(obj[1].tags, tags2);
        });

        it("Vault#toJSON({ includeStats })", async () => {
            const result = await vault.toJSON({
                includeStats: true
            });

            assert.isUndefined(result.valuables);
            assert.isNumber(result.stats.created);
            assert.isNumber(result.stats.updated);
            assert.isAbove(result.stats.updated, result.stats.created);
            assert.isString(result.stats.location);
        });
    });

    describe("Valuable#fromJSON()", () => {
        it("entries as array", async () => {
            await openVault();
            let val = await vault.create("valuable1");
            const notes = "some notes";
            const entries = [
                {
                    name: "k1",
                    value: "v2",
                    type: "string"
                },
                {
                    name: "k2",
                    value: 888,
                    type: "number"
                },
                {
                    name: "k3",
                    value: true,
                    type: "boolean"
                }
            ];
            const tags = ["tag1", "tag2", "tag3"];
            await val.fromJSON({
                notes,
                entries,
                tags
            });
            await vault.close();

            await openVault(location);
            val = await vault.get("valuable1");
            const jsonData = await val.toJSON({
                entriesAsArray: true
            });

            assert.sameDeepMembers(jsonData.tags, tags.map((x) => ({ name: x })));
            assert.sameDeepMembers(jsonData.entries, entries);
            assert.equal(val.getNotes(), notes);
        });

        it("entries as plain object", async () => {
            await openVault();
            let val = await vault.create("valuable2");
            const notes = "some notes";
            const tags = ["tag1", "tag2", "tag3", "tag4"];
            await val.fromJSON({
                notes,
                entries: {
                    k1: "v2",
                    k2: 888,
                    k3: true
                },
                tags
            });
            await vault.close();

            await openVault(location);
            val = await vault.get("valuable2");
            const jsonData = await val.toJSON({
                entriesAsArray: true
            });

            assert.sameDeepMembers(jsonData.tags, tags.map((x) => ({ name: x })));
            assert.sameDeepMembers(jsonData.entries, [
                {
                    name: "k1",
                    value: "v2",
                    type: "string"
                },
                {
                    name: "k2",
                    value: 888,
                    type: "number"
                },
                {
                    name: "k3",
                    value: true,
                    type: "boolean"
                }
            ]);
            assert.equal(val.getNotes(), notes);
        });
    });

    it("Valuable#keys() with regexp matcher", async () => {
        await openVault();
        const val = await vault.create("valuable2");
        await val.fromJSON({
            entries: [
                {
                    name: "__.name1",
                    value: "__value1"
                },
                {
                    name: "key1",
                    value: "value1"
                },
                {
                    name: "__.nam2",
                    value: "__value2"
                },
                {
                    name: "__.na3",
                    value: "__value3"
                },
                {
                    name: "key",
                    value: "val"
                }
            ]
        });

        const names = val.keys(/^__.(.+)/);
        assert.sameMembers(names, ["name1", "nam2", "na3"]);
    });
});
