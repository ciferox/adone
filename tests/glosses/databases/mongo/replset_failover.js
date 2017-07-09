describe("replset failover", function () {
    if (this.topology !== "replicaset") {
        return;
    }

    const { database: { mongo }, util, std } = adone;
    const { enumerate } = util;

    it("should correctly remove and re-add secondary and detect removal and re-addition of the server", async () => {
        const db = await mongo.connect(this.url());
        await new Promise((resolve) => db.once("fullsetup", resolve));
        const joined = spy();
        db.serverConfig.on("joined", joined);
        const [secondary] = await this.server.secondaries();
        const secondaryJoined = joined.waitFor((call) => {
            const [t, , d] = call.args;
            return t === "secondary" && d.name === `${secondary.host}:${secondary.port}`;
        });
        await this.server.removeMember(secondary, {
            returnImmediately: false, force: false, skipWait: true
        });
        await this.server.addMember(secondary, {
            returnImmediately: false, force: false
        });
        await secondaryJoined;
        await db.close();
        await this.server.restart();
    });

    it("should correctly handle primary stepDown", async () => {
        const db = await mongo.connect(this.url());
        await new Promise((resolve) => db.once("fullsetup", resolve));
        const joined = spy();
        db.serverConfig.on("joined", joined);
        const left = spy();
        db.serverConfig.on("left", left);
        const primaryLeft = left.waitForArgs("primary");
        const primaryJoined = joined.waitForArgs("primary");
        await this.server.stepDownPrimary(false, { stepDownSecs: 1, force: true });
        await primaryLeft;
        await primaryJoined;
        await db.close();
        await this.server.restart();
    });

    it("should correctly recover from secondary shutdowns", async () => {
        const db = await mongo.connect(this.url());
        const fullSet = spy();
        db.on("fullsetup", fullSet);
        const left = spy();
        db.serverConfig.on("left", left);
        const joined = spy();
        db.serverConfig.on("joined", joined);
        await fullSet.waitForCall();
        const secondaries = await this.server.secondaries();
        {
            const secondaryLeft = left.waitFor(({ args }) => args[0] === "secondary");
            await secondaries[0].stop();
            await secondaryLeft;
        }
        {
            const secondaryLeft = left.waitFor(({ args }) => args[0] === "secondary");
            await secondaries[1].stop();
            await secondaryLeft;
        }
        {
            const secondaryJoined = joined.waitFor(({ args }) => args[0] === "secondary");
            await secondaries[0].start();
            await secondaryJoined;
        }
        {
            const secondaryJoined = joined.waitFor(({ args }) => args[0] === "secondary");
            await secondaries[1].start();
            await secondaryJoined;
        }
        await db.collection("replset_failover_insert0").insert({ a: 1 });
        expect(await db.collection("replset_failover_insert0").count()).to.be.equal(1);
        await db.command({ ismaster: true }, { readPreference: new mongo.ReadPreference("secondary") });
        await db.close();
        await this.server.restart();
    });

    it("should correctly remove and re-add secondary with new priority and detect removal and re-addition of the server as new primary", async () => {
        const db = await mongo.connect(this.url());
        const fullSet = spy();
        db.on("fullsetup", fullSet);
        const left = spy();
        db.serverConfig.on("left", left);
        const joined = spy();
        db.serverConfig.on("joined", joined);
        await fullSet.waitForCall();
        const secondaries = await this.server.secondaries();
        {
            const secondaryLeft = left.waitFor(({ args }) => args[0] === "secondary");
            await this.server.removeMember(secondaries[0], {
                returnImmediately: false, force: false, skipWait: true
            });
            await secondaryLeft;
        }
        const config = JSON.parse(JSON.stringify(this.server.configurations[0]));
        const members = config.members;
        for (let i = 0; i < members.length; i++) {
            if (members[i].host === `${secondaries[0].host}:${secondaries[0].port}`) {
                members[i].priority = 10;
                break;
            }
        }
        config.version = config.version + 1;
        await this.server.reconfigure(config, {
            returnImmediately: false, force: false
        });
        {
            const primaryJoined = joined.waitFor(({ args }) => {
                return args[0] === "primary" && args[2].name === `${secondaries[0].host}:${secondaries[0].port}`;
            });
            await secondaries[0].start();
            await primaryJoined;
        }
        await db.close();
        await this.server.restart();
    });

    it("should work correctly with inserts after bringing master back", async () => {
        const db = await mongo.connect(this.url());
        const fullSet = spy();
        db.on("fullsetup", fullSet);
        await fullSet.waitForCall();
        await db.dropCollection("shouldWorkCorrectlyWithInserts").catch(() => { });
        const collection = db.collection("shouldWorkCorrectlyWithInserts");
        await collection.insert({ a: 20 }, { w: "majority", wtimeout: 30000 });
        expect(await collection.count()).to.be.equal(1);
        const primary = await this.server.primary();
        await primary.stop();
        for (let i = 3; i < 8; ++i) {
            await collection.insert({ a: 10 * i }, { w: 2, wtimeout: 10000 });
        }
        const joined = spy();
        db.serverConfig.on("joined", joined);
        await primary.start();
        await joined.waitForCall();
        {
            const items = await collection.find().toArray();
            expect(items).to.have.lengthOf(6);
            items.sort((a, b) => a.a - b.a);
            for (const [idx, item] of enumerate(items, 2)) {
                expect(item.a).to.be.equal(10 * idx);
            }
        }
        await collection.save({ a: 80 }, { w: 1 });
        {
            const items = await collection.find().toArray();
            expect(items).to.have.lengthOf(7);
            items.sort((a, b) => a.a - b.a);
            for (const [idx, item] of enumerate(items, 2)) {
                expect(item.a).to.be.equal(10 * idx);
            }
        }
        await db.close();
        await this.server.restart();
    });

    it("should correctly read from secondary even if primary is down", async () => {
        const db = await mongo.connect(this.url());
        const fullSet = spy();
        db.on("fullsetup", fullSet);
        await fullSet.waitForCall();
        const collection = db.collection("notempty");
        await collection.insert({ a: 1 }, { w: 2, wtimeout: 10000 });
        {
            const doc = await collection.findOne();
            expect(doc.a).to.be.equal(1);
        }
        const primary = await this.server.primary();
        const left = spy();
        db.serverConfig.on("left", left);
        const primaryLeft = left.waitFor(({ args }) => args[0] === "primary");
        await primary.stop();
        await primaryLeft;
        expect(await collection.findOne()).to.be.ok;
        await db.close();
        await this.server.restart();
    });

    it("should still query secondary when no primary available", async () => {
        const url = std.url.format({
            protocol: "mongodb:",
            slashes: true,
            host: [
                `${this.host}:${this.port}`,
                `${this.host}:${this.port + 1}`,
                `${this.host}:${this.port + 2}`
            ].join(","),
            pathname: "/tests_",
            search: new std.url.URLSearchParams({
                replicaSet: "rs"
            }).toString()
        });
        const db = await mongo.connect(url, {
            replSet: {
                haInterval: 50,
                socketOptions: {
                    connectTimeoutMS: 500
                }
            }
        });
        const collection = db.collection("replicaset_readpref_test");
        await collection.insert({ testfield: 123 });
        {
            const doc = await collection.findOne({});
            expect(doc.testfield).to.be.equal(123);
        }
        const secondaries = await this.server.secondaries();
        const left = spy();
        db.serverConfig.on("left", left);
        const secondaryLeft = left.waitForArgs("secondary");
        await secondaries[0].stop();
        await secondaryLeft;
        expect(await collection.findOne({}, { readPreference: mongo.ReadPreference.SECONDARY_PREFERRED })).to.be.ok;
        const primary = await this.server.primary();
        const primaryLeft = left.waitForArgs("primary");
        await primary.stop();
        await primaryLeft;
        expect(await collection.findOne({}, { readPreference: mongo.ReadPreference.SECONDARY_PREFERRED })).to.be.ok;
        await db.close();
        await this.server.restart();
    });

    it("should get proper error when strict is set and only a secondary is available and readPreference is nearest", async () => {
        const url = std.url.format({
            protocol: "mongodb:",
            slashes: true,
            host: [
                `${this.host}:${this.port}`,
                `${this.host}:${this.port + 1}`,
                `${this.host}:${this.port + 2}`
            ].join(","),
            pathname: "/tests_",
            search: new std.url.URLSearchParams({
                replicaSet: "rs"
            }).toString()
        });
        const db = await mongo.connect(url, { readPreference: mongo.ReadPreference.NEAREST });
        const left = spy();
        db.serverConfig.on("left", left);
        const primary = await this.server.primary();
        const primaryLeft = left.waitForArgs("primary");
        await primary.stop();
        await primaryLeft;
        await assert.throws(async () => {
            await db.collection("notempty_does_not_exist", { strict: true });
        }, "Currently in strict mode");
        await db.close();
        await this.server.restart();
    });
});
