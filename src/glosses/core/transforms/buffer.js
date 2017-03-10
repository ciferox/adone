

export function concat() {
    const buffers = [];
    const t = new adone.Transform({
        transform: (x) => buffers.push(x),
        flush: () => t.push(Buffer.concat(buffers))
    });
    
    return t;
}
