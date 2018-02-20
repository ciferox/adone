export default function debugPouch(PouchDB) {
    const logs = {};
    /* istanbul ignore next */
    PouchDB.on("debug", (args) => {
        // first argument is log identifier
        const logId = args[0];
        // rest should be passed verbatim to debug module
        const logArgs = args.slice(1);
        if (!logs[logId]) {
            logs[logId] = (...args) => adone.logDebug(`pouchdb:${logId}`, ...args);
        }
        logs[logId].apply(null, logArgs);
    });
}
