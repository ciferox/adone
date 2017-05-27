const max = 64;

const items = adone.util.range(max).map(() => Math.random());
const normalKeys = adone.util.range(max);
const randomKeys = adone.util.shuffleArray(normalKeys.slice());

export default {
    set: {
        FastLRU: () => {
            const fastlru = new adone.collection.FastLRU(max);
            for (let i = 0; i < max; ++i) {
                fastlru.set(normalKeys[i], items[i]);
            }
        },
        LRU: () => {
            const lru = new adone.collection.LRU({ max });
            for (let i = 0; i < max; ++i) {
                lru.set(normalKeys[i], items[i]);
            }
        }
    },
    "set + update": {
        FastLRU: () => {
            const fastlru = new adone.collection.FastLRU(max);
            for (let i = 0; i < max; ++i) {
                fastlru.set(normalKeys[i], items[i]);
            }
            for (let i = 0; i < max; ++i) {
                fastlru.set(randomKeys[i], items[i]);
            }
        },
        LRU: () => {
            const lru = new adone.collection.LRU({ max });
            for (let i = 0; i < max; ++i) {
                lru.set(normalKeys[i], items[i]);
            }
            for (let i = 0; i < max; ++i) {
                lru.set(randomKeys[i], items[i]);
            }
        }
    },
    "set + delete": {
        FastLRU: () => {
            const fastlru = new adone.collection.FastLRU(max);
            for (let i = 0; i < max; ++i) {
                fastlru.set(normalKeys[i], items[i]);
            }
            for (let i = 0; i < max; ++i) {
                fastlru.delete(randomKeys[i]);
            }
        },
        LRU: () => {
            const lru = new adone.collection.LRU({ max });
            for (let i = 0; i < max; ++i) {
                lru.set(normalKeys[i], items[i]);
            }
            for (let i = 0; i < max; ++i) {
                lru.del(randomKeys[i]);
            }
        }
    },
    "set + has": {
        FastLRU: () => {
            const fastlru = new adone.collection.FastLRU(max);
            for (let i = 0; i < max; ++i) {
                fastlru.set(normalKeys[i], items[i]);
            }
            for (let i = 0; i < max; ++i) {
                fastlru.has(randomKeys[i]);
            }
        },
        LRU: () => {
            const lru = new adone.collection.LRU({ max });
            for (let i = 0; i < max; ++i) {
                lru.set(normalKeys[i], items[i]);
            }
            for (let i = 0; i < max; ++i) {
                lru.has(randomKeys[i]);
            }
        }
    }
};
