import adone from "adone";
import sandbox from "./sandbox";
const { is, x, vendor: { lodash: _ } } = adone;
const { traverse, generate, core } = adone.js.compiler;
const { Contextable, Private, Public, Description, Type, Args } = adone.netron.decorator;


@Private
@Contextable
@Description("Taks manager container")
export default class Container {
    constructor(manager, meta) {
        this.manager = manager;
        this.meta = meta;
        this.running = false;
        this._sandbox = null;
        this._context = null;
        this._isContextInited = false;
    }

    get context() {
        if (is.null(this._context)) {
            const cs = sandbox(this.manager);
            cs.global = cs;
            cs.emit = adone.noop;
            this._sandbox = cs;
            this._context = adone.std.vm.createContext(cs);
        }
        return this._context;
    }

    @Public
    @Description("Installs code inside container")
    @Type(Number)
    @Args(String, Object)
    async install(code, options) {
        const { ast, installed } = await this.manager._install(code, options, `${this.meta.id}.`);

        // extract global variables and functions
        const declarations = [];
        traverse(ast, {
            FunctionDeclaration(path) {
                const generated = generate(path.node, {
                    comments: false
                });
                declarations.push(generated.code);
            },
            VariableDeclaration(path) {
                const generated = generate(path.node, {
                    comments: false
                });
                declarations.push(generated.code);
            }
        });

        if (declarations.length > 0) {
            this.meta.dataCode = declarations.join("\n");
        }

        for (const taskInfo of installed) {
            const nameParts = taskInfo.meta.name.split(".");
            this.meta.tasks.push(nameParts[1]);
        }

        this.manager.iDs.update({ _type: "container", _id: this.meta._id }, { $set: { dataCode: this.meta.dataCode, tasks: this.meta.tasks } });

        return installed.length;
    }

    @Public
    @Description("Runs task")
    @Args(String)
    async run(name, ...args) {
        if (this._isContextInited === false) {
            let code = await this._getDataCode();
            for (const taskName of this.meta.tasks) {
                const fullName = `${this.meta.id}.${taskName}`;
                const taskInfo = this.manager._getTask(fullName);
                const taskCode = await this.manager._getTaskCode(taskInfo);
                code += `\n${taskCode}\n`;
            }

            const transformedCode = core.transform(code, this.manager.options.transpiler).code;
            adone.std.vm.runInContext(transformedCode, this.context, { filename: `Container-${this.meta.id}`, displayErrors: true });
            this._isContextInited = true;
        }
        return this.manager._run(this.context, `${this.meta.id}.${name}`, args);
    }

    @Public
    @Description("Returns container's meta info")
    getMeta() {
        return _.pick(this.meta, ["id", "type", "tasks", "createTime"]);
    }

    @Public
    @Description("Sets reverse interacting interface")
    setInteractor(iInteractor) {
        if (!is.netronInterface(iInteractor)) {
            throw new x.NotValid("Interactor should be a valid netron interface");
        }
        this._iInteractor = iInteractor;

        if (is.netronIMethod(iInteractor, "emit")) {
            this._sandbox.emit = (event, ...args) => this._iInteractor.emit(event, ...args);
        }
    }

    async _getDataCode() {
        if (is.null(this.meta.dataCode)) {
            const result = await this.manager.iDs.findOne({ _type: "container", _id: this.meta._id }, { _id: 0, dataCode: 1 });
            if (is.null(result)) {
                throw new x.NotExists(`Container '${this.meta.id}' not exists`);
            }
            this.meta.dataCode = result.dataCode;
        }

        return is.null(this.meta.dataCode) ? "" : this.meta.dataCode;
    }
}
