module.exports = function (schema) {
    schema.callQueue.unshift(["pre", ["save", function (next, options) {
        const _this = this;
        // Nested docs have their own presave
        if (this.ownerDocument) {
            return next();
        }

        const hasValidateBeforeSaveOption = options &&
            (typeof options === "object") &&
            ("validateBeforeSave" in options);

        let shouldValidate;
        if (hasValidateBeforeSaveOption) {
            shouldValidate = Boolean(options.validateBeforeSave);
        } else {
            shouldValidate = this.schema.options.validateBeforeSave;
        }

        // Validate
        if (shouldValidate) {
            // HACK: use $__original_validate to avoid promises so bluebird doesn't
            // complain
            if (this.$__original_validate) {
                this.$__original_validate({ __noPromise: true }, (error) => {
                    return _this.schema.s.hooks.execPost("save:error", _this, [_this], { error }, (error) => {
                        next(error);
                    });
                });
            } else {
                this.validate({ __noPromise: true }, (error) => {
                    return _this.schema.s.hooks.execPost("save:error", _this, [_this], { error }, (error) => {
                        next(error);
                    });
                });
            }
        } else {
            next();
        }
    }]]);
};
