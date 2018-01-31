describe("hooks", function () {
    const { vendor: { lodash: _ } } = adone;
    const { orm } = adone;
    const { type } = orm;

    beforeEach(function () {
        this.Model = this.sequelize.define("m");
    });

    describe("arguments", () => {
        it("hooks can modify passed arguments", function () {
            this.Model.addHook("beforeCreate", (options) => {
                options.answer = 41;
            });

            const options = {};
            return this.Model.runHooks("beforeCreate", options).then(() => {
                expect(options.answer).to.equal(41);
            });
        });
    });

    describe("proxies", function () {
        beforeEach(() => {
            stub(this.sequelize, "query").returns(Promise.resolve([{
                _previousDataValues: {},
                dataValues: { id: 1, name: "abc" }
            }]));
        });

        afterEach(() => {
            this.sequelize.query.restore();
        });

        describe("defined by options.hooks", () => {
            beforeEach(() => {
                this.beforeSaveHook = spy();
                this.afterSaveHook = spy();
                this.afterCreateHook = spy();

                this.Model = this.sequelize.define("m", {
                    name: type.STRING
                }, {
                    hooks: {
                        beforeSave: this.beforeSaveHook,
                        afterSave: this.afterSaveHook,
                        afterCreate: this.afterCreateHook
                    }
                });
            });

            it("calls beforeSave/afterSave", () => {
                return this.Model.create({}).then(() => {
                    expect(this.afterCreateHook).to.have.been.calledOnce();
                    expect(this.beforeSaveHook).to.have.been.calledOnce();
                    expect(this.afterSaveHook).to.have.been.calledOnce();
                });
            });
        });

        describe("defined by addHook method", () => {
            beforeEach(() => {
                this.beforeSaveHook = spy();
                this.afterSaveHook = spy();

                this.Model = this.sequelize.define("m", {
                    name: type.STRING
                });

                this.Model.addHook("beforeSave", this.beforeSaveHook);
                this.Model.addHook("afterSave", this.afterSaveHook);
            });

            it("calls beforeSave/afterSave", () => {
                return this.Model.create({}).then(() => {
                    expect(this.beforeSaveHook).to.have.been.calledOnce();
                    expect(this.afterSaveHook).to.have.been.calledOnce();
                });
            });
        });

        describe("defined by hook method", () => {
            beforeEach(() => {
                this.beforeSaveHook = spy();
                this.afterSaveHook = spy();

                this.Model = this.sequelize.define("m", {
                    name: type.STRING
                });

                this.Model.hook("beforeSave", this.beforeSaveHook);
                this.Model.hook("afterSave", this.afterSaveHook);
            });

            it("calls beforeSave/afterSave", () => {
                return this.Model.create({}).then(() => {
                    expect(this.beforeSaveHook).to.have.been.calledOnce();
                    expect(this.afterSaveHook).to.have.been.calledOnce();
                });
            });
        });
    });

    describe("multiple hooks", () => {
        beforeEach(function () {
            this.hook1 = spy();
            this.hook2 = spy();
            this.hook3 = spy();
        });

        describe("runs all hooks on success", () => {
            afterEach(function () {
                expect(this.hook1).to.have.been.calledOnce();
                expect(this.hook2).to.have.been.calledOnce();
                expect(this.hook3).to.have.been.calledOnce();
            });

            it("using addHook", function () {
                this.Model.addHook("beforeCreate", this.hook1);
                this.Model.addHook("beforeCreate", this.hook2);
                this.Model.addHook("beforeCreate", this.hook3);

                return this.Model.runHooks("beforeCreate");
            });

            it("using function", function () {
                this.Model.beforeCreate(this.hook1);
                this.Model.beforeCreate(this.hook2);
                this.Model.beforeCreate(this.hook3);

                return this.Model.runHooks("beforeCreate");
            });

            it("using define", function () {
                return this.sequelize.define("M", {}, {
                    hooks: {
                        beforeCreate: [this.hook1, this.hook2, this.hook3]
                    }
                }).runHooks("beforeCreate");
            });

            it("using a mixture", function () {
                const Model = this.sequelize.define("M", {}, {
                    hooks: {
                        beforeCreate: this.hook1
                    }
                });
                Model.beforeCreate(this.hook2);
                Model.addHook("beforeCreate", this.hook3);

                return Model.runHooks("beforeCreate");
            });
        });

        it("stops execution when a hook throws", async function () {
            this.Model.beforeCreate(() => {
                this.hook1();

                throw new Error("No!");
            });
            this.Model.beforeCreate(this.hook2);

            await assert.throws(async () => {
                await this.Model.runHooks("beforeCreate");
            });

            expect(this.hook1).to.have.been.calledOnce();
            expect(this.hook2).not.to.have.been.called();
        });

        it("stops execution when a hook rejects", async function () {
            this.Model.beforeCreate(() => {
                this.hook1();

                return Promise.reject(new Error("No!"));
            });
            this.Model.beforeCreate(this.hook2);

            await assert.throws(async () => {
                await this.Model.runHooks("beforeCreate");
            });
            expect(this.hook1).to.have.been.calledOnce();
            expect(this.hook2).not.to.have.been.called();
        });
    });

    describe("global hooks", () => {
        describe("using addHook", () => {

            it("invokes the global hook", function () {
                const globalHook = spy();

                this.sequelize.addHook("beforeUpdate", globalHook);

                return this.Model.runHooks("beforeUpdate").then(() => {
                    expect(globalHook).to.have.been.calledOnce();
                });
            });

            it("invokes the global hook, when the model also has a hook", () => {
                const globalHookBefore = spy();
                const globalHookAfter = spy();
                const localHook = spy();

                this.sequelize.addHook("beforeUpdate", globalHookBefore);

                const Model = this.sequelize.define("m", {}, {
                    hooks: {
                        beforeUpdate: localHook
                    }
                });

                this.sequelize.addHook("beforeUpdate", globalHookAfter);

                return Model.runHooks("beforeUpdate").then(() => {
                    expect(globalHookBefore).to.have.been.calledOnce();
                    expect(globalHookAfter).to.have.been.calledOnce();
                    expect(localHook).to.have.been.calledOnce();

                    expect(localHook).to.have.been.calledBefore(globalHookBefore);
                    expect(localHook).to.have.been.calledBefore(globalHookAfter);
                });
            });
        });

        describe("using define hooks", () => {
            beforeEach(function () {
                this.beforeCreate = spy();
                this.sequelize = this.createSequelizeInstance({
                    define: {
                        hooks: {
                            beforeCreate: this.beforeCreate
                        }
                    }
                });
            });

            it("runs the global hook when no hook is passed", async function () {
                const Model = this.sequelize.define("M", {}, {
                    hooks: {
                        beforeUpdate: _.noop // Just to make sure we can define other hooks without overwriting the global one
                    }
                });

                await Model.runHooks("beforeCreate");
                expect(this.beforeCreate).to.have.been.calledOnce();
            });

            it("does not run the global hook when the model specifies its own hook", async function () {
                const localHook = spy();
                const Model = this.sequelize.define("M", {}, {
                    hooks: {
                        beforeCreate: localHook
                    }
                });

                await Model.runHooks("beforeCreate");
                expect(this.beforeCreate).not.to.have.been.called();
                expect(localHook).to.have.been.calledOnce();
            });
        });
    });

    describe("#removeHook", () => {
        it("should remove hook", async function () {
            const hook1 = spy();
            const hook2 = spy();

            this.Model.addHook("beforeCreate", "myHook", hook1);
            this.Model.beforeCreate("myHook2", hook2);

            await this.Model.runHooks("beforeCreate");
            expect(hook1).to.have.been.calledOnce();
            expect(hook2).to.have.been.calledOnce();

            hook1.reset();
            hook2.reset();

            this.Model.removeHook("beforeCreate", "myHook");
            this.Model.removeHook("beforeCreate", "myHook2");

            await this.Model.runHooks("beforeCreate");
            expect(hook1).not.to.have.been.called();
            expect(hook2).not.to.have.been.called();
        });

        it("should not remove other hooks", async function () {
            const hook1 = spy();
            const hook2 = spy();
            const hook3 = spy();
            const hook4 = spy();

            this.Model.addHook("beforeCreate", hook1);
            this.Model.addHook("beforeCreate", "myHook", hook2);
            this.Model.beforeCreate("myHook2", hook3);
            this.Model.beforeCreate(hook4);

            await this.Model.runHooks("beforeCreate");
            expect(hook1).to.have.been.calledOnce();
            expect(hook2).to.have.been.calledOnce();
            expect(hook3).to.have.been.calledOnce();
            expect(hook4).to.have.been.calledOnce();

            hook1.reset();
            hook2.reset();
            hook3.reset();
            hook4.reset();

            this.Model.removeHook("beforeCreate", "myHook");

            await this.Model.runHooks("beforeCreate");

            expect(hook1).to.have.been.calledOnce();
            expect(hook2).not.to.have.been.called();
            expect(hook3).to.have.been.calledOnce();
            expect(hook4).to.have.been.calledOnce();
        });
    });

    describe("#addHook", () => {
        it("should add additional hook when previous exists", function () {
            const hook1 = spy();
            const hook2 = spy();

            const Model = this.sequelize.define("Model", {}, {
                hooks: { beforeCreate: hook1 }
            });

            Model.addHook("beforeCreate", hook2);

            return Model.runHooks("beforeCreate").then(() => {
                expect(hook1).to.have.been.calledOnce();
                expect(hook2).to.have.been.calledOnce();
            });
        });
    });

    describe("aliases", () => {
        beforeEach(function () {
            this.beforeDelete = spy();
            this.afterDelete = spy();
        });

        afterEach(function () {
            expect(this.beforeDelete).to.have.been.calledOnce();
            expect(this.afterDelete).to.have.been.calledOnce();
        });

        describe("direct method", () => {
            it("#delete", function () {
                this.Model.beforeDelete(this.beforeDelete);
                this.Model.afterDelete(this.afterDelete);

                return Promise.all([
                    this.Model.runHooks("beforeDestroy"),
                    this.Model.runHooks("afterDestroy")
                ]);
            });
        });

        describe(".hook() method", () => {
            it("#delete", function () {
                this.Model.hook("beforeDelete", this.beforeDelete);
                this.Model.hook("afterDelete", this.afterDelete);

                return Promise.all([
                    this.Model.runHooks("beforeDestroy"),
                    this.Model.runHooks("afterDestroy")
                ]);
            });
        });
    });

    describe("promises", () => {
        it("can return a promise", async function () {
            this.Model.beforeBulkCreate(() => {
                return Promise.resolve();
            });

            await this.Model.runHooks("beforeBulkCreate");
        });

        it("can return undefined", async function () {
            this.Model.beforeBulkCreate(() => {
                // This space intentionally left blank
            });

            await this.Model.runHooks("beforeBulkCreate");
        });

        it("can return an error by rejecting", async function () {
            this.Model.beforeCreate(() => {
                return Promise.reject(new Error("Forbidden"));
            });

            await assert.throws(async () => {
                await this.Model.runHooks("beforeCreate");
            }, "Forbidden");
        });

        it("can return an error by throwing", async function () {
            this.Model.beforeCreate(() => {
                throw new Error("Forbidden");
            });

            await assert.throws(async () => {
                await this.Model.runHooks("beforeCreate");
            });
        });
    });

    describe("sync hooks", () => {
        beforeEach(function () {
            this.hook1 = spy();
            this.hook2 = spy();
            this.hook3 = spy();
            this.hook4 = spy();
        });

        it("runs all beforInit/afterInit hooks", function () {
            orm.hooks.add("beforeInit", "h1", this.hook1);
            orm.hooks.add("beforeInit", "h2", this.hook2);
            orm.hooks.add("afterInit", "h3", this.hook3);
            orm.hooks.add("afterInit", "h4", this.hook4);

            this.createSequelizeInstance();

            expect(this.hook1).to.have.been.calledOnce();
            expect(this.hook2).to.have.been.calledOnce();
            expect(this.hook3).to.have.been.calledOnce();
            expect(this.hook4).to.have.been.calledOnce();

            // cleanup hooks on Support.Sequelize
            orm.hooks.remove("beforeInit", "h1");
            orm.hooks.remove("beforeInit", "h2");
            orm.hooks.remove("afterInit", "h3");
            orm.hooks.remove("afterInit", "h4");

            this.createSequelizeInstance();

            // check if hooks were removed
            expect(this.hook1).to.have.been.calledOnce();
            expect(this.hook2).to.have.been.calledOnce();
            expect(this.hook3).to.have.been.calledOnce();
            expect(this.hook4).to.have.been.calledOnce();
        });

        it("runs all beforDefine/afterDefine hooks", function () {
            const sequelize = this.createSequelizeInstance();
            sequelize.addHook("beforeDefine", this.hook1);
            sequelize.addHook("beforeDefine", this.hook2);
            sequelize.addHook("afterDefine", this.hook3);
            sequelize.addHook("afterDefine", this.hook4);
            sequelize.define("Test", {});
            expect(this.hook1).to.have.been.calledOnce();
            expect(this.hook2).to.have.been.calledOnce();
            expect(this.hook3).to.have.been.calledOnce();
            expect(this.hook4).to.have.been.calledOnce();
        });
    });
});
