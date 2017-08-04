const native = adone.bind("git.node");

const Filter = native.Filter;

Filter.FLAG = {
    DEFAULT: 0,
    ALLOW_UNSAFE: 1
};
Filter.MODE = {
    TO_WORKTREE: 0,
    SMUDGE: 0,
    TO_ODB: 1,
    CLEAN: 1
};

export default Filter;
