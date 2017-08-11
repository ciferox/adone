import { garbageCollect } from "./garbage_collect.js";

export const leakTest = (Type, getInstance) => {
    garbageCollect();
    const startSelfFreeingCount = Type.getSelfFreeingInstanceCount();
    const startNonSelfFreeingCount = Type.getNonSelfFreeingConstructedCount();

    let resolve;
    const promise = new Promise(((_resolve) => {
        resolve = _resolve;
    }));

    getInstance().then(() => {
        const selfFreeingCount = Type.getSelfFreeingInstanceCount();
        assert.equal(startSelfFreeingCount + 1, selfFreeingCount);
        // get out of this promise chain to help GC get rid of the commit
        setTimeout(resolve, 0);
    });

    return promise.then(() => {
        garbageCollect();
        const endSelfFreeingCount = Type.getSelfFreeingInstanceCount();
        const endNonSelfFreeingCount = Type.getNonSelfFreeingConstructedCount();
        // any new self-freeing commits should have been freed
        assert.equal(startSelfFreeingCount, endSelfFreeingCount);
        // no new non-self-freeing commits should have been constructed
        assert.equal(startNonSelfFreeingCount, endNonSelfFreeingCount);
    });
};
