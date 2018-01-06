const native = adone.bind("git.node");

const {
    promise: { promisifyAll }
} = adone;

const FilterList = native.FilterList;

FilterList.prototype.applyToBlob = promisifyAll(FilterList.prototype.applyToBlob);
FilterList.prototype.applyToData = promisifyAll(FilterList.prototype.applyToData);
FilterList.prototype.applyToFile = promisifyAll(FilterList.prototype.applyToFile);
FilterList.load = promisifyAll(FilterList.load);

export default FilterList;
