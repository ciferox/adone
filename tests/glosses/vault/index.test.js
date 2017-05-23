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

    it("create/get valuable with tags", async () => {
        await openVault();
        assert.equal(vault.location(), location);
        assert.lengthOf(vault.vids, 0);
        assert.equal(vault.nextValuableId, 1);
        const tags = ["tag1", "tag3"];
        let valuable = await vault.create("v1", tags);
        assert.equal(valuable.id, 1);
        assert.equal(valuable.name(), "v1");
        assert.sameMembers(valuable.tags(), tags);
        await vault.close();

        await openVault(location);
        assert.equal(vault.location(), location);
        assert.lengthOf(vault.vids, 1);
        assert.equal(vault.nextValuableId, 2);
        assert.isTrue(vault.has("v1"));
        valuable = await vault.get("v1");
        assert.equal(valuable.id, 1);
        assert.equal(valuable.name(), "v1");
        assert.sameMembers(valuable.tags(), tags);
    });

    it("create/get multiple valuables", async () => {
        await openVault();
        assert.equal(vault.location(), location);
        const tags1 = ["tag1", "tag3"];
        const tags2 = ["tag2", "tag3"];
        let valuable1 = await vault.create("v1", tags1);
        assert.equal(valuable1.id, 1);
        assert.equal(valuable1.name(), "v1");
        assert.sameMembers(valuable1.tags(), tags1);

        let valuable2 = await vault.create("v2", tags2);
        assert.equal(valuable2.id, 2);
        assert.equal(valuable2.name(), "v2");
        assert.sameMembers(valuable2.tags(), tags2);
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
        assert.sameMembers(valuable1.tags(), tags1);
        valuable2 = await vault.get("v2");
        assert.equal(valuable2.id, 2);
        assert.equal(valuable2.name(), "v2");
        assert.sameMembers(valuable2.tags(), tags2);
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

    it("valuable add/delete tags", async () => {
        await openVault();
        const tags = ["tag1", "tag3"];
        let val = await vault.create("val", tags);
        await val.set("num", 17);
        assert.equal(await val.get("num"), 17);
        assert.isTrue(await val.addTag("tag2"));
        assert.isFalse(await val.addTag("tag3"));
        assert.isTrue(await val.addTag("tag4"));
        assert.sameMembers(await val.tags(), ["tag1", "tag2", "tag3", "tag4"]);
        assert.sameMembers(await vault.tags(), ["tag1", "tag2", "tag3", "tag4"]);
        await val.deleteTag("tag3");
        assert.sameMembers(await val.tags(), ["tag1", "tag2", "tag4"]);
        await vault.close();

        // reopen
        await openVault(location);
        val = await vault.get("val");
        assert.equal(await val.get("num"), 17);
        assert.sameMembers(await val.tags(), ["tag1", "tag2", "tag4"]);
        assert.sameMembers(await vault.tags(), ["tag1", "tag2", "tag3", "tag4"]);
        await vault.close();
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

    it("clear all item in a valuable", async () => {
        await openVault();
        const val = await vault.create("val");
        await val.set("a b c", "some string value");
        await val.set("num", 17);
        await val.set("buf", Buffer.from("01101010101010101010100101010101010101010101"));
        assert.lengthOf(val.keys(), 3);
        await val.clear();
        assert.lengthOf(val.keys(), 0);
    });

    it("valuable substitution", async () => {
        class ExValuable extends adone.vault.Valuable {
            constructor(vault, id, metaData, tags) {
                super(vault, id, metaData, tags);
                this.exProperty = "extended";
            }
        }
        await openVault(null, {
            valuable: ExValuable
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
});
