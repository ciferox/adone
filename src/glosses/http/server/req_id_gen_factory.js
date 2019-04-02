

module.exports = function (requestIdHeader) {
    const maxInt = 2147483647;
    let nextReqId = 0;
    return function genReqId(req) {
        return req.headers[requestIdHeader] || (nextReqId = (nextReqId + 1) & maxInt);
    };
};
