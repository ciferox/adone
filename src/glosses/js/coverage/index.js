const { is, util, text, lazify, js, std: { vm } } = adone;

lazify({
    plugin: "./plugin"
}, exports, require);

const cov = Symbol.for("adone:coverage");

export const hasStats = () => !is.undefined(global[cov]);

export const removeStats = () => delete global[cov];

export const removeStatsFor = (path) => hasStats() && delete global[cov][path];

export const getRawStats = () => hasStats() ? global[cov] : null;

const calc = (stats) => {
    const passed = stats.reduce((x, y) => {
        if (y > 0) {
            return x + 1;
        }
        return x;
    }, 0);
    return {
        passed,
        total: stats.length,
        percent: stats.length ? passed / stats.length * 100 : 100
    };
};

export const getStatsFor = (path) => {
    const rawStats = getRawStats();
    if (!rawStats[path]) {
        return null;
    }
    const stats = rawStats[path];
    const b = calc(stats.b);
    const f = calc(stats.f);
    const s = calc(stats.s);
    const o = {
        passed: b.passed + f.passed + s.passed,
        total: b.total + f.total + s.total
    };
    o.percent = o.total ? o.passed / o.total * 100 : 100;
    return {
        branch: b,
        function: f,
        statement: s,
        overall: o
    };
};

export const getStats = (filter) => {
    if (!hasStats()) {
        return null;
    }
    const rawStats = getRawStats();
    const res = {};
    for (const path of util.keys(rawStats)) {
        if (filter && !filter.test(path)) {
            continue;
        }
        res[path] = getStatsFor(path);
    }
    return res;
};

export const getOverallStats = (filter) => {
    const rawStats = getRawStats();
    const calc = (stats) => {
        const passed = stats.reduce((x, y) => {
            if (y > 0) {
                return x + 1;
            }
            return x;
        }, 0);
        return [passed, stats.length];
    };
    const res = {
        branch: {
            passed: 0,
            total: 0
        },
        function: {
            passed: 0,
            total: 0
        },
        statement: {
            passed: 0,
            total: 0
        },
        overall: {
            passed: 0,
            total: 0
        }
    };
    for (const [path, stats] of util.entries(rawStats)) {
        if (filter && !filter.test(path)) {
            continue;
        }
        {
            const [passed, total] = calc(stats.b);
            res.branch.passed += passed;
            res.branch.total += total;
            res.overall.passed += passed;
            res.overall.total += total;
        }
        {
            const [passed, total] = calc(stats.f);
            res.function.passed += passed;
            res.function.total += total;
            res.overall.passed += passed;
            res.overall.total += total;
        }
        {
            const [passed, total] = calc(stats.s);
            res.statement.passed += passed;
            res.statement.total += total;
            res.overall.passed += passed;
            res.overall.total += total;
        }
    }
    res.branch.percent = res.branch.total ? res.branch.passed / res.branch.total * 100 : 100;
    res.function.percent = res.function.total ? res.function.passed / res.function.total * 100 : 100;
    res.statement.percent = res.statement.total ? res.statement.passed / res.statement.total * 100 : 100;
    res.overall.percent = res.overall.total ? res.overall.passed / res.overall.total * 100 : 100;
    return res;
};

export const printTable = (filter) => {
    const stats = getStats(filter);

    const round = (p) => {
        if (is.integer(p)) {
            return p;
        }
        return p.toFixed(3);
    };

    const data = Object.entries(stats).map(([path, stats]) => {
        return {
            path: adone.std.path.relative(process.cwd(), path),
            branch: `${stats.branch.passed} / ${stats.branch.total} / ${round(stats.branch.percent)}%`,
            function: `${stats.function.passed} / ${stats.function.total} / ${round(stats.function.percent)}%`,
            statement: `${stats.statement.passed} / ${stats.statement.total} / ${round(stats.statement.percent)}%`,
            overall: `${stats.overall.passed} / ${stats.overall.total} / ${round(stats.overall.percent)}%`
        };
    });
    if (data.length > 1) {
        const overall = getOverallStats(filter);
        data.push({
            path: "overall",
            branch: `${overall.branch.passed} / ${overall.branch.total} / ${round(overall.branch.percent)}%`,
            function: `${overall.function.passed} / ${overall.function.total} / ${round(overall.function.percent)}%`,
            statement: `${overall.statement.passed} / ${overall.statement.total} / ${round(overall.statement.percent)}%`,
            overall: `${overall.overall.passed} / ${overall.overall.total} / ${round(overall.overall.percent)}%`
        });
    }
    const table = text.pretty.table(data, {
        model: [
            { id: "path", header: "#", align: "center", wordwrap: "hard", maxWidth: 50 },
            { id: "overall", header: "%", align: "center" },
            { id: "branch", header: "Branch", align: "center" },
            { id: "function", header: "Function", align: "center" },
            { id: "statement", header: "Statement", align: "center" }
        ]
    });
    adone.log(table);
};

export const instrument = (sourceCode, { filename = `${new Date().getTime()}.js`, plugins = [] } = {}) => {
    const { code } = js.compiler.core.transform(sourceCode, {
        plugins: [
            js.coverage.plugin,
            ...plugins
        ],
        filename
    });
    return code;
};

const wrap = (s) => `(() => {${s}})()`;

export const calculateCoverage = (sourceCode, { filename = `${new Date().getTime()}.js`, plugins = [] } = {}) => {
    const has = hasStats();
    const code = instrument(sourceCode, { filename, plugins });
    try {
        vm.runInThisContext(wrap(code));
        return getStatsFor(filename);
    } finally {
        if (has) {
            removeStatsFor(filename);
        } else {
            removeStats();
        }
    }
};
