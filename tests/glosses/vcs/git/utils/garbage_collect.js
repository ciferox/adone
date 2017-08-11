// aggressively collects garbage until we fail to improve terminatingIterations times.
export const garbageCollect = () => {
    const terminatingIterations = 3;
    let usedBeforeGC = Number.MAX_VALUE;
    let nondecreasingIterations = 0;
    for (; ;) {
        global.gc();
        const usedAfterGC = process.memoryUsage().heapUsed;
        if (usedAfterGC >= usedBeforeGC) {
            nondecreasingIterations++;
            if (nondecreasingIterations >= terminatingIterations) {
                break;
            }
        }
        usedBeforeGC = usedAfterGC;
    }
};
