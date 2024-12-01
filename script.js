document.addEventListener("DOMContentLoaded", function () {
    console.log("Script loaded successfully!");

    // DOM Elements
    const disinfectionStatusEl = document.getElementById("disinfection-status");
    const motionStatusEl = document.getElementById("motion-status");
    const connectionStatusEl = document.getElementById("connection-status");
    const countdownEl = document.getElementById("countdown");

    const uvIntensityEl = document.getElementById("uv-intensity");
    const alarmStatusEl = document.getElementById("alarm-status");
    const motionSensorEl = document.getElementById("motion");
    const temperatureEl = document.getElementById("temperature-value");
    const humidityEl = document.getElementById("humidity-value");
    const pressureEl = document.getElementById("pressure-value");

    const darkModeToggle = document.getElementById("dark-mode-toggle");
    const body = document.body;
    const pico_id = "d83add5b5a53";

    let timerInterval = null;
    let timerSeconds = 0;

    // Add a log to the Logs section
    function addLog(message) {
        console.log(`[LOG]: ${message}`); // Log to console for debugging
    }

    // Update Status
    function updateStatus(disinfectionStatus, motionDetected, connectionStatus) {
        disinfectionStatusEl.textContent = disinfectionStatus;
        motionStatusEl.textContent = motionDetected ? "Yes" : "No";
        connectionStatusEl.textContent = connectionStatus;
    }

    // Timer Functions
    function startTimer() {
        timerSeconds = 0;
        timerInterval = setInterval(() => {
            timerSeconds++;
            const minutes = Math.floor(timerSeconds / 60);
            const seconds = timerSeconds % 60;
            countdownEl.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
        }, 1000);
    }

    function stopTimer() {
        clearInterval(timerInterval);
        timerSeconds = 0;
        countdownEl.textContent = "00:00";
    }

    // Fetch Sensor Data from Server
    async function fetchData() {
        try {
            const response = await fetch("/api/data");
            if (!response.ok) throw new Error("Failed to fetch data from the server");

            const data = await response.json();

            // Extract and update data for the first Pico (if available)
            const firstPico = Object.keys(data)[0];
            if (firstPico) {
                const picoData = data[firstPico];

                // Update UI elements with received data
                temperatureEl.textContent =
                    picoData.temperature && picoData.temperature.value !== undefined
                        ? `${picoData.temperature.value} °C`
                        : "No sensor connected";

                humidityEl.textContent = picoData.humidity
                    ? `${picoData.humidity.value} %`
                    : "No sensor connected";

                pressureEl.textContent = picoData.pressure
                    ? `${picoData.pressure.value} hPa`
                    : "No sensor connected";

                motionSensorEl.textContent = picoData.motion?.detected ? "Yes" : "No";
                alarmStatusEl.textContent = picoData.alarm
                    ? picoData.alarm.status
                    : "N/A";

                addLog("Sensor data updated successfully.");
            } else {
                console.warn("No Pico data available");
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            addLog("Error fetching sensor data");
        }
    }

async function sendCommand(pico_id, command, action = "send") {
    try {
        const pico_id = "d83add5b5a53";
        const payload = {
            pico_id,
            action,
            command,
        };

        console.log("Sending command:", payload);

        const response = await fetch("/api/command", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        console.log("Response:", response);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to send command: ${errorText}`);
    }

        const result = await response.json();
        addLog(`Command '${command}' sent successfully: ${result.message}`);
    } catch (error) {
        console.error("Error sending command:", error);
        addLog(`Error sending command '${command}': ${error.message}`);
    }
}

    // Dark Mode Toggle
    const savedMode = localStorage.getItem("dark-mode");
    if (savedMode === "enabled") {
        body.classList.add("dark-mode");
        darkModeToggle.textContent = "Disable Dark Mode";
    }

    darkModeToggle.addEventListener("click", () => {
        if (body.classList.contains("dark-mode")) {
            body.classList.remove("dark-mode");
            darkModeToggle.textContent = "Enable Dark Mode";
            localStorage.setItem("dark-mode", "disabled");
        } else {
            body.classList.add("dark-mode");
            darkModeToggle.textContent = "Disable Dark Mode";
            localStorage.setItem("dark-mode", "enabled");
        }
    });

    // Assuming you've defined picoId as "d83add5b5a53"
    document.getElementById("start-button").addEventListener("click", () => {
        updateStatus("Active", false, "Connected");
        startTimer();
        sendCommand(pico_id, "start_disinfection");
    });

    document.getElementById("stop-button").addEventListener("click", () => {
        updateStatus("Stopped", false, "Disconnected");
        stopTimer();
        sendCommand(pico_id, "stop_disinfection");
    });

    document.getElementById("pause-button").addEventListener("click", () => {
        updateStatus("Paused", false, "Connected");
        clearInterval(timerInterval);
        sendCommand(pico_id, "pause_disinfection");
    });

    document.getElementById("resume-button").addEventListener("click", () => {
        updateStatus("Active", false, "Connected");
        startTimer();
        sendCommand(pico_id, "resume_disinfection");
    });

    // Scheduling Logic
    document.getElementById("schedule-button").addEventListener("click", () => {
        const scheduleDate = document.getElementById("schedule-date").value;
        const scheduleStart = document.getElementById("schedule-start").value;
        const scheduleEnd = document.getElementById("schedule-end").value;
        const recurrence = document.getElementById("recurrence").value;

        if (!scheduleDate || !scheduleStart || !scheduleEnd) {
            alert("Please fill in all scheduling fields");
            return;
        }

        const scheduleData = {
            date: scheduleDate,
            start: scheduleStart,
            end: scheduleEnd,
            recurrence,
        };

        sendCommand("set_schedule", scheduleData);
        alert(`Schedule set for ${scheduleDate} from ${scheduleStart} to ${scheduleEnd}`);
    });

    // Fetch data periodically
    setInterval(fetchData, 5000);
    fetchData(); // Initial fetch
});
