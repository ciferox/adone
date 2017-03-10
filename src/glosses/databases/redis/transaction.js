

const imports = adone.lazify({
    Pipeline: "./pipeline",
    utils: "./utils"
}, null, require);


export function addTransactionSupport(redis) {
    redis.pipeline = function (commands) {
        const pipeline = new imports.Pipeline(this);
        if (adone.is.array(commands)) {
            pipeline.addBatch(commands);
        }
        return pipeline;
    };

    const { multi } = redis;
    redis.multi = function (commands, options) {
        const { is } = adone;
        if (is.undefined(options) && !is.array(commands)) {
            options = commands;
            commands = null;
        }
        if (options && options.pipeline === false) {
            return multi.call(this);
        }
        const pipeline = new imports.Pipeline(this);
        pipeline.multi();
        if (is.array(commands)) {
            pipeline.addBatch(commands);
        }
        const exec = pipeline.exec;
        pipeline.exec = function (callback) {
            if (this._transactions > 0) {
                exec.call(pipeline);
            }
            return adone.promise.nodeify(exec.call(pipeline).then((result) => {
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
                return imports.utils.wrapMultiResult(execResult[1]);
            }), callback);
        };

        const execBuffer = pipeline.execBuffer;
        pipeline.execBuffer = function (callback) {
            if (this._transactions > 0) {
                execBuffer.call(pipeline);
            }
            return pipeline.exec(callback);
        };
        return pipeline;
    };

    const { exec } = redis;
    redis.exec = function (callback) {
        return adone.promise.nodeify(exec.call(this).then((results) => {
            if (adone.is.array(results)) {
                results = imports.utils.wrapMultiResult(results);
            }
            return results;
        }), callback);
    };
}