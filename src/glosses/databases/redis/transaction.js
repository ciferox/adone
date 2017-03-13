const { database: { redis }, is, promise } = adone;

export const addTransactionSupport = (instance) => {
    instance.pipeline = function (commands) {
        const pipeline = new redis.Pipeline(this);
        if (is.array(commands)) {
            pipeline.addBatch(commands);
        }
        return pipeline;
    };

    const { multi } = instance;
    instance.multi = function (commands, options) {
        if (is.undefined(options) && !is.array(commands)) {
            [commands, options] = [null, commands];
        }
        if (options && options.pipeline === false) {
            return multi.call(this);
        }
        const pipeline = new redis.Pipeline(this);
        pipeline.multi();
        if (is.array(commands)) {
            pipeline.addBatch(commands);
        }
        const exec = pipeline.exec;
        pipeline.exec = function (callback) {
            if (this._transactions > 0) {
                exec.call(pipeline);
            }
            return promise.nodeify(exec.call(pipeline).then((result) => {
                const execResult = result[result.length - 1];
                if (execResult[0]) {
                    execResult[0].previousErrors = [];
                    for (let i = 0; i < result.length - 1; ++i) {
                        if (result[i][0]) {
                            execResult[0].previousErrors.push(result[i][0]);
                        }
                    }
                    throw execResult[0];
                }
                return redis.util.wrapMultiResult(execResult[1]);
            }), callback);
        };

        const { execBuffer } = pipeline;
        pipeline.execBuffer = function (callback) {
            if (this._transactions > 0) {
                execBuffer.call(pipeline);
            }
            return pipeline.exec(callback);
        };
        return pipeline;
    };

    const { exec } = instance;
    instance.exec = function (callback) {
        return promise.nodeify(exec.call(this).then((results) => {
            if (is.array(results)) {
                results = redis.util.wrapMultiResult(results);
            }
            return results;
        }), callback);
    };
};
