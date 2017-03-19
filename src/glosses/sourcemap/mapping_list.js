const { sourcemap } = adone;

const generatedPositionAfter = (mappingA, mappingB) => {
    const lineA = mappingA.generatedLine;
    const lineB = mappingB.generatedLine;
    const columnA = mappingA.generatedColumn;
    const columnB = mappingB.generatedColumn;
    return lineB > lineA ||
           (lineB === lineA && columnB >= columnA) ||
           sourcemap.util.compareByGeneratedPositionsInflated(mappingA, mappingB) <= 0;
};

export default class MappingList {
    constructor() {
        this._array = [];
        this._sorted = true;
        this._last = { generatedLine: -1, generatedColumn: 0 };
    }

    unsortedForEach(callback, thisValue) {
        this._array.forEach(callback, thisValue);
    }

    add(mapping) {
        if (generatedPositionAfter(this._last, mapping)) {
            this._last = mapping;
        } else {
            this._sorted = false;
        }
        this._array.push(mapping);
    }

    toArray() {
        if (!this._sorted) {
            this._array.sort(sourcemap.util.compareByGeneratedPositionsInflated);
            this._sorted = true;
        }
        return this._array;
    }
}
