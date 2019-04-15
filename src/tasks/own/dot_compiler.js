const {
    fast,
    std
} = adone;

@adone.task.task("adoneDotCompiler")
export default class AdoneDotCompilerTask extends adone.realm.TransformTask {
    async initialize(params) {
        this.defs = (await fast.src(std.path.join(adone.util.globParent(params.src), "*.def"), {
            cwd: this.manager.path
        })).reduce((defs, file) => {
            const name = std.path.basename(file.path, ".def");
            defs[name] = file.contents.toString("utf-8");
            return defs;
        }, {});

        return super.initialize(params);
    }

    transform(stream, params) {
        const FUNCTION_NAME = /function\s+anonymous\s*\(it[^)]*\)\s*{/;
        const OUT_EMPTY_STRING = /out\s*\+=\s*'\s*';/g;
        const ISTANBUL = /'(istanbul[^']+)';/g;
        const ERROR_KEYWORD = /\$errorKeyword/g;
        const ERROR_KEYWORD_OR = /\$errorKeyword\s+\|\|/g;
        const VARS = [
            "$errs", "$valid", "$lvl", "$data", "$dataLvl",
            "$errorKeyword", "$closingBraces", "$schemaPath",
            "$validate"
        ];

        return stream.map((file) => {
            const keyword = std.path.basename(file.path, ".jst");
            const template = file.contents.toString("utf-8");
            let code = adone.templating.dot
                .compile(template, this.defs)
                .toString()
                .replace(OUT_EMPTY_STRING, "")
                .replace(FUNCTION_NAME, `function generate_${keyword}(it, $keyword, $ruleType) {`)
                .replace(ISTANBUL, "/* $1 */");

            const occurrences = (regexp) => (code.match(regexp) || []).length;
            const countUsed = occurrences(ERROR_KEYWORD);
            const countOr = occurrences(ERROR_KEYWORD_OR);
            if (countUsed === countOr + 1) {
                code = code.replace(ERROR_KEYWORD_OR, "");
            }
            VARS.forEach(function removeUnusedVar(v) {
                v = v.replace(/\$/g, "\\$$");
                let regexp = new RegExp(`${v}[^A-Za-z0-9_$]`, "g");
                const count = occurrences(regexp);
                if (count === 1) {
                    regexp = new RegExp(`var\\s+${v}\\s*=[^;]+;|var\\s+${v};`);
                    code = code.replace(regexp, "");
                }
            });
            code = `'use strict';\nmodule.exports = ${code}`;
            file.contents = Buffer.from(code);
            file.path = `${file.path.slice(0, -4)}.js`;
            return file;
        });
    }
}
