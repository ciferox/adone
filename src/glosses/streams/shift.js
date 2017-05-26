const getStateLength = (state) => {
    if (state.buffer.length) {
        // Since node 6.3.0 state.buffer is a BufferList not an array
        if (state.buffer.head) {
            return state.buffer.head.data.length;
        }

        return state.buffer[0].length;
    }

    return state.length;
};


export default function shift(stream) {
    const rs = stream._readableState;
    if (!rs) {
        return null;
    }
    return rs.objectMode ? stream.read() : stream.read(getStateLength(rs));
}
