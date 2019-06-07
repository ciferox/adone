module.exports = function endable(goodbye) {
    let ended; let waiting; let sentEnd;
    function h(read) {
        return function (abort, cb) {
            read(abort, (end, data) => {
                if (end && !sentEnd) {
                    sentEnd = true;
                    return cb(null, goodbye);
                }
                //send end message...

                if (end && ended) {
                    cb(end);
                } else if (end) {
                    waiting = cb;
                } else {
                    cb(null, data);
                }
            });
        };
    }
    h.end = function () {
        ended = true;
        if (waiting) {
            waiting(ended);
        }
        return h;
    };
    return h;
};



// export default (goodbye) => {
//     const transform = (source) => (async function* () {
//         for await (const val of source) {
//             yield val;
//         }
//         yield goodbye;
//         await ended; // wait for repsonse
//     })();

//     const ended = new Promise((resolve) => {
//         transform.end = resolve;
//     });

//     return transform;
// };

