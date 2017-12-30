describe("hooks", function () {
    const { orm } = adone;
    const { type } = orm;
    const dialect = this.getTestDialect();

    beforeEach(function () {
        this.User = this.sequelize.define("User", {
            username: {
                type: type.STRING,
                allowNull: false
            },
            mood: {
                type: type.ENUM,
                values: ["happy", "sad", "neutral"]
            }
        });

        this.ParanoidUser = this.sequelize.define("ParanoidUser", {
            username: type.STRING,
            mood: {
                type: type.ENUM,
                values: ["happy", "sad", "neutral"]
            }
        }, {
            paranoid: true
        });

        return this.sequelize.sync({ force: true });
    });

    describe("#define", () => {
        before(function () {
            this.sequelize.addHook("beforeDefine", (attributes, options) => {
                options.modelName = "bar";
                options.name.plural = "barrs";
                attributes.type = type.STRING;
            });

            this.sequelize.addHook("afterDefine", (factory) => {
                factory.options.name.singular = "barr";
            });

            this.model = this.sequelize.define("foo", { name: type.STRING });
        });

        it("beforeDefine hook can change model name", function () {
            expect(this.model.name).to.equal("bar");
        });

        it("beforeDefine hook can alter options", function () {
            expect(this.model.options.name.plural).to.equal("barrs");
        });

        it("beforeDefine hook can alter attributes", function () {
            expect(this.model.rawAttributes.type).to.be.ok();
        });

        it("afterDefine hook can alter options", function () {
            expect(this.model.options.name.singular).to.equal("barr");
        });

        after(function () {
            this.sequelize.options.hooks = {};
            this.sequelize.modelManager.removeModel(this.model);
        });
    });

    describe("#init", () => {
        before(function () {
            orm.hooks.add("beforeInit", (config, options) => {
                config.database = "db2";
                options.host = "server9";
            });

            orm.hooks.add("afterInit", (sequelize) => {
                sequelize.options.protocol = "udp";
            });

            this.seq = orm.create("db", "user", "pass", { dialect });
        });

        it("beforeInit hook can alter config", function () {
            expect(this.seq.config.database).to.equal("db2");
        });

        it("beforeInit hook can alter options", function () {
            expect(this.seq.options.host).to.equal("server9");
        });

        it("afterInit hook can alter options", function () {
            expect(this.seq.options.protocol).to.equal("udp");
        });

        after(() => {
            orm.hooks.removeAll();
        });
    });

    describe("passing DAO instances", () => {
        describe("beforeValidate / afterValidate", () => {
            it("should pass a DAO instance to the hook", function () {
                let beforeHooked = false;
                let afterHooked = false;
                const User = this.sequelize.define("User", {
                    username: type.STRING
                }, {
                    hooks: {
                        beforeValidate(user) {
                            expect(user).to.be.instanceof(User);
                            beforeHooked = true;
                            return Promise.resolve();
                        },
                        afterValidate(user) {
                            expect(user).to.be.instanceof(User);
                            afterHooked = true;
                            return Promise.resolve();
                        }
                    }
                });

                return User.sync({ force: true }).then(() => {
                    return User.create({ username: "bob" }).then(() => {
                        expect(beforeHooked).to.be.true();
                        expect(afterHooked).to.be.true();
                    });
                });
            });
        });

        describe("beforeCreate / afterCreate", () => {
            it("should pass a DAO instance to the hook", function () {
                let beforeHooked = false;
                let afterHooked = false;
                const User = this.sequelize.define("User", {
                    username: type.STRING
                }, {
                    hooks: {
                        beforeCreate(user) {
                            expect(user).to.be.instanceof(User);
                            beforeHooked = true;
                            return Promise.resolve();
                        },
                        afterCreate(user) {
                            expect(user).to.be.instanceof(User);
                            afterHooked = true;
                            return Promise.resolve();
                        }
                    }
                });

                return User.sync({ force: true }).then(() => {
                    return User.create({ username: "bob" }).then(() => {
                        expect(beforeHooked).to.be.true();
                        expect(afterHooked).to.be.true();
                    });
                });
            });
        });

        describe("beforeDestroy / afterDestroy", () => {
            it("should pass a DAO instance to the hook", function () {
                let beforeHooked = false;
                let afterHooked = false;
                const User = this.sequelize.define("User", {
                    username: type.STRING
                }, {
                    hooks: {
                        beforeDestroy(user) {
                            expect(user).to.be.instanceof(User);
                            beforeHooked = true;
                            return Promise.resolve();
                        },
                        afterDestroy(user) {
                            expect(user).to.be.instanceof(User);
                            afterHooked = true;
                            return Promise.resolve();
                        }
                    }
                });

                return User.sync({ force: true }).then(() => {
                    return User.create({ username: "bob" }).then((user) => {
                        return user.destroy().then(() => {
                            expect(beforeHooked).to.be.true();
                            expect(afterHooked).to.be.true();
                        });
                    });
                });
            });
        });

        describe("beforeDelete / afterDelete", () => {
            it("should pass a DAO instance to the hook", function () {
                let beforeHooked = false;
                let afterHooked = false;
                const User = this.sequelize.define("User", {
                    username: type.STRING
                }, {
                    hooks: {
                        beforeDelete(user) {
                            expect(user).to.be.instanceof(User);
                            beforeHooked = true;
                            return Promise.resolve();
                        },
                        afterDelete(user) {
                            expect(user).to.be.instanceof(User);
                            afterHooked = true;
                            return Promise.resolve();
                        }
                    }
                });

                return User.sync({ force: true }).then(() => {
                    return User.create({ username: "bob" }).then((user) => {
                        return user.destroy().then(() => {
                            expect(beforeHooked).to.be.true();
                            expect(afterHooked).to.be.true();
                        });
                    });
                });
            });
        });

        describe("beforeUpdate / afterUpdate", () => {
            it("should pass a DAO instance to the hook", function () {
                let beforeHooked = false;
                let afterHooked = false;
                const User = this.sequelize.define("User", {
                    username: type.STRING
                }, {
                    hooks: {
                        beforeUpdate(user) {
                            expect(user).to.be.instanceof(User);
                            beforeHooked = true;
                            return Promise.resolve();
                        },
                        afterUpdate(user) {
                            expect(user).to.be.instanceof(User);
                            afterHooked = true;
                            return Promise.resolve();
                        }
                    }
                });

                return User.sync({ force: true }).then(() => {
                    return User.create({ username: "bob" }).then((user) => {
                        user.username = "bawb";
                        return user.save({ fields: ["username"] }).then(() => {
                            expect(beforeHooked).to.be.true();
                            expect(afterHooked).to.be.true();
                        });
                    });
                });
            });
        });
    });

    describe("Model#sync", () => {
        describe("on success", () => {
            it("should run hooks", function () {
                const beforeHook = spy();
                const afterHook = spy();

                this.User.beforeSync(beforeHook);
                this.User.afterSync(afterHook);

                return this.User.sync().then(() => {
                    expect(beforeHook).to.have.been.calledOnce;
                    expect(afterHook).to.have.been.calledOnce;
                });
            });

            it('should not run hooks when "hooks = false" option passed', function () {
                const beforeHook = spy();
                const afterHook = spy();

                this.User.beforeSync(beforeHook);
                this.User.afterSync(afterHook);

                return this.User.sync({ hooks: false }).then(() => {
                    expect(beforeHook).to.not.have.been.called;
                    expect(afterHook).to.not.have.been.called;
                });
            });

        });

        describe("on error", () => {
            it("should return an error from before", async function () {
                const beforeHook = spy();
                const afterHook = spy();

                this.User.beforeSync(() => {
                    beforeHook();
                    throw new Error("Whoops!");
                });
                this.User.afterSync(afterHook);

                await assert.throws(async () => {
                    await this.User.sync();
                });

                expect(beforeHook).to.have.been.calledOnce;
                expect(afterHook).not.to.have.been.called;
            });

            it("should return an error from after", async function () {
                const beforeHook = spy();
                const afterHook = spy();

                this.User.beforeSync(beforeHook);
                this.User.afterSync(() => {
                    afterHook();
                    throw new Error("Whoops!");
                });

                await assert.throws(async () => {
                    await this.User.sync();
                });

                expect(beforeHook).to.have.been.calledOnce;
                expect(afterHook).to.have.been.calledOnce;
            });
        });
    });

    describe("sequelize#sync", () => {
        describe("on success", () => {
            it("should run hooks", function () {
                const beforeHook = spy();
                const afterHook = spy();
                const modelBeforeHook = spy();
                const modelAfterHook = spy();

                this.sequelize.beforeBulkSync(beforeHook);
                this.User.beforeSync(modelBeforeHook);
                this.User.afterSync(modelAfterHook);
                this.sequelize.afterBulkSync(afterHook);

                return this.sequelize.sync().then(() => {
                    expect(beforeHook).to.have.been.calledOnce;
                    expect(modelBeforeHook).to.have.been.calledOnce;
                    expect(modelAfterHook).to.have.been.calledOnce;
                    expect(afterHook).to.have.been.calledOnce;
                });
            });

            it('should not run hooks if "hooks = false" option passed', function () {
                const beforeHook = spy();
                const afterHook = spy();
                const modelBeforeHook = spy();
                const modelAfterHook = spy();

                this.sequelize.beforeBulkSync(beforeHook);
                this.User.beforeSync(modelBeforeHook);
                this.User.afterSync(modelAfterHook);
                this.sequelize.afterBulkSync(afterHook);

                return this.sequelize.sync({ hooks: false }).then(() => {
                    expect(beforeHook).to.not.have.been.called;
                    expect(modelBeforeHook).to.not.have.been.called;
                    expect(modelAfterHook).to.not.have.been.called;
                    expect(afterHook).to.not.have.been.called;
                });
            });

            afterEach(function () {
                this.sequelize.options.hooks = {};
            });

        });

        describe("on error", () => {

            it("should return an error from before", async function () {
                const beforeHook = spy();
                const afterHook = spy();
                this.sequelize.beforeBulkSync(() => {
                    beforeHook();
                    throw new Error("Whoops!");
                });
                this.sequelize.afterBulkSync(afterHook);

                await assert.throws(async () => {
                    await this.sequelize.sync();
                });

                expect(beforeHook).to.have.been.calledOnce;
                expect(afterHook).not.to.have.been.called;
            });

            it("should return an error from after", async function () {
                const beforeHook = spy();
                const afterHook = spy();

                this.sequelize.beforeBulkSync(beforeHook);
                this.sequelize.afterBulkSync(() => {
                    afterHook();
                    throw new Error("Whoops!");
                });

                await assert.throws(async () => {
                    await this.sequelize.sync();
                });

                expect(beforeHook).to.have.been.calledOnce;
                expect(afterHook).to.have.been.calledOnce;
            });

            afterEach(function () {
                this.sequelize.options.hooks = {};
            });

        });
    });

    describe("#removal", () => {
        it("should be able to remove by name", function () {
            const sasukeHook = spy();
            const narutoHook = spy();

            this.User.hook("beforeCreate", "sasuke", sasukeHook);
            this.User.hook("beforeCreate", "naruto", narutoHook);

            return this.User.create({ username: "makunouchi" }).then(() => {
                expect(sasukeHook).to.have.been.calledOnce;
                expect(narutoHook).to.have.been.calledOnce;
                this.User.removeHook("beforeCreate", "sasuke");
                return this.User.create({ username: "sendo" });
            }).then(() => {
                expect(sasukeHook).to.have.been.calledOnce;
                expect(narutoHook).to.have.been.calledTwice;
            });
        });

        it("should be able to remove by reference", function () {
            const sasukeHook = spy();
            const narutoHook = spy();

            this.User.hook("beforeCreate", sasukeHook);
            this.User.hook("beforeCreate", narutoHook);

            return this.User.create({ username: "makunouchi" }).then(() => {
                expect(sasukeHook).to.have.been.calledOnce;
                expect(narutoHook).to.have.been.calledOnce;
                this.User.removeHook("beforeCreate", sasukeHook);
                return this.User.create({ username: "sendo" });
            }).then(() => {
                expect(sasukeHook).to.have.been.calledOnce;
                expect(narutoHook).to.have.been.calledTwice;
            });
        });

        it("should be able to remove proxies", function () {
            const sasukeHook = spy();
            const narutoHook = spy();

            this.User.hook("beforeSave", sasukeHook);
            this.User.hook("beforeSave", narutoHook);

            return this.User.create({ username: "makunouchi" }).then((user) => {
                expect(sasukeHook).to.have.been.calledOnce;
                expect(narutoHook).to.have.been.calledOnce;
                this.User.removeHook("beforeSave", sasukeHook);
                return user.updateAttributes({ username: "sendo" });
            }).then(() => {
                expect(sasukeHook).to.have.been.calledOnce;
                expect(narutoHook).to.have.been.calledTwice;
            });
        });

    });
});
