// On reload hide errors
hideError();

/*----------------------------------------------------------------
                        Variable Declarations
----------------------------------------------------------------*/
var facilities = [];
let bearerToken; // Holds the bearer token for authentication
let jsonData; // Holds JSON data fetched from APIs
let currentTime; // Holds the current time in milliseconds
let expirationTime; // Holds the expiration time of the bearer token
let timeUntilExpiration; // Holds the time until the bearer token expires
const errorText = document.getElementById("errText");

/*----------------------------------------------------------------
                        Function Declarations
----------------------------------------------------------------*/

// Convert facilities to CSV
const convertToCSV = () => {
  const headers = [
    "Property Id",
    "API Key",
    "API Secret",
    "Client Id",
    "Secret Id",
    "Environment",
    "Staging Key",
  ];
  const rows = facilities.map((facility) => [
    facility.propertyID,
    facility.username,
    facility.password,
    facility.clientID,
    facility.secretID,
    facility.envKey,
    facility.stageKey,
  ]);
  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");
  return csvContent;
};

// Download CSV
function downloadCSV(csvContent, filename = "facilities.csv") {
  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();

  // Cleanup
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Upload CSV
function uploadCSV(csvContent) {
  const lines = csvContent.split("\n").filter((line) => line.trim() !== "");
  const data = lines.slice(1);

  return data.map((line) => {
    const values = line.split(",");
    const facility = {
      propertyID: values[0],
      username: values[1],
      password: values[2],
      clientID: values[3],
      secretID: values[4],
      envKey: values[5],
      stageKey: values[6],
    };
    return facility;
  });
}

// Get SmartLock info
async function getSmartLock(stageKey, envKey, propertyID, bearer) {
  try {
    const response = await fetch(
      `https://accesscontrol.${stageKey}insomniaccia${envKey}.com/facilities/${propertyID}/smartlockstatussummary`,
      {
        headers: {
          Authorization: "Bearer " + (await bearer.access_token),
          accept: "application/json",
          "api-version": "2.0",
        },
      }
    );
    if (response.ok) {
      const data = await response.json();
      return data;
    } else {
      throw new Error("Network response was not ok");
    }
  } catch (error) {
    console.error("There was a problem with the fetch operation:", error);
    return null;
  }
}

// Get Access Point info
async function getAccessPoints(stageKey, envKey, propertyID, bearer) {
  try {
    const response = await fetch(
      `https://accesscontrol.${stageKey}insomniaccia${envKey}.com/facilities/${propertyID}/edgerouterplatformdevicesstatus`,
      {
        headers: {
          Authorization: "Bearer " + (await bearerToken.access_token),
          accept: "application/json",
          "api-version": "2.0",
        },
      }
    );
    if (response.ok) {
      const data = await response.json();
      return data;
    } else {
      throw new Error("Network response was not ok");
    }
  } catch (error) {
    console.error("There was a problem with the fetch operation:", error);
    return null;
  }
}

// Get EdgeRouter info
async function getEdgeRouter(stageKey, envKey, propertyID, bearer) {
  try {
    const response = await fetch(
      `https://accesscontrol.${stageKey}insomniaccia${envKey}.com/facilities/${propertyID}/edgerouterstatus`,
      {
        headers: {
          Authorization: "Bearer " + (await bearerToken.access_token),
          accept: "application/json",
          "api-version": "2.0",
        },
      }
    );
    if (response.ok) {
      const data = await response.json();
      return data;
    } else {
      throw new Error("Network response was not ok");
    }
  } catch (error) {
    console.error("There was a problem with the fetch operation:", error);
    return null;
  }
}

// Function to create a bearer token for authentication
async function createBearer(user, pass, id, secret, stageKey, envKey) {
  try {
    const currentTime = Date.now();

    const response = await fetch(
      `https://auth.${stageKey}insomniaccia${envKey}.com/auth/token`,
      {
        method: "POST",
        headers: {
          accept: "application/json",
        },
        body: new URLSearchParams({
          grant_type: "password",
          username: user,
          password: pass,
          scope: "",
          client_id: id,
          client_secret: secret,
          refresh_token: "",
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Bearer network response was not ok");
    }

    const data = await response.json();
    bearerToken = data;
    expirationTime = currentTime + data.expires_in * 1000;

    displayLoadDateTime();

    return data;
  } catch (error) {
    console.error(
      "There was a problem with the bearer fetch operation:",
      error
    );
    showError(error);
    return undefined;
  }
}

// Function to fetch facility data
async function getFacility(stageKey, envKey, propertyID, bearer) {
  try {
    const response = await fetch(
      `https://accesscontrol.${stageKey}insomniaccia${envKey}.com/facilities/${propertyID}`,
      {
        headers: {
          accept: "application/json",
          Authorization: "Bearer " + bearer.access_token,
          "api-version": "2.0",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("There was a problem with the fetch operation:", error);
    return null;
  }
}

// Function to refresh the json table
async function refreshTable() {
  showLoadingSpinner();
  hideError();
  setTimeout(() => {
    renderCards(facilities);
    hideLoadingSpinner();
  }, 1000);
  setTimeout(() => {
    displayLoadDateTime();
  }, 1005);
}

// Function to show error fetching data
function showError(err) {
  const errText = document.getElementById("errText");
  //Check to see if error is already displayed
  if (errText.classList.contains("visible")) {
    console.log("Error already displayed");
    return;
  }
  // Check to see if error is defined or not
  if (err === undefined) {
    errText.textContent = "Error: Unable to fetch data";
  } else {
    errText.textContent = err;
  }
  console.log(err);
  errText.classList.remove("hidden");
  errText.classList.add("visible");
  hideLoadingSpinner();
}

// Function to hide error fetching data
function hideError() {
  var errText = document.getElementById("errText");
  errText.classList.remove("visible");
  errText.classList.add("hidden");
}

// Function to format date and time
function formatDate(date) {
  var options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    timeZoneName: "short",
  };
  return date.toLocaleDateString(undefined, options);
}

// Function to display the page load date and time
function displayLoadDateTime() {
  var loadDateTimeElement = document.getElementById("loadDateTime");
  var loadDateTime = new Date();
  loadDateTimeElement.textContent = "Last Refresh: " + formatDate(loadDateTime);
}

// Function to disable all buttons
function disableButtons() {
  var buttons = document.getElementsByTagName("button");
  var checkboxes = document.querySelectorAll("input[type='checkbox']");
  for (var i = 0; i < buttons.length; i++) {
    buttons[i].disabled = true;
  }
  for (var j = 0; j < checkboxes.length; j++) {
    checkboxes[j].disabled = true;
  }
}

// Function to enable all buttons
function enableButtons() {
  var buttons = document.getElementsByTagName("button");
  var checkboxes = document.querySelectorAll("input[type='checkbox']");
  for (var i = 0; i < buttons.length; i++) {
    buttons[i].disabled = false;
  }
  for (var j = 0; j < checkboxes.length; j++) {
    checkboxes[j].disabled = false;
  }
}

//
//
// DarkMode
//
//
let darkMode = localStorage.getItem("darkMode");
const darkModeToggle = document.querySelector("#darkModeToggle");
const enableDarkMode = () => {
  document.body.classList.add("darkmode");
  localStorage.setItem("darkMode", "enabled");
};
const disableDarkMode = () => {
  document.body.classList.remove("darkmode");
  localStorage.setItem("darkMode", null);
};
darkModeToggle.checked = darkMode === "enabled";
darkModeToggle.addEventListener("change", () => {
  checkDarkMode();
});
function checkDarkMode() {
  if (darkModeToggle.checked) {
    enableDarkMode();
  } else {
    disableDarkMode();
  }
}
checkDarkMode();

// Function to show loading spinner
function showLoadingSpinner() {
  const spinner = document.getElementById("loading-spinner");
  spinner.classList.remove("hidden");
  spinner.classList.add("visible");
}

// Function to hide loading spinner
function hideLoadingSpinner() {
  const spinner = document.getElementById("loading-spinner");
  spinner.classList.remove("visible");
  spinner.classList.add("hidden");
}

async function createFacilityCard(facility) {
  // Create bearer token
  facility.bearer = await createBearer(
    facility.username,
    facility.password,
    facility.clientID,
    facility.secretID,
    facility.stageKey,
    facility.envKey
  );

  // Get the facility name and display it
  const property = await getFacility(
    facility.stageKey,
    facility.envKey,
    facility.propertyID,
    facility.bearer
  );
  facility.name = property.name;
  facility.address = property.addressLine1;

  const smartLocks = await getSmartLock(
    facility.stageKey,
    facility.envKey,
    facility.propertyID,
    facility.bearer
  );
  const edgeRouter = await getEdgeRouter(
    facility.stageKey,
    facility.envKey,
    facility.propertyID,
    facility.bearer
  );
  const accesspoints = await getAccessPoints(
    facility.stageKey,
    facility.envKey,
    facility.propertyID,
    facility.bearer
  );

  const card = document.createElement("div");
  card.innerHTML = `
  <h3>${facility.name}'s Summary</h3>
  <ul>
<li><strong>SmartLocks:</strong></li>
<ul id="smartlock-list" class="stat-list">
  <li class="stat-item">
    <div class="stat-number">${smartLocks.okCount}</div>
    <div class="stat-label">Okays</div>
  </li>
  <li class="stat-item">
    <div class="stat-number">${smartLocks.warningCount}</div>
    <div class="stat-label">Warnings</div>
  </li>
  <li class="stat-item">
    <div class="stat-number">${smartLocks.errorCount}</div>
    <div class="stat-label">Errors</div>
  </li>
</ul>
  <li><strong>Edge Router:</strong></li>
  <ul id="edge-router-list">
  <li>
    <strong>Name:</strong> ${edgeRouter.name}<br>
    <strong>isDeviceOffline:</strong> ${edgeRouter.isDeviceOffline}<br>
    <strong>eventStatus:</strong> ${edgeRouter.eventStatus}<br>
    <strong>eventStatusMessage:</strong> ${edgeRouter.eventStatusMessage}<br>
    <strong>connectionStatus:</strong> ${edgeRouter.connectionStatus}<br>
    <strong>connectionStatusMessage:</strong> ${edgeRouter.connectionStatusMessage}</li></ul>
    <li><strong>Access Points:</strong></li>
  <ul id="access-points-list"></ul>
  </ul>
`;
  const edgeRouterStatus = card.querySelector("#edge-router-list li");
  if (edgeRouter.isDeviceOffline) {
    edgeRouterStatus.style.backgroundColor = "#f69697";
  }

  // Populate access points
  const accessPointsList = card.querySelector("#access-points-list");
  accesspoints.forEach((ap) => {
    const listItem = document.createElement("li");
    if (ap.isDeviceOffline) {
      listItem.style.backgroundColor = "#f69697";
    }
    listItem.innerHTML = `
    <strong>Name:</strong> ${ap.name}<br>
    <strong>Offline:</strong> ${ap.isDeviceOffline}<br>
    <strong>Connection:</strong> ${ap.connectionStatus}<br>
    <strong>Connection Message:</strong> ${ap.connectionStatusMessage}
  `;
    accessPointsList.appendChild(listItem);
  });

  // Add card styling
  card.className = "card";

  // Append the card to the container
  document.getElementById("card-container").appendChild(card);
}

function createImportCard() {
  const importCard = document.createElement("div");
  importCard.className = "card import-card";
  importCard.innerHTML = `
    <button class="add-button">+</button>
    <button class="import-button">Import</button>
    <button class="export-button">Export</button>
        <input type="file" id="csv-file-input" style="display:none;" accept=".csv" />

  `;

  // Handle the add functionality
  importCard.querySelector(".add-button").addEventListener("click", () => {
    alert("This modal has not been added yet...");
  });

  // Handle the Import functionality
  importCard.querySelector(".import-button").addEventListener("click", () => {
    document.getElementById("csv-file-input").click(); // Trigger file input click
  });

  importCard
    .querySelector("#csv-file-input")
    .addEventListener("change", (event) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const csvContent = e.target.result;
          const importedFacilities = uploadCSV(csvContent);
          facilities.push(...importedFacilities);
          localStorage.setItem("savedFacilities", JSON.stringify(facilities));
          renderCards(facilities);
        };
        reader.readAsText(file);
      }
    });

  importCard.querySelector(".export-button").addEventListener("click", () => {
    const csvContent = convertToCSV(facilities);
    downloadCSV(csvContent);
  });

  return importCard;
}

async function renderCards(facilities) {
  const cardContainer = document.getElementById("card-container");
  cardContainer.innerHTML = "";

  for (const facility of facilities) {
    await createFacilityCard(facility);
  }

  // Always append the Import Card at the end
  const importCard = createImportCard();
  cardContainer.appendChild(importCard);
}

// On webpage load function
async function onWebLoad() {
  // Show loading spinner
  showLoadingSpinner();
  let facilitiesString = localStorage.getItem("savedFacilities") || [];
  facilities = facilitiesString ? JSON.parse(facilitiesString) : [];

  // Render Cards
  await renderCards(facilities);

  // Hide loading spinner
  hideLoadingSpinner();

  // Show load date
  displayLoadDateTime();
}

/*----------------------------------------------------------------
                        On window load
----------------------------------------------------------------*/
onWebLoad();

//reload the page every 30 minutes in order to refresh the bearer token and validate data
setTimeout(() => {
  location.reload();
}, 1800000);
