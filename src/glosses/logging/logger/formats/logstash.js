const {
    logging: { logger: { format } },
    data: { json }
} = adone;

/**
 * function logstash (info)
 * Returns a new instance of the LogStash Format that turns a
 * log `info` object into pure JSON with the appropriate logstash
 * options.
 */
export default format((info) => {
    const logstash = {};
    if (info.message) {
        logstash["@message"] = info.message;
        delete info.message;
    }

    if (info.timestamp) {
        logstash["@timestamp"] = info.timestamp;
        delete info.timestamp;
    }

    logstash["@fields"] = info;
    info[adone.logging.logger.MESSAGE] = json.encodeSafe(logstash);
    return info;
});
