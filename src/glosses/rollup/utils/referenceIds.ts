const {
	crypto: { sha256 }
} = adone;

export function addWithNewReferenceId<T>(item: T, idMap: Map<string, T>, hashBase: string): string {
	let referenceId: string | undefined;
	do {
		const hash = sha256.create();
		if (referenceId) {
			hash.update(referenceId);
		} else {
			hash.update(hashBase);
		}
		referenceId = hash.digest().toHex().substr(0, 8);
	} while (idMap.has(referenceId));
	idMap.set(referenceId, item);
	return referenceId;
}
