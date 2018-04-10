const maxSize = 64;

const items = adone.util.range(maxSize).map(() => Math.random());
const normalKeys = adone.util.range(maxSize);
const randomKeys = adone.util.shuffleArray(normalKeys.slice());

export default {
    set: {
        FastLRU: () => {
            const fastlru = new adone.collection.FastLRU({ maxSize });
            for (let i = 0; i < maxSize; ++i) {
                fastlru.set(normalKeys[i], items[i]);
            }
        },
        LRU: () => {
            const lru = new adone.collection.LRU({ maxSize });
            for (let i = 0; i < maxSize; ++i) {
                lru.set(normalKeys[i], items[i]);
            }
        }
    },
    "set + update": {
        FastLRU: () => {
            const fastlru = new adone.collection.FastLRU({ maxSize });
            for (let i = 0; i < maxSize; ++i) {
                fastlru.set(normalKeys[i], items[i]);
            }
            for (let i = 0; i < maxSize; ++i) {
                fastlru.set(randomKeys[i], items[i]);
            }
        },
        LRU: () => {
            const lru = new adone.collection.LRU({ maxSize });
            for (let i = 0; i < maxSize; ++i) {
                lru.set(normalKeys[i], items[i]);
            }
            for (let i = 0; i < maxSize; ++i) {
                lru.set(randomKeys[i], items[i]);
            }
        }
    },
    "set + delete": {
        FastLRU: () => {
            const fastlru = new adone.collection.FastLRU({ maxSize });
            for (let i = 0; i < maxSize; ++i) {
                fastlru.set(normalKeys[i], items[i]);
            }
            for (let i = 0; i < maxSize; ++i) {
                fastlru.delete(randomKeys[i]);
            }
        },
        LRU: () => {
            const lru = new adone.collection.LRU({ maxSize });
            for (let i = 0; i < maxSize; ++i) {
                lru.set(normalKeys[i], items[i]);
            }
            for (let i = 0; i < maxSize; ++i) {
                lru.del(randomKeys[i]);
            }
        }
    },
    "set + has": {
        FastLRU: () => {
            const fastlru = new adone.collection.FastLRU({ maxSize });
            for (let i = 0; i < maxSize; ++i) {
                fastlru.set(normalKeys[i], items[i]);
            }
            for (let i = 0; i < maxSize; ++i) {
                fastlru.has(randomKeys[i]);
            }
        },
        LRU: () => {
            const lru = new adone.collection.LRU({ maxSize });
            for (let i = 0; i < maxSize; ++i) {
                lru.set(normalKeys[i], items[i]);
            }
            for (let i = 0; i < maxSize; ++i) {
                lru.has(randomKeys[i]);
            }
        }
    }
};
