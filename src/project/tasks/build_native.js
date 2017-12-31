const {
    is
} = adone;

export default class BuildNativeTask extends adone.project.task.Base {
    constructor() {
        super();
        this.stream = null;
    }

    // initialize(params) {
           
    // }

    main(params) {
        const prog = new adone.gyp.Gyp();
        prog.run([
            {
                name: "rebuild",
                args: []
            }
        ], {});
    }
}
