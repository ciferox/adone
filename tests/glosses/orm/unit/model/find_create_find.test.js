describe("findCreateFind", function () {
    const UniqueConstraintError = adone.orm.error.UniqueConstraintError;
    const current = this.sequelize;

    const Model = current.define("Model", {});

    beforeEach(function () {
        this.sinon = adone.shani.util.sandbox.create();
    });

    afterEach(function () {
        this.sinon.restore();
    });

    it("should return the result of the first find call if not empty", async function () {
        const result = {};
        const where = { prop: Math.random().toString() };
        const findSpy = this.sinon.stub(Model, "findOne").returns(Promise.resolve(result));

        expect(await Model.findCreateFind({
            where
        })).to.be.deep.equal([result, false]);
        expect(findSpy).to.have.been.calledOnce();
        expect(findSpy.getCall(0).args[0].where).to.equal(where);
    });

    it("should create if first find call is empty", async function () {
        const result = {};
        const where = { prop: Math.random().toString() };
        const createSpy = this.sinon.stub(Model, "create").returns(Promise.resolve(result));

        this.sinon.stub(Model, "findOne").returns(Promise.resolve(null));

        expect(await Model.findCreateFind({
            where
        })).to.be.deep.equal([result, true]);
        expect(createSpy).to.have.been.calledWith(where);
    });

    it("should do a second find if create failed do to unique constraint", async function () {
        const result = {};
        const where = { prop: Math.random().toString() };
        const findSpy = this.sinon.stub(Model, "findOne");

        this.sinon.stub(Model, "create").callsFake(() => {
            return Promise.reject(new UniqueConstraintError());
        });

        findSpy.onFirstCall().returns(Promise.resolve(null));
        findSpy.onSecondCall().returns(Promise.resolve(result));

        expect(await Model.findCreateFind({
            where
        })).to.be.deep.equal([result, false]);
        expect(findSpy).to.have.been.calledTwice();
        expect(findSpy.getCall(1).args[0].where).to.equal(where);
    });
});
