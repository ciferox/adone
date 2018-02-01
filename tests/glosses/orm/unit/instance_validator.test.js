describe("instance validator", function () {
    const InstanceValidator = adone.private(adone.orm).InstanceValidator;
    const ValidationError = adone.orm.exception.ValidationError;
    const { orm } = adone;
    const { type } = orm;

    beforeEach(() => {
        this.User = this.sequelize.define("user", {
            fails: {
                type: type.BOOLEAN,
                validate: {
                    isNotTrue(value) {
                        if (value) {
                            throw Error("Manual model validation failure");
                        }
                    }
                }
            }
        });
    });

    it("configures itself to run hooks by default", () => {
        const instanceValidator = new InstanceValidator();
        expect(instanceValidator.options.hooks).to.equal(true);
    });

    describe("validate", () => {
        it("runs the validation sequence and hooks when the hooks option is true", () => {
            const instanceValidator = new InstanceValidator(this.User.build(), { hooks: true });
            const _validate = spy(instanceValidator, "_validate");
            const _validateAndRunHooks = spy(instanceValidator, "_validateAndRunHooks");

            instanceValidator.validate();

            expect(_validateAndRunHooks).to.have.been.calledOnce();
            expect(_validate).to.not.have.been.called();
        });

        it("runs the validation sequence but skips hooks if the hooks option is false", () => {
            const instanceValidator = new InstanceValidator(this.User.build(), { hooks: false });
            const _validate = spy(instanceValidator, "_validate");
            const _validateAndRunHooks = spy(instanceValidator, "_validateAndRunHooks");

            instanceValidator.validate();

            expect(_validate).to.have.been.calledOnce();
            expect(_validateAndRunHooks).to.not.have.been.called();
        });

        it("fulfills when validation is successful", async () => {
            const instanceValidator = new InstanceValidator(this.User.build());

            await instanceValidator.validate();
        });

        it("rejects with a validation error when validation fails", async () => {
            const instanceValidator = new InstanceValidator(this.User.build({ fails: true }));

            const err = await assert.throws(async () => {
                await instanceValidator.validate();
            });
            expect(err).to.be.instanceof(ValidationError);
        });

        it("has a useful default error message for not null validation failures", async () => {
            const User = this.sequelize.define("user", {
                name: {
                    type: type.STRING,
                    allowNull: false
                }
            });

            const instanceValidator = new InstanceValidator(User.build());

            const err = await assert.throws(async () => {
                await instanceValidator.validate();
            }, /user\.name cannot be null/);

            expect(err).to.be.instanceof(ValidationError);
        });
    });

    describe("_validateAndRunHooks", () => {
        beforeEach(() => {
            this.successfulInstanceValidator = new InstanceValidator(this.User.build());
            stub(this.successfulInstanceValidator, "_validate").returns(Promise.resolve());
        });

        it("should run beforeValidate and afterValidate hooks when _validate is successful", async () => {
            const beforeValidate = spy();
            const afterValidate = spy();
            this.User.beforeValidate(beforeValidate);
            this.User.afterValidate(afterValidate);

            await this.successfulInstanceValidator._validateAndRunHooks();
            expect(beforeValidate).to.have.been.calledOnce();
            expect(afterValidate).to.have.been.calledOnce();
        });

        it("should run beforeValidate hook but not afterValidate hook when _validate is unsuccessful", async () => {
            const failingInstanceValidator = new InstanceValidator(this.User.build());
            stub(failingInstanceValidator, "_validate").callsFake(() => {
                return Promise.reject(new Error());
            });
            const beforeValidate = spy();
            const afterValidate = spy();
            this.User.beforeValidate(beforeValidate);
            this.User.afterValidate(afterValidate);

            await assert.throws(async () => {
                await failingInstanceValidator._validateAndRunHooks();
            });

            expect(beforeValidate).to.have.been.calledOnce();
            expect(afterValidate).to.not.have.been.called();
        });

        it("should emit an error from after hook when afterValidate fails", async () => {
            this.User.afterValidate(() => {
                throw new Error("after validation error");
            });

            await assert.throws(async () => {
                await this.successfulInstanceValidator._validateAndRunHooks();
            }, "after validation error");
        });

        describe("validatedFailed hook", () => {
            it("should call validationFailed hook when validation fails", async () => {
                const failingInstanceValidator = new InstanceValidator(this.User.build());
                stub(failingInstanceValidator, "_validate").callsFake(() => {
                    return Promise.reject(new Error());
                });
                const validationFailedHook = spy();
                this.User.validationFailed(validationFailedHook);

                await assert.throws(async () => {
                    await failingInstanceValidator._validateAndRunHooks();
                });

                expect(validationFailedHook).to.have.been.calledOnce();
            });

            it("should not replace the validation error in validationFailed hook by default", async () => {
                const failingInstanceValidator = new InstanceValidator(this.User.build());
                stub(failingInstanceValidator, "_validate").callsFake(() => {
                    return Promise.reject(new ValidationError());
                });
                const validationFailedHook = stub().returns(Promise.resolve());
                this.User.validationFailed(validationFailedHook);

                const err = await assert.throws(async () => {
                    await failingInstanceValidator._validateAndRunHooks();
                });
                expect(err.name).to.be.equal("ValidationError");
            });

            it("should replace the validation error if validationFailed hook creates a new error", async () => {
                const failingInstanceValidator = new InstanceValidator(this.User.build());
                stub(failingInstanceValidator, "_validate").callsFake(() => {
                    return Promise.reject(new ValidationError());
                });
                const validationFailedHook = stub().throws(new Error("validation failed hook error"));
                this.User.validationFailed(validationFailedHook);

                await assert.throws(async () => {
                    await failingInstanceValidator._validateAndRunHooks();
                }, "validation failed hook error");
            });
        });
    });
});
