// @flow



const { is, core, collection: { LinkedList } } = adone;

export default class Filter {
    constructor() {
        this.named = new Map();
        this.unnamed = new LinkedList();
    }

    stash(name, filter) {
        if (is.function(name)) {
            [name, filter] = [null, name];
        }
        const stashStream = core();
        if (name) {
            this.named.set(name, stashStream);
        } else {
            this.unnamed.push(stashStream);
        }
        return core(null, {
            async transform(x) {
                const stash = await filter(x);
                if (stash) {
                    if (!stashStream.push(x)) {
                        this.pause();
                    }
                } else {
                    this.push(x);
                }
            }
        });
    }

    clear() {
        this.unnamed.clear(true);
        this.named.clear();
    }

    unstash(name = null) {
        if (name === null) {
            const streams = [...this.unnamed.toArray(), ...this.named.values()];
            if (!streams.length) {
                return core();
            }
            this.clear();
            return core.merge(streams, { end: false });
        }
        if (!this.named.has(name)) {
            return core();
        }
        const stream = this.named.get(name);
        this.named.delete(name);
        return stream;
    }
}
