document.addEventListener("DOMContentLoaded", function() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    const contentArea = document.querySelector('.content');

    // Function to set the active link in the nav and sidebar
    function setActiveLink(page) {
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.dataset.page === page) {
                link.classList.add('active');
            }
        });

        sidebarLinks.forEach(link => {
            link.classList.remove('active');
            if (link.dataset.page === page) {
                link.classList.add('active');
            }
        });

        // Debug message to show the current page
        document.getElementById('debug-data').innerText = `You are on the ${page} page`;
    }

    // Function to load page content dynamically
    async function loadPageContent(page) {
        try {
            const response = await fetch(`/${page}.html`);
            if (!response.ok) {
                throw new Error('Page not found');
            }
            const content = await response.text();
            contentArea.innerHTML = content;
            setActiveLink(page);

            // If it's the components page, trigger data fetching for connected Picos
            if (page === 'components') {
                fetchPicoData();
            } else if (page === 'home') {
                fetchData();  // Fetch sensor data for the home page
                setInterval(fetchData, 3000);  // Fetch sensor data every 3 seconds
            }
        } catch (error) {
            console.error(`Error loading page ${page}:`, error);
            contentArea.innerHTML = '<p>Error loading page content</p>';
        }
    }

    // Add event listeners to navbar and sidebar links for navigation
    navLinks.forEach(link => {
        link.addEventListener('click', function(event) {
            event.preventDefault();
            const page = this.dataset.page;
            loadPageContent(page);
        });
    });

    sidebarLinks.forEach(link => {
        link.addEventListener('click', function(event) {
            event.preventDefault();
            const page = this.dataset.page;
            loadPageContent(page);
        });
    });

    // Load the homepage on initial load
    loadPageContent('home');
});

// Function to fetch sensor data from the server
async function fetchData() {
    try {
        const response = await fetch('/api/data'); // Fetch from your server endpoint
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();

        // Update the different cards with the respective data
        updateSensorData('temperature-card', 'Temperature', data.temperature ? `${data.temperature.value} ${data.temperature.unit}` : 'N/A');
        updateSensorData('humidity-card', 'Humidity', data.humidity ? `${data.humidity.value} ${data.humidity.unit}` : 'N/A');
        updateSensorData('gps-card', 'GPS Coordinates', data.gps ? `Lat: ${data.gps.latitude}, Long: ${data.gps.longitude}` : 'N/A');
        updateSensorData('altitude-card', 'Altitude', data.altitude ? `${data.altitude.value} ${data.altitude.unit}` : 'N/A');
    } catch (error) {
        console.error('Error fetching data:', error);
        document.getElementById('sensor-data').innerText = 'Error fetching data';
    }
}

// Function to update sensor data cards
function updateSensorData(cardId, label, value) {
    const card = document.getElementById(cardId);
    if (card) {
        card.querySelector('.card-value').innerText = value;
    }
}

// Function to fetch connected Pico data for the components page
async function fetchPicoData() {
    try {
        const response = await fetch('/api/picos'); // Assuming an endpoint for connected Picos
        if (!response.ok) {
            throw new Error('Error fetching Pico data');
        }
        const picos = await response.json();
        const picoCount = document.getElementById('pico-count');
        picoCount.innerText = `${picos.length} Picos Connected`;

        // Generate Pico cards
        const contentArea = document.querySelector('.content');
        picos.forEach(pico => {
            const picoCard = document.createElement('div');
            picoCard.classList.add('card');
            picoCard.innerHTML = `
                <h3>Pico ID: ${pico.id}</h3>
                <p>Temperature: ${pico.temperature} °C</p>
                <p>Humidity: ${pico.humidity} %</p>
                <p>Pressure: ${pico.pressure} Pa</p>
                <p>GPS: Lat: ${pico.gps.latitude}, Long: ${pico.gps.longitude}</p>
            `;
            contentArea.appendChild(picoCard);
        });
    } catch (error) {
        console.error('Error fetching Pico data:', error);
        document.getElementById('pico-count').innerText = 'Error fetching Pico data';
    }
}
