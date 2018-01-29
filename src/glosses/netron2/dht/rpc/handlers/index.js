const T = require("../../message").TYPES;

module.exports = (dht) => {
    const handlers = {
        [T.GET_VALUE]: require("./get_value")(dht),
        [T.PUT_VALUE]: require("./put_value")(dht),
        [T.FIND_NODE]: require("./find_node")(dht),
        [T.ADD_PROVIDER]: require("./add_provider")(dht),
        [T.GET_PROVIDERS]: require("./get_providers")(dht),
        [T.PING]: require("./ping")(dht)
    };

    /**
     * Get the message handler matching the passed in type.
     *
     * @param {number} type
     *
     * @returns {function(PeerInfo, Message, function(Error, Message))}
     *
     * @private
     */
    return function getMessageHandler(type) {
        return handlers[type];
    };
};
