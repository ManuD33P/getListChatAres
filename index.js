const dgram = require('dgram');
const express = require('express');
const UdpPacketReader = require('./udpPacketReader');
const ChannelListItem = require('./channelListItem');
const path = require('path');
const https = require('https');
// Configuración del servidor UDP
const udpSocket = dgram.createSocket('udp4');
const PORT = 12345;
const BOOTSTRAP_NODES = [
    { ip: '5.206.224.110', port: 54321 },
    { ip: '31.58.58.124', port: 54321 }
];

// Estructuras para seguimiento y procesamiento
const pendingNodes = new Set(); // Nodos pendientes de procesar
const processedNodes = new Set(); // Nodos ya procesados
const channelsMap = new Map(); // Información única de canales procesados


const getExternalIP = () => {
    https.get('https://api64.ipify.org?format=json', (res) => {
        let data = '';

        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
            console.log('IP externa del servidor:', JSON.parse(data).ip);
        });

    }).on('error', err => {
        console.error('Error al obtener la IP externa:', err.message);
    });
};



// Escuchar mensajes UDP
udpSocket.on('message', (msg, rinfo) => {
    console.log(`Mensaje recibido desde ${rinfo.address}:${rinfo.port}`);
    const packet = new UdpPacketReader(msg);

    // Procesar canales (tipo de mensaje supuestamente "3")
    const messageType = packet.readByte();
    if (messageType === 3) {
        try {
            const channel = new ChannelListItem(rinfo, packet);
            const channelKey = `${channel.ip}:${channel.port}-${channel.strippedName}`;

            // Actualizar o agregar el canal al mapa
            if (channelsMap.has(channelKey)) {
                const existingChannel = channelsMap.get(channelKey);
                Object.assign(existingChannel, {...channel,servers:null}); // Actualizar canal
            } else {
                channelsMap.set(channelKey, {...channel,servers:null});
                console.log(`Canal agregado: ${JSON.stringify(channel)}`);
            }

            // Agregar nodos (servers) descubiertos al conjunto de nodos pendientes
            for (const { ip, port } of channel.servers) {
                const nodeKey = `${ip}:${port}`;
                if (!processedNodes.has(nodeKey)) {
                    pendingNodes.add(nodeKey);
                }
            }
        } catch (err) {
            console.error(`Error al procesar el canal: ${err}`);
        }
    }

    // Si el nodo respondió, eliminarlo de los nodos pendientes
    const nodeKey = `${rinfo.address}:${rinfo.port}`;
    if (pendingNodes.has(nodeKey)) {
        pendingNodes.delete(nodeKey);
        processedNodes.add(nodeKey); // Marcar como procesado
    }
});

// Escuchar en el puerto UDP
udpSocket.bind(PORT, () => {
    console.log(`Servidor UDP escuchando en el puerto ${PORT}`);
});

// Función para enviar solicitudes a nodos
const sendDiscoveryRequest = (ip, port) => {
    const message = Buffer.from([2]); // Paquete de solicitud (tipo 2)
    udpSocket.send(message, 0, message.length, port, ip, (err) => {
        if (err) {
            console.error(`Error al enviar a ${ip}:${port}: ${err}`);
        } else {
            console.log(`Solicitud enviada a ${ip}:${port}`);
        }
    });
};

// Procesar nodos pendientes
const processPendingNodes = () => {
    for (const nodeKey of Array.from(pendingNodes)) {
        const [ip, port] = nodeKey.split(':');
        const portNumber = parseInt(port, 10);

        sendDiscoveryRequest(ip, portNumber); // Enviar solicitud
        // if (!processedNodes.has(nodeKey)) {
            pendingNodes.delete(nodeKey); // Eliminarlo de los pendientes
        // }
    }
};

// Enviar solicitudes iniciales a nodos bootstrap
BOOTSTRAP_NODES.forEach(({ ip, port }) => {
    const nodeKey = `${ip}:${port}`;
    pendingNodes.add(nodeKey); // Agregar nodos bootstrap al conjunto de pendientes
});

// Crear servidor HTTP con Express
const app = express();
const HTTP_PORT = 5000;


app.use(express.static(path.join(__dirname, 'client/build'))); // Sirve React


// Endpoint para consultar nodos procesados
app.get('/nodes', (req, res) => {
    getExternalIP();
    const nodes = Array.from(processedNodes).map((node) => {
        const [ip, port] = node.split(':');
        return { ip, port: parseInt(port, 10) };
    });
    res.json(nodes);
});


// Endpoint para consultar canales descubiertos
app.get('/channels', (req, res) => {
    
    BOOTSTRAP_NODES.forEach(({ ip, port }) => {
        const nodeKey = `${ip}:${port}`;
        pendingNodes.add(nodeKey); // Agregar nodos bootstrap al conjunto de pendientes
    });

    processPendingNodes()
    
    const channels = Array.from(channelsMap.values());
    res.json({total:channels.length, channels});
});

// Iniciar el servidor HTTP
app.listen(HTTP_PORT, () => {
    console.log(`API escuchando en http://localhost:${HTTP_PORT}`);
    getExternalIP();
});

// Procesar nodos pendientes cada 100ms
setInterval(processPendingNodes, 100);
