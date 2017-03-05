/**
 * Tiny class to simplify dealing with subscription set
 *
 * @constructor
 * @private
 */
export default class SubscriptionSet {
    constructor() {
        this.set = {
            subscribe: new Map(),
            psubscribe: new Map()
        };
    }

    add(set, channel) {
        this.set[mapSet(set)].set(channel, true);
    }

    del(set, channel) {
        this.set[mapSet(set)].delete(channel);
    }

    channels(set) {
        return Array.from(this.set[mapSet(set)].keys());
    }

    isEmpty() {
        return this.set.subscribe.size === 0 && this.set.psubscribe.size === 0;
    }
}

function mapSet(set) {
    if (set === "unsubscribe") {
        return "subscribe";
    }
    if (set === "punsubscribe") {
        return "psubscribe";
    }
    return set;
}
