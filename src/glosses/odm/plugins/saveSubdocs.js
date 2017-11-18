const each = require("async/each");

/*!
 * ignore
 */

module.exports = function (schema) {
    schema.callQueue.unshift(["pre", ["save", function (next) {
        if (this.ownerDocument) {
            next();
            return;
        }

        const _this = this;
        const subdocs = this.$__getAllSubdocs();

        if (!subdocs.length) {
            next();
            return;
        }

        each(subdocs, (subdoc, cb) => {
            subdoc.save((err) => {
                cb(err);
            });
        }, (error) => {
            if (error) {
                return _this.schema.s.hooks.execPost("save:error", _this, [_this], { error }, (error) => {
                    next(error);
                });
            }
            next();
        });
    }]]);
};
