const {
    realm: { BaseTask },
    rollup
} = adone;

@adone.task.task("rollup")
export default class extends BaseTask {
    async main({ src, options } = {}) {
		await rollup.run({
			silent: true,
			...options
		});
    }
}
