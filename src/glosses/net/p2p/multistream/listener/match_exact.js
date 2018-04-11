/**
 * Match protocols exactly.
 *
 * @param {string} myProtocol
 * @param {string} senderProtocol
 * @param {function(Error, boolean)} callback
 * @returns {undefined}
 * @type {matchHandler}
 */
export default function (myProtocol, senderProtocol, callback) {
    const result = myProtocol === senderProtocol;
    callback(null, result);
}
