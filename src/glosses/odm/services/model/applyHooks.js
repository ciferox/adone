const PromiseProvider = require("../../promise_provider");
const VersionError = require("../../error").VersionError;

const {
    is
} = adone;

/*!
 * Register hooks for this model
 *
 * @param {Model} model
 * @param {Schema} schema
 */

const applyHooks = (model, schema) => {
    const q = schema && schema.callQueue;
    let toWrapEl;
    let len;
    let i;
    let j;
    let pointCut;
    let keys;
    let newName;

    model.$appliedHooks = true;
    for (i = 0; i < schema.childSchemas.length; ++i) {
        const childModel = schema.childSchemas[i].model;
        if (childModel.$appliedHooks) {
            continue;
        }
        applyHooks(childModel, schema.childSchemas[i].schema);
        if (!is.nil(childModel.discriminators)) {
            keys = Object.keys(childModel.discriminators);
            for (j = 0; j < keys.length; ++j) {
                applyHooks(childModel.discriminators[keys[j]],
                    childModel.discriminators[keys[j]].schema);
            }
        }
    }

    if (!q.length) {
        return;
    }

    // we are only interested in 'pre' hooks, and group by point-cut
    const toWrap = { post: [] };
    let pair;

    for (i = 0; i < q.length; ++i) {
        pair = q[i];
        if (pair[0] !== "pre" && pair[0] !== "post" && pair[0] !== "on") {
            continue;
        }
        var args = [].slice.call(pair[1]);
        pointCut = pair[0] === "on" ? "post" : args[0];
        if (!(pointCut in toWrap)) {
            toWrap[pointCut] = { post: [], pre: [] };
        }
        if (pair[0] === "post") {
            toWrap[pointCut].post.push(args);
        } else if (pair[0] === "on") {
            toWrap[pointCut].push(args);
        } else {
            toWrap[pointCut].pre.push(args);
        }
    }

    // 'post' hooks are simpler
    len = toWrap.post.length;
    toWrap.post.forEach((args) => {
        model.on.apply(model, args);
    });
    delete toWrap.post;

    // 'init' should be synchronous on subdocuments
    if (toWrap.init && (model.$isSingleNested || model.$isArraySubdocument)) {
        if (toWrap.init.pre) {
            toWrap.init.pre.forEach((args) => {
                model.prototype.$pre.apply(model.prototype, args);
            });
        }
        if (toWrap.init.post) {
            toWrap.init.post.forEach((args) => {
                model.prototype.$post.apply(model.prototype, args);
            });
        }
        delete toWrap.init;
    }
    if (toWrap.set) {
        // Set hooks also need to be sync re: gh-3479
        newName = "$__original_set";
        model.prototype[newName] = model.prototype.set;
        if (toWrap.set.pre) {
            toWrap.set.pre.forEach((args) => {
                model.prototype.$pre.apply(model.prototype, args);
            });
        }
        if (toWrap.set.post) {
            toWrap.set.post.forEach((args) => {
                model.prototype.$post.apply(model.prototype, args);
            });
        }
        delete toWrap.set;
    }

    toWrap.validate = toWrap.validate || { pre: [], post: [] };

    keys = Object.keys(toWrap);
    len = keys.length;
    for (i = 0; i < len; ++i) {
        pointCut = keys[i];
        // this is so we can wrap everything into a promise;
        newName = (`$__original_${pointCut}`);
        if (!model.prototype[pointCut]) {
            continue;
        }
        if (model.prototype[pointCut].$isWrapped) {
            continue;
        }
        if (!model.prototype[pointCut].$originalFunction) {
            model.prototype[newName] = model.prototype[pointCut];
        }
        model.prototype[pointCut] = (function (_newName) {
            return function wrappedPointCut() {
                const Promise = PromiseProvider.get();

                const _this = this;
                const args = [].slice.call(arguments);
                const lastArg = args.pop();
                let fn;
                const originalError = new Error();
                let $results;
                if (lastArg && !is.function(lastArg)) {
                    args.push(lastArg);
                } else {
                    fn = lastArg;
                }

                var promise = new Promise.ES6(((resolve, reject) => {
                    args.push(function (error) {
                        if (error) {
                            // gh-2633: since VersionError is very generic, take the
                            // stack trace of the original save() function call rather
                            // than the async trace
                            if (error instanceof VersionError) {
                                error.stack = originalError.stack;
                            }
                            if (!fn) {
                                _this.$__handleReject(error);
                            }
                            reject(error);
                            return;
                        }

                        // There may be multiple results and promise libs other than
                        // mpromise don't support passing multiple values to `resolve()`
                        $results = Array.prototype.slice.call(arguments, 1);
                        resolve.apply(promise, $results);
                    });

                    _this[_newName].apply(_this, args);
                }));
                if (fn) {
                    if (this.constructor.$wrapCallback) {
                        fn = this.constructor.$wrapCallback(fn);
                    }
                    promise.then(
                        () => {
                            process.nextTick(() => {
                                fn.apply(null, [null].concat($results));
                            });
                        },
                        (error) => {
                            process.nextTick(() => {
                                fn(error);
                            });
                        });
                }
                return promise;
            };
        })(newName);
        model.prototype[pointCut].$originalFunction = newName;
        model.prototype[pointCut].$isWrapped = true;

        toWrapEl = toWrap[pointCut];
        let _len = toWrapEl.pre.length;
        for (j = 0; j < _len; ++j) {
            args = toWrapEl.pre[j];
            args[0] = newName;
            model.prototype.$pre.apply(model.prototype, args);
        }

        _len = toWrapEl.post.length;
        for (j = 0; j < _len; ++j) {
            args = toWrapEl.post[j];
            args[0] = newName;
            model.prototype.$post.apply(model.prototype, args);
        }
    }
};

module.exports = applyHooks;
