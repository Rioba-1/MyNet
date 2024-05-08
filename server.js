// Import necessary modules from npm packages
const express = require('express');  // Express framework to handle HTTP requests
const app = express();               // Create an instance of express
const cors = require('cors');        // CORS module to allow cross-origin requests
const wifi = require('node-wifi');
const ping = require('net-ping');    // Module to perform ping operations
const session = ping.createSession(); // Create a ping session to handle ping operations

//initialize wifi module
wifi.init({ iface: null }); // null will use the system's default WiFi interface

// Use CORS middleware to enable CORS with various options
app.use(cors());

// Function to get the SSID of the connected WiFi network
async function getCurrentSSID() {
    return new Promise((resolve, reject) => {
        wifi.getCurrentConnections((error, currentConnections) => {
            if (error) reject(error);
            else if (currentConnections.length === 0) reject('No WiFi connections found.');
            else resolve(currentConnections[0].ssid); // Return the first connection's SSID
        });
    });
}
// Use CORS middleware to enable CORS with various options
app.use(cors());

// Define a route to handle GET requests on '/scan-network'
app.get('/scan-network', async (req, res) => {
    try {
        const ssid = await getCurrentSSID(); // Retrieve the SSID of the current WiFi network

        // Perform a ping test to an external IP (Google DNS in this case)
        const pingResults = await performPing();

        // Scan the local network subnet for pingable devices
        // update your subnet in that format
        const devicesCount = await scanAndPingSubnet('192.168.100'); // Base IP set for scanning

        // Send a JSON response with the network status details
        res.json({
            ssid: ssid, // Include the SSID of the connected WiFi network
            connectionStatus: pingResults.success ? 'Connected' : 'Not connected',
            latency: pingResults.ms,
            connectionStrength: pingResults.ms < 80 ? 'Strong' : 'Weak',
            devicesCount: devicesCount // Display the count of devices that responded to ping
        });
    } catch (error) {
        // Handle any errors that might occur during the process
        res.status(500).send('Error processing network scan');
    }
});

// Function to perform a ping to the specified dns (google)
function performPing() {
    const target = '8.8.8.8';
    return new Promise((resolve, reject) => {
        session.pingHost(target, (error, target, sent, rcvd) => {
            const ms = rcvd - sent;  // Calculate the latency in milliseconds
            if (error) {
                reject({ success: false });
            } else {
                resolve({ success: true, ms });
            }
        });
    });
}

// Asynchronously scans and pings a subnet to count how many devices are responsive.
async function scanAndPingSubnet(baseIP) {
    let count = 0; // Initialize a counter for responsive devices.
    const promises = []; // Array to hold promises for each ping operation.

    // Generate all ping promises for the IP range in the subnet.
    for (let i = 1; i <= 254; i++) {
        const ip = `${baseIP}.${i}`;
        promises.push(pingIP(ip).catch(error => {
            console.error(`Error pinging IP ${ip}: ${error.message}`); // Handle and log any errors for each IP.
            return false; // Return false in case of error to ensure the promise resolves.
        }));
    }

    // Use Promise.all to wait for all ping operations to complete.
    const results = await Promise.all(promises);

    // Count all successful ping responses.
    results.forEach(result => {
        if (result) count++;
    });

    return count; // Return the total count of responsive devices.
}

// Function to ping an IP and check if it's reachable
function pingIP(ip) {
    return new Promise((resolve, reject) => {
        session.pingHost(ip, (error) => {
            if (!error) {
                resolve(true); // Resolve as true if ping is successful.
            } else {
                reject(error); // Reject the promise if ping fails, providing the error for further handling.
           }
        });
    });
}

// Start the server on port 3000
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);  // Log the server status
});
