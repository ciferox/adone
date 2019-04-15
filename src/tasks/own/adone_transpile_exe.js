import TranspileExeTask from "../pub/transpile_exe";
import { importAdoneReplacer } from "../helpers";

const {
    std
} = adone;

@adone.task.task("adoneTranspileExe")
export default class AdoneTranspileExeTask extends TranspileExeTask {
    plugins(params) {
        const plugins = super.plugins(params);
        return plugins.concat([
            importAdoneReplacer(({ filename }) => std.path.relative(std.path.join(__dirname, "..", "bin"), std.path.join(__dirname, "..", "lib")))
        ]);
    }
};
