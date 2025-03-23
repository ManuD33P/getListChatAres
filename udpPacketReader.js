class UdpPacketReader {
    constructor(buffer) {
        this.buffer = buffer;
        this.position = 0; // Posición actual en el buffer
    }

    readByte() {
        const value = this.buffer.readUInt8(this.position);
        this.position += 1;
        return value;
    }

    readUInt16() {
        const value = this.buffer.readUInt16LE(this.position);
        this.position += 2;
        return value;
    }

    readUInt32() {
        const value = this.buffer.readUInt32LE(this.position);
        this.position += 4;
        return value;
    }

    readString() {
        const length = this.readUInt16(); // Longitud prefijada como uint16
        const value = this.buffer.toString('utf-8', this.position, this.position + length);
        this.position += length;
        return value;
    }

    readIP() {
        const ip = `${this.buffer.readUInt8(this.position)}.${this.buffer.readUInt8(this.position + 1)}.${this.buffer.readUInt8(this.position + 2)}.${this.buffer.readUInt8(this.position + 3)}`;
        this.position += 4;
        return ip;
    }
}

module.exports = UdpPacketReader;