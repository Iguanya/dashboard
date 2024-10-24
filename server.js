const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 3000; // You can change this port if needed

// Middleware
app.use(cors()); // Enable CORS
app.use(bodyParser.json()); // Parse JSON bodies

let sensorData = {}; // Store the latest sensor data

// Endpoint to receive data from Pico
app.post('/api/data', (req, res) => {
    console.log('Data received:', req.body);
    sensorData = req.body; // Update the latest sensor data
    res.json(sensorData); // Echo back the received data as JSON
});

// Endpoint to serve the latest sensor data
app.get('/api/data', (req, res) => {
    res.json(sensorData); // Send the latest sensor data
});

// Serve static files for the dashboard
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html'); // Serve the HTML file
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});