const { lazify } = adone;

const redis = lazify({
    __: "./__",
    x: "./x",
    Cluster: "./cluster",
    Redis: "./redis"
}, exports, require);

export const createClient = (...args) => new redis.Redis(...args);
