const {
    stream: { pull }
} = adone;

const endable = require("./endable");

module.exports = function (stream, goodbye) {
    goodbye = goodbye || "GOODBYE";
    const e = endable(goodbye);

    return {
        // when the source ends,
        // send the goodbye and then wait to recieve
        // the other goodbye.
        source: pull(stream.source, e),
        sink: pull(
            //when the goodbye is received, allow the source to end.
            pull.filter((data) => {
                if (data !== goodbye) {
                    return true;
                }
                e.end();
            }),
            stream.sink
        )
    };
};


// import endable from "./endable";

// const {
//     is
// } = adone;

// const goodbye = (stream, goodbye) => {
//     goodbye = goodbye || Buffer.from("GOODBYE");
//     const e = endable(goodbye);
//     const isBufferCompatible = is.buffer(goodbye) || is.string(goodbye);
//     const token = isBufferCompatible ? Buffer.from(goodbye) : goodbye;

//     return {
//         // when the source ends,
//         // send the goodbye and then wait to recieve
//         // the other goodbye.
//         source: e(stream.source),
//         sink: (source) => stream.sink((async function* () {
//             // when the goodbye is received, allow the source to end.
//             if (isBufferCompatible) {
//                 for await (const chunk of source) {
//                     const buff = Buffer.from(chunk);
//                     const done = buff.slice(-token.length).equals(token);
//                     if (done) {
//                         const remaining = buff.length - token.length;
//                         if (remaining > 0) {
//                             yield buff.slice(0, remaining);
//                         }
//                         e.end();
//                     } else {
//                         yield buff;
//                     }
//                 }
//             } else {
//                 for await (const chunk of source) {
//                     if (chunk === goodbye) {
//                         e.end();
//                     } else {
//                         yield chunk;
//                     }
//                 }
//             }
//         })())
//     };
// };

// goodbye.endable = endable;
// export default goodbye;
