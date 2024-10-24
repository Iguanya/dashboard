const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');
const dgram = require('dgram');

const app = express();
const port = 3000;
const udpPort = 41234;
const udpHost = '255.255.255.255';

let picoData = {}; // Store the latest sensor data for each Pico

// Function to get the local IP address
function getLocalIPAddress() {
    const interfaces = os.networkInterfaces();
    for (const interfaceName in interfaces) {
        for (const interfaceDetails of interfaces[interfaceName]) {
            if (interfaceDetails.family === 'IPv4' && !interfaceDetails.internal) {
                return interfaceDetails.address;
            }
        }
    }
    return '127.0.0.1';
}

const host = getLocalIPAddress(); // Get the local IP address dynamically

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the current directory
app.use(express.static(path.join(__dirname)));

// Default route to serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Dynamic route to serve other pages like components, about, contact
app.get('/:page', (req, res) => {
    const page = req.params.page;
    const validPages = ['components', 'about', 'contact', 'home'];

    if (validPages.includes(page)) {
        res.sendFile(path.join(__dirname, `${page}.html`));
    } else {
        res.status(404).send('Page not found');
    }
});

// Endpoint to receive data from Pico
app.post('/api/data', (req, res) => {
    console.log('Data received:', req.body);
    const { pico_id, data_type } = req.body;

    // Store the data using pico_id as key
    if (!picoData[pico_id]) {
        picoData[pico_id] = {}; // Initialize data for this Pico
    }

    picoData[pico_id][data_type] = req.body;

    res.json(picoData); // Send back all stored data
});

// Endpoint to serve the latest sensor data for all Picos
app.get('/api/data', (req, res) => {
    res.json(picoData); // Send the latest sensor data
});

// Endpoint to view Picos and their data
app.get('/api/picos', (req, res) => {
    const picoList = Object.keys(picoData).map(pico_id => ({
        pico_id: pico_id,
        data: picoData[pico_id]
    }));
    res.json(picoList); // Send the list of Picos
});

// Start the UDP broadcast server
const udpServer = dgram.createSocket('udp4');
udpServer.bind(udpPort, () => {
    udpServer.setBroadcast(true);
    console.log(`UDP broadcast server running on port ${udpPort}`);
});

// Broadcast server IP and port periodically
setInterval(() => {
    const message = Buffer.from(`${host}:${port}`);
    udpServer.send(message, 0, message.length, udpPort, udpHost, () => {
        console.log(`Broadcasted server info: ${host}:${port}`);
    });
}, 5000); // Broadcast every 5 seconds

// Start the server
app.listen(port, host, () => {
    console.log(`Server running at http://${host}:${port}`);
});
