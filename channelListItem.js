class ChannelListItem {
    constructor(endPoint, packet) {
        this.ip = endPoint.address;
        this.port = packet.readUInt16();
        this.users = packet.readUInt16();
        this.name = packet.readString();

        // Stripped Name: eliminar caracteres no alfanuméricos
        this.strippedName = this.name.toUpperCase().replace(/[^A-Z0-9]/g, '');

        // Topic: procesar el tema de la sala
        this.topic = packet.readString();
        this.strippedTopic = this.stripColors(this.formatAresColorCodes(this.topic)).toUpperCase();

        // Language
        this.lang = packet.readByte();

        // Leer cadena adicional (ignorarla aquí)
        packet.readString();

        // Servidores asociados a la sala
        const count = packet.readByte(); // Número de servidores
        this.servers = [];
        for (let i = 0; i < count; i++) {
            const ip = packet.readIP();
            const port = packet.readUInt16();
            this.servers.push({ ip, port });
        }
    }

    formatAresColorCodes(text) {
        return text; // Implementar si es necesario
    }

    stripColors(text) {
        return text; // Implementar si es necesario
    }
}

module.exports = ChannelListItem;