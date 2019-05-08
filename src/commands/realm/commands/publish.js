const {
    app: { Subsystem, mainCommand }
} = adone;

export default class extends Subsystem {
    @mainCommand()
    async main(args, opts) {
        try {
           
            return 0;
        } catch (err) {
            console.log(adone.pretty.error(err));
            return 1;
        }
    }
}
