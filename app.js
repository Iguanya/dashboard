const express = require("express");
const cors = require("cors");
const path = require("path");
const os = require("os");
const dgram = require("dgram");
const WebSocket = require("ws");

const app = express();
const port = 3000;
const udpPort = 41234;
const udpHost = "255.255.255.255";
const wssPort = 3001;

let picoData = {}; // Store the latest sensor data for each Pico
let picoCommands = {}; // Queue for storing commands for each Pico
let picoCommandLogs = {}; // Store execution logs for each Pico

// Function to get the local IP address
function getLocalIPAddress() {
    const interfaces = os.networkInterfaces();
    for (const interfaceName in interfaces) {
        for (const interfaceDetails of interfaces[interfaceName]) {
            if (interfaceDetails.family === "IPv4" && !interfaceDetails.internal) {
                return interfaceDetails.address;
            }
        }
    }
    return "127.0.0.1";
}

const host = getLocalIPAddress(); // Get the local IP address dynamically

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname))); // Serve static files

// Default route to serve index.html
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// Serve other static pages dynamically
app.get("/:page", (req, res) => {
    const page = req.params.page;
    const validPages = ["components", "about", "contact", "home"];

    if (validPages.includes(page)) {
        res.sendFile(path.join(__dirname, `${page}.html`));
    } else {
        res.status(404).send("Page not found");
    }
});

// Endpoint to receive data from Pico
app.post("/api/data", (req, res) => {
    console.log("Data received:", req.body);
    const { pico_id, temperature, motion } = req.body;

    // Store the data using pico_id as key
    if (!picoData[pico_id]) {
        picoData[pico_id] = {};
    }

    picoData[pico_id] = {
        temperature: temperature || "no sensor connected",
        motion: motion || { detected: false },
        timestamp: Date.now(),
    };

    console.log(`Data from ${pico_id}:`, picoData[pico_id]);
    res.json({ status: "success", message: "Data received", picoData: picoData[pico_id] });
});

// Combined endpoint to handle commands for Picos
app.post("/api/command", (req, res) => {
    const { action, pico_id, command } = req.body;

    if (!pico_id || !action) {
        return res.status(400).json({ status: "error", message: "Missing pico_id or action" });
    }

    // Initialize command queue for the Pico if not already present
    if (!picoCommands[pico_id]) {
        picoCommands[pico_id] = [];
    }

    if (action === "send") {
        if (!command) {
            return res.status(400).json({ status: "error", message: "Missing command for action 'send'" });
        }

        // Add the command to the queue
        picoCommands[pico_id].push({ command, timestamp: Date.now() });
        console.log(`Command queued for ${pico_id}:`, command);

        // Send the command via UDP
        sendCommandUDP(pico_id, command);

        return res.json({ status: "success", message: `Command queued and sent to ${pico_id}` });
    } else if (action === "fetch") {
        // Get the next command from the queue
        const nextCommand = picoCommands[pico_id].shift();
        if (nextCommand) {
            console.log(`Command sent to ${pico_id}:`, nextCommand);
            return res.json({ status: "success", command: nextCommand });
        } else {
            return res.json({ status: "success", command: "none" });
        }
    } else {
        return res.status(400).json({ status: "error", message: "Invalid action specified" });
    }
});

// Endpoint for Pico to acknowledge command execution
app.post("/api/command/acknowledge", (req, res) => {
    const { pico_id, command, status } = req.body;

    if (!pico_id || !command || !status) {
        return res.status(400).json({ status: "error", message: "Missing pico_id, command, or status" });
    }

    // Log the acknowledgment
    if (!picoCommandLogs[pico_id]) {
        picoCommandLogs[pico_id] = [];
    }
    picoCommandLogs[pico_id].push({ command, status, timestamp: Date.now() });
    console.log(`Command acknowledgment from ${pico_id}:`, { command, status });

    res.json({ status: "success", message: "Command acknowledgment received" });
});

// Endpoint to view logs of command acknowledgments
app.get("/api/logs", (req, res) => {
    res.json({ status: "success", logs: picoCommandLogs });
});

// Endpoint to serve the latest sensor data for all Picos
app.get("/api/data", (req, res) => {
    res.json(picoData); // Send the latest sensor data
});

// Endpoint to view a list of Picos and their data
app.get("/api/picos", (req, res) => {
    const picoList = Object.keys(picoData).map((pico_id) => ({
        pico_id,
        data: picoData[pico_id],
    }));
    res.json({ status: "success", picoList });
});

// Add a debugging endpoint to clear command queues (optional)
app.delete("/api/commands/:pico_id", (req, res) => {
    const pico_id = req.params.pico_id;
    if (picoCommands[pico_id]) {
        delete picoCommands[pico_id];
        return res.json({ status: "success", message: `Commands cleared for ${pico_id}` });
    }
    res.status(404).json({ status: "error", message: "Pico not found" });
});

// Function to send command to Pico via UDP
function sendCommandUDP(pico_id, command) {
    const udpSocket = dgram.createSocket("udp4");
    const message = Buffer.from(`${pico_id}:${command}`);
    udpSocket.send(message, 0, message.length, udpPort, udpHost, () => {
        console.log(`Command sent to ${pico_id} via UDP: ${command}`);
        udpSocket.close();
    });
}

// Start the UDP broadcast server
const udpServer = dgram.createSocket("udp4");
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

// WebSocket server for real-time communication with the client
const wss = new WebSocket.Server({ port: wssPort });
wss.on("connection", (ws) => {
    console.log("New WebSocket connection");
    ws.on("message", (message) => {
        console.log("Received:", message);
    });

    // Periodically send data to connected WebSocket clients
    setInterval(() => {
        const message = JSON.stringify(picoData);
        ws.send(message);
    }, 5000); // Send data every 5 seconds
});

// Start the server
app.listen(port, host, () => {
    console.log(`Server running at http://${host}:${port}`);
});
