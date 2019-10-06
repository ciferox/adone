import { SerializedTimings } from './rollup/types';

const {
	cli: { chalk },
	pretty
} = adone;

export function printTimings(timings: SerializedTimings) {
	Object.keys(timings).forEach(label => {
		const color =
			label[0] === '#' ? (label[1] !== '#' ? chalk.underline : chalk.bold) : (text: string) => text;
		const [time, memory, total] = timings[label];
		const row = `${label}: ${time.toFixed(0)}ms, ${pretty.size(memory)} / ${pretty.size(total)}`;
		console.info(color(row));
	});
}
