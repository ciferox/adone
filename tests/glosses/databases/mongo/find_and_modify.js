describe("findAndModify", function () {
    const { database: { mongo } } = adone;

    it("should pass through writeConcern to all findAndModify commands at command level", async () => {
        const { db } = this;
        let started = [];

        const listener = mongo.instrument();
        listener.on("started", (event) => {
            if (event.commandName === "findandmodify") {
                started.push(event);
            }
        });

        const collection = db.collection("findAndModifyTEST");
        await collection.findOneAndUpdate({}, { $set: { a: 1 } }, { fsync: 1 });
        expect(started[0].command.writeConcern).to.be.deep.equal({ fsync: 1 });
        started = [];
        await collection.findOneAndReplace({}, { b: 1 }, { fsync: 1 });
        expect(started[0].command.writeConcern).to.be.deep.equal({ fsync: 1 });
        started = [];
        await collection.findOneAndDelete({}, { fsync: 1 });
        expect(started[0].command.writeConcern).to.be.deep.equal({ fsync: 1 });
        listener.uninstrument();
    });

    it("should pass through writeConcern to all findAndModify at collection level", async () => {
        let started = [];

        const listener = mongo.instrument();
        listener.on("started", (event) => {
            if (event.commandName === "findandmodify") {
                started.push(event);
            }
        });

        const collection = this.db.collection("findAndModifyTEST", { fsync: 1 });
        await collection.findOneAndUpdate({}, { $set: { a: 1 } });
        expect(started[0].command.writeConcern).to.be.deep.equal({ fsync: 1 });
        started = [];
        await collection.findOneAndReplace({}, { b: 1 });
        expect(started[0].command.writeConcern).to.be.deep.equal({ fsync: 1 });
        started = [];
        await collection.findOneAndDelete({});
        expect(started[0].command.writeConcern).to.be.deep.equal({ fsync: 1 });
        listener.uninstrument();
    });

    it("should pass through writeConcern to all findAndModify at db level", async () => {
        let started = [];

        const listener = mongo.instrument();
        listener.on("started", (event) => {
            if (event.commandName === "findandmodify") {
                started.push(event);
            }
        });

        const db = await mongo.connect(this.url({
            search: {
                fsync: true
            }
        }), { server: { sslValidate: false } });

        const collection = db.collection("findAndModifyTEST");
        await collection.findOneAndUpdate({}, { $set: { a: 1 } });
        expect(started[0].command.writeConcern).to.be.deep.equal({ fsync: true });
        started = [];
        await collection.findOneAndReplace({}, { b: 1 });
        expect(started[0].command.writeConcern).to.be.deep.equal({ fsync: true });
        started = [];
        await collection.findOneAndDelete({});
        expect(started[0].command.writeConcern).to.be.deep.equal({ fsync: true });
        listener.uninstrument();
    });
});
