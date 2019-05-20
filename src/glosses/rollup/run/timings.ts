import { SerializedTimings } from '../rollup/types';

const {
	cli: { chalk }
} = adone;

export function printTimings(timings: SerializedTimings) {
	Object.keys(timings).forEach(label => {
		const color =
			label[0] === '#' ? (label[1] !== '#' ? chalk.underline : chalk.bold) : (text: string) => text;
		const [time, memory, total] = timings[label];
		const row = `${label}: ${time.toFixed(0)}ms, ${adone.pretty.size(memory)} / ${adone.pretty.size(total)}`;
		console.info(color(row));
	});
}
