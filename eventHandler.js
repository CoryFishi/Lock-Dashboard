// On reload hide errors
hideError();

var eventsArray;

/*----------------------------------------------------------------
                        Variable Declarations
----------------------------------------------------------------*/
var facilities = [];
let bearerToken; // Holds the bearer token for authentication
let jsonData; // Holds JSON data fetched from APIs
let currentTime; // Holds the current time in milliseconds
let expirationTime; // Holds the expiration time of the bearer token
let timeUntilExpiration; // Holds the time until the bearer token expires
var expanedOpened = false;
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
async function getSmartLockExpanded(stageKey, envKey, propertyID, bearer) {
  try {
    const response = await fetch(
      `https://accesscontrol.${stageKey}insomniaccia${envKey}.com/facilities/${propertyID}/smartlockstatus`,
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

// Get event info
async function getEvents(stageKey, envKey, propertyID, bearer) {
  try {
    const currentTime = Math.floor(Date.now() / 1000);
    const oneWeekAgo = currentTime - 7 * 24 * 60 * 60;
    const response = await fetch(
      `https://accessevent.${stageKey}insomniaccia${envKey}.com/combinedevents/facilities/${propertyID}?uq=&vq=&itq=2&itq=3&itq=4&etq=5&etq=6&etq=10&etq=11&etq=12&etq=15&minDate=${oneWeekAgo}&maxDate=${currentTime}&hideMetadata=true`,
      {
        headers: {
          Authorization: "Bearer " + (await bearer.access_token),
          accept: "application/json",
          "api-version": "3.0",
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

// Get SmartLock Summary Info
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
  location.reload();
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

// //
// //
// // DarkMode
// //
// //
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

async function smartlockExpandedPopUp(
  smartLocksExpanded,
  value,
  option,
  totalSmartLocksExpanded
) {
  var count = 0;

  // Create popup container
  const popupContainer = document.createElement("div");
  popupContainer.classList.add("expanded-popup-container");

  const smartLockTotalContainer = document.createElement("div");
  smartLockTotalContainer.classList.add("smartLock-total-container");

  const smartLockToal = document.createElement("h3");

  smartLockTotalContainer.appendChild(smartLockToal);
  popupContainer.appendChild(smartLockTotalContainer);

  const tableContainer = document.createElement("div");
  tableContainer.classList.add("table-container");

  const expandedSmartLockTable = document.createElement("table");
  expandedSmartLockTable.className = "smart-lock-table";
  const headers = [
    "Name",
    "Unit",
    "Device Type",
    "Signal Quality",
    "Battery",
    "Lock State",
    "Unit Details",
    "Lock Status Message",
    "Last Update",
  ];
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  headers.forEach((headerText) => {
    const th = document.createElement("th");
    th.textContent = headerText;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);

  const tbody = document.createElement("tbody");

  // Loop through each device in smartLocksExpanded
  smartLocksExpanded.forEach((device) => {
    const row = document.createElement("tr");
    if (
      device.overallStatus !== value &&
      value !== "" &&
      option === "overallStatus"
    ) {
      return;
    }

    count++;

    // Create a cell for each header and populate it with the corresponding data
    headers.forEach((header) => {
      const td = document.createElement("td");
      switch (header) {
        case "Name":
          td.textContent = device.name;
          break;
        case "Unit":
          td.textContent = device.unitName;
          break;
        case "Device Type":
          td.textContent = device.deviceType;
          break;
        case "Signal Quality":
          const signal = (device.signalQuality / 255) * 100;
          td.textContent = signal.toFixed(2) + "%";
          break;
        case "Battery":
          var batteryIcon;
          if (device.batteryLevel > 50) {
            batteryIcon = "🔋";
          } else {
            batteryIcon = "🪫";
          }
          td.textContent = batteryIcon + device.batteryLevel + "%";
          break;
        case "Lock State":
          td.textContent = device.lockState;
          break;
        case "Unit Details":
          if (device.visitorName === null) {
            td.textContent = device.unitStatus;
          } else {
            td.textContent = device.unitStatus + " - " + device.visitorName;
          }
          break;
        case "Lock Status Message":
          if (device.overallStatus === "ok") {
            td.textContent = "✅ SmartLock is Online";
          } else if (device.overallStatus === "error") {
            td.textContent = "⛔" + device.statusMessages.join(", ");
          } else {
            td.textContent = "⚠️" + device.statusMessages.join(", ");
          }
          break;
        case "Last Update":
          td.textContent = device.lastUpdateTimestampDisplay;
          break;
        default:
          td.textContent = "";
          break;
      }
      row.appendChild(td);
    });

    // Append the row to the tbody
    tbody.appendChild(row);
  });

  smartLockToal.innerText = `${count} / ${totalSmartLocksExpanded.length} SmartLocks`;

  expandedSmartLockTable.appendChild(tbody);
  expandedSmartLockTable.appendChild(thead);
  tableContainer.appendChild(expandedSmartLockTable);
  popupContainer.appendChild(tableContainer);

  // Create close button
  const closeButton = document.createElement("button");
  closeButton.textContent = "X";
  closeButton.classList.add("close-button");
  closeButton.addEventListener("click", function () {
    expanedOpened = false;
    document.body.removeChild(popupContainer);
    document.body.style.overflow = "";
    enableButtons();
  });

  popupContainer.appendChild(closeButton);

  document.body.appendChild(popupContainer);
}

async function smartlockEventsPopUp(events) {
  // Create popup container
  const popupContainer = document.createElement("div");
  popupContainer.classList.add("events-popup-container");

  const eventsTotalContainer = document.createElement("div");
  eventsTotalContainer.classList.add("events-total-container");

  const eventsToal = document.createElement("h3");
  eventsToal.innerText = `${events.length} Events`;

  eventsTotalContainer.appendChild(eventsToal);
  popupContainer.appendChild(eventsTotalContainer);

  const tableContainer = document.createElement("div");
  tableContainer.classList.add("table-container");

  const eventsTable = document.createElement("table");
  eventsTable.className = "smart-lock-table";
  const headers = [
    "Event Date",
    "Event Category",
    "Event Type",
    "Device Name",
    "Unit Name",
    "Visitor",
    "Event Details",
  ];
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  headers.forEach((headerText) => {
    const th = document.createElement("th");
    th.textContent = headerText;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);

  const tbody = document.createElement("tbody");
  // Loop through each event in events
  events.forEach((event) => {
    const row = document.createElement("tr");

    const date = new Date(event.createdOn);
    const options = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      timeZoneName: "short",
    };
    const readableDate = date.toLocaleDateString("en-US", options);

    // Create a cell for each header and populate it with the corresponding data
    headers.forEach((header) => {
      const td = document.createElement("td");
      switch (header) {
        case "Event Date":
          td.textContent = readableDate;
          break;
        case "Event Category":
          td.textContent = event.eventCategory;
          break;
        case "Event Type":
          td.textContent = event.eventType;
          break;
        case "Device Name":
          td.textContent = event.deviceName;
          break;
        case "Unit Name":
          td.textContent = event.unitName;
          break;
        case "Visitor":
          if (!event.visitorFirstName) {
            td.textContent = "";
          } else {
            td.textContent =
              event.visitorFirstName + " " + event.visitorLastName;
          }
          break;
        case "Event Details":
          td.textContent = event.eventDetails;
          break;
        default:
          td.textContent = "";
          break;
      }
      row.appendChild(td);
    });

    // Append the row to the tbody
    tbody.appendChild(row);
  });

  eventsTable.appendChild(tbody);
  eventsTable.appendChild(thead);
  tableContainer.appendChild(eventsTable);
  popupContainer.appendChild(tableContainer);

  // Create close button
  const closeButton = document.createElement("button");
  closeButton.textContent = "X";
  closeButton.classList.add("close-button");
  closeButton.addEventListener("click", function () {
    expanedOpened = false;
    document.body.removeChild(popupContainer);
    document.body.style.overflow = "";
    enableButtons();
  });

  popupContainer.appendChild(closeButton);

  document.body.appendChild(popupContainer);
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
    facility.stageKey || "",
    facility.envKey || "",
    facility.propertyID,
    facility.bearer
  );
  facility.name = property.name;
  facility.address = property.addressLine1;
  facility.uniqueID = `${facility.propertyID}-${Date.now()}`;

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

  const smartLocksExpanded = await getSmartLockExpanded(
    facility.stageKey,
    facility.envKey,
    facility.propertyID,
    facility.bearer
  );

  const events = await getEvents(
    facility.stageKey,
    facility.envKey,
    facility.propertyID,
    facility.bearer
  );

  const offlineEvents = events.filter(
    (event) => event.eventType === "Device Offline"
  );
  const onlineEvents = events.filter(
    (event) => event.eventType === "Device Online"
  );
  const lockFailure = events.filter(
    (event) => event.eventType === "Lock Failure"
  );
  const unlockFailure = events.filter(
    (event) => event.eventType === "Unlock Failure"
  );
  const lockSuccess = events.filter(
    (event) => event.eventType === "Lock Success"
  );
  const lockAlarm = events.filter((event) => event.eventType === "Lock Alarm");

  const lowestBatteryLevel = smartLocksExpanded.reduce((min, device) => {
    return device.batteryLevel < min ? device.batteryLevel : min;
  }, Infinity);
  const devicesWithLowestBattery = smartLocksExpanded.filter(
    (device) => device.batteryLevel === lowestBatteryLevel
  );

  const lowestSignal = smartLocksExpanded.reduce((min, device) => {
    return device.signalQuality < min ? device.signalQuality : min;
  }, Infinity);
  const devicesWithLowestSignal = smartLocksExpanded.filter(
    (device) => device.signalQuality === lowestSignal
  );

  const devicesOffline = smartLocksExpanded.filter(
    (device) => device.isDeviceOffline === true
  );

  smartLocksExpanded.sort((a, b) => a.name.localeCompare(b.name));
  accesspoints.sort((a, b) => a.name.localeCompare(b.name));
  devicesWithLowestBattery.sort((a, b) => a.name.localeCompare(b.name));
  devicesWithLowestSignal.sort((a, b) => a.name.localeCompare(b.name));
  devicesOffline.sort((a, b) => a.name.localeCompare(b.name));

  const readableEdgeRouterDate = new Date(
    edgeRouter.lastCommunicationOn
  ).toLocaleString();

  const card = document.createElement("div");
  card.innerHTML = `
    <h3 id="name" class="bold">
      ${facility.name}'s Summary
    </h3>
    <button class="delete-card-btn" title="Delete">&times;</button>
    <a href="https://portal.${facility.stageKey}insomniaccia${
    facility.envKey
  }.com/facility/${
    facility.propertyID
  }/dashboard" class="link-card-btn" title="https://portal.${
    facility.stageKey
  }insomniaccia${facility.envKey}.com/facility/${
    facility.propertyID
  }/dashboard">➚</a>
    <ul>
      <li id="smartlocks"><span id="smartlockCollapse"> - </span><span id="smartlockList" class="bold" title="View all SmartLocks">SmartLocks:</span></li>
      <ul id="smartlock-list" class="stat-list">
        <li class="stat-item" id="okay" title="View all Good">
          <div class="stat-number">${smartLocks.okCount}</div>
          <div class="stat-label">Good</div>
        </li>
        <li class="stat-item" id="warning" title="View all Warnings">
          <div class="stat-number">${smartLocks.warningCount}</div>
          <div class="stat-label">Warning</div>
        </li>
        <li class="stat-item" id="error" title="View all Errors">
          <div class="stat-number">${smartLocks.errorCount}</div>
          <div class="stat-label">Error</div>
        </li>
        <li class="stat-item" id="low-battery" title="View the Lowest Battery">
          <div class="stat-number">${lowestBatteryLevel + "%"}</div>
          <div class="stat-label">Lowest battery</div>
        </li>
        <li class="stat-item" id="low-signal" title="View the Lowest Signal Quality">
          <div class="stat-number">${
            Math.round((lowestSignal / 255) * 100) + "%"
          }</div>
          <div class="stat-label">Lowest Signal</div>
        </li>
        <li class="stat-item" id="offline" title="View all the offline SmartLocks">
          <div class="stat-number">${devicesOffline.length}</div>
          <div class="stat-label">Offline SmartLocks</div>
        </li>
      </ul>
    <li id="edgeRouter" class="bold"><span id="edgeRouterCollapse"> - </span><span id="edgeRouterList" class="bold" title="Edge Routers & Access Points">OpenNet:</span></li>
    <ul id="edge-router-list">
      <li id="edgeRouterLi">
        <div>
          <span class="status-circle" style="background-color: ${
            edgeRouter.isDeviceOffline ? "red" : "green"
          };" title="${
    edgeRouter.isDeviceOffline ? "Offline" : "Online"
  }"></span>
        </div>
        <div>
        <p class="bold" title="Name of Edge Router">${edgeRouter.name}</p>
        <p title="Last Communication Date">${readableEdgeRouterDate}</p>
        </div>
      </li>
      <ul id="access-points-list"></ul>
    </ul>
    <li id="weekly" class="bold"><span id="weeklyCollapse"> - </span><strong><span id="weeklyEvents" class="bold" title="View All Weekly Events">Weekly Events:</span></strong></li>
    <ul id="events-list" class="stat-list">
      <li class="stat-item" id="offlineEvents" title="View all Offline Events">
        <div class="stat-number">${offlineEvents.length}</div>
        <div class="stat-label">Device Offline</div>
      </li>
      <li class="stat-item" id="onlineEvents" title="View all Online Events">
        <div class="stat-number">${onlineEvents.length}</div>
        <div class="stat-label">Device Online</div>
      </li>
      <li class="stat-item" id="lockAlarm" title="View all Lock Alarm Events">
        <div class="stat-number">${lockAlarm.length}</div>
        <div class="stat-label">Lock Alarm</div>
      </li>
      <li class="stat-item" id="unlockFailure" title="View all Unlock Failure Events">
        <div class="stat-number">${unlockFailure.length}</div>
        <div class="stat-label">Unlock Failure</div>
      </li>
      <li class="stat-item" id="lockFailure" title="View all Lock Failure Events">
        <div class="stat-number">${lockFailure.length}</div>
        <div class="stat-label">Lock Failure</div>
      </li>
      <li class="stat-item" id="lockSuccess" title="View all Lock Success Events">
        <div class="stat-number">${lockSuccess.length}</div>
        <div class="stat-label">Lock Success</div>
      </li>
    </ul>
  `;
  const edgeRouterStatus = card.querySelector("#edge-router-list li");
  if (edgeRouter.isDeviceOffline) {
    edgeRouterStatus.style.backgroundColor = "#f69697";
  }

  card
    .querySelector("#smartlockList")
    .addEventListener("click", async function () {
      if (expanedOpened) return false;
      showLoadingSpinner();

      // Disable scrolling on body
      document.body.style.overflow = "hidden";
      expanedOpened = true;
      disableButtons();

      smartlockExpandedPopUp(smartLocksExpanded, "", "");

      hideLoadingSpinner();
    });
  card.querySelector("#okay").addEventListener("click", async function () {
    if (expanedOpened) return false;
    showLoadingSpinner();

    // Disable scrolling on body
    document.body.style.overflow = "hidden";
    expanedOpened = true;
    disableButtons();

    smartlockExpandedPopUp(
      smartLocksExpanded,
      "ok",
      "overallStatus",
      smartLocksExpanded
    );

    hideLoadingSpinner();
  });
  card.querySelector("#warning").addEventListener("click", async function () {
    if (expanedOpened) return false;
    showLoadingSpinner();

    // Disable scrolling on body
    document.body.style.overflow = "hidden";
    expanedOpened = true;
    disableButtons();

    smartlockExpandedPopUp(
      smartLocksExpanded,
      "warning",
      "overallStatus",
      smartLocksExpanded
    );

    hideLoadingSpinner();
  });
  card.querySelector("#error").addEventListener("click", async function () {
    if (expanedOpened) return false;
    showLoadingSpinner();

    document.body.style.overflow = "hidden";
    expanedOpened = true;
    disableButtons();

    smartlockExpandedPopUp(
      smartLocksExpanded,
      "error",
      "overallStatus",
      smartLocksExpanded
    );

    hideLoadingSpinner();
  });
  card
    .querySelector("#low-battery")
    .addEventListener("click", async function () {
      if (expanedOpened) return false;
      showLoadingSpinner();

      document.body.style.overflow = "hidden";
      expanedOpened = true;
      disableButtons();

      smartlockExpandedPopUp(
        devicesWithLowestBattery,
        "error",
        "lowestBattery",
        smartLocksExpanded
      );

      hideLoadingSpinner();
    });
  card
    .querySelector("#low-signal")
    .addEventListener("click", async function () {
      if (expanedOpened) return false;
      showLoadingSpinner();

      document.body.style.overflow = "hidden";
      expanedOpened = true;
      disableButtons();

      smartlockExpandedPopUp(
        devicesWithLowestSignal,
        "error",
        "lowestSignal",
        smartLocksExpanded
      );

      hideLoadingSpinner();
    });
  card.querySelector("#offline").addEventListener("click", async function () {
    if (expanedOpened) return false;
    showLoadingSpinner();

    document.body.style.overflow = "hidden";
    expanedOpened = true;
    disableButtons();

    smartlockExpandedPopUp(
      devicesOffline,
      "error",
      "offline",
      smartLocksExpanded
    );

    hideLoadingSpinner();
  });

  card
    .querySelector("#weeklyEvents")
    .addEventListener("click", async function () {
      if (expanedOpened) return false;
      showLoadingSpinner();

      // Disable scrolling on body
      document.body.style.overflow = "hidden";
      expanedOpened = true;
      disableButtons();

      smartlockEventsPopUp(events);

      hideLoadingSpinner();
    });
  card
    .querySelector("#offlineEvents")
    .addEventListener("click", async function () {
      if (expanedOpened) return false;
      showLoadingSpinner();

      // Disable scrolling on body
      document.body.style.overflow = "hidden";
      expanedOpened = true;
      disableButtons();

      smartlockEventsPopUp(offlineEvents);

      hideLoadingSpinner();
    });
  card
    .querySelector("#onlineEvents")
    .addEventListener("click", async function () {
      if (expanedOpened) return false;
      showLoadingSpinner();

      // Disable scrolling on body
      document.body.style.overflow = "hidden";
      expanedOpened = true;
      disableButtons();

      smartlockEventsPopUp(onlineEvents);

      hideLoadingSpinner();
    });
  card.querySelector("#lockAlarm").addEventListener("click", async function () {
    if (expanedOpened) return false;
    showLoadingSpinner();

    // Disable scrolling on body
    document.body.style.overflow = "hidden";
    expanedOpened = true;
    disableButtons();

    smartlockEventsPopUp(lockAlarm);

    hideLoadingSpinner();
  });
  card
    .querySelector("#unlockFailure")
    .addEventListener("click", async function () {
      if (expanedOpened) return false;
      showLoadingSpinner();

      // Disable scrolling on body
      document.body.style.overflow = "hidden";
      expanedOpened = true;
      disableButtons();

      smartlockEventsPopUp(unlockFailure);

      hideLoadingSpinner();
    });
  card
    .querySelector("#lockFailure")
    .addEventListener("click", async function () {
      if (expanedOpened) return false;
      showLoadingSpinner();

      // Disable scrolling on body
      document.body.style.overflow = "hidden";
      expanedOpened = true;
      disableButtons();

      smartlockEventsPopUp(lockFailure);

      hideLoadingSpinner();
    });
  card
    .querySelector("#lockSuccess")
    .addEventListener("click", async function () {
      if (expanedOpened) return false;
      showLoadingSpinner();

      // Disable scrolling on body
      document.body.style.overflow = "hidden";
      expanedOpened = true;
      disableButtons();

      smartlockEventsPopUp(lockSuccess);

      hideLoadingSpinner();
    });

  card
    .querySelector("#edgeRouterCollapse")
    .addEventListener("click", function () {
      const elist = card.querySelector("#edge-router-list");
      const alist = card.querySelector("#access-points-list");
      const currentDisplay = card.computedStyleMap(elist).display;
      const collapseIcon = card.querySelector("#edgeRouterCollapse");

      if (currentDisplay === "none" || elist.style.display === "none") {
        elist.style.display = "grid";
        alist.style.display = "grid";
        collapseIcon.textContent = "- ";
      } else {
        alist.style.display = "none";
        elist.style.display = "none";
        collapseIcon.textContent = "+ ";
      }
    });
  card.querySelector("#weeklyCollapse").addEventListener("click", function () {
    const events = card.querySelector("#events-list");
    const currentDisplay = card.computedStyleMap(events).display;
    const collapseIcon = card.querySelector("#weeklyCollapse");

    if (currentDisplay === "none" || events.style.display === "none") {
      events.style.display = "flex";
      collapseIcon.textContent = "- ";
    } else {
      events.style.display = "none";
      collapseIcon.textContent = "+ ";
    }
  });
  card
    .querySelector("#smartlockCollapse")
    .addEventListener("click", function () {
      const smartlocks = card.querySelector("#smartlock-list");
      const currentDisplay = card.computedStyleMap(smartlocks).display;
      const collapseIcon = card.querySelector("#smartlockCollapse");

      if (currentDisplay === "none" || smartlocks.style.display === "none") {
        smartlocks.style.display = "flex";
        collapseIcon.textContent = "- ";
      } else {
        smartlocks.style.display = "none";
        collapseIcon.textContent = "+ ";
      }
    });

  card.addEventListener("mouseenter", function () {
    document.body.classList.add("scroll-lock");
  });

  card.addEventListener("mouseleave", function () {
    document.body.classList.remove("scroll-lock");
  });

  // Populate access points
  const accessPointsList = card.querySelector("#access-points-list");
  accesspoints.forEach((ap) => {
    const listItem = document.createElement("li");
    const readableDate = new Date(ap.lastUpdateTimestamp).toLocaleString();
    if (ap.isDeviceOffline) {
      listItem.style.backgroundColor = "#f69697";
    }
    listItem.id = "edgeRouterLi";
    listItem.innerHTML = `
      <div>
        <span class="status-circle" style="background-color: ${
          ap.isDeviceOffline ? "red" : "green"
        };" title="${ap.isDeviceOffline ? "Offline" : "Online"}"></span>
      </div>
      <div>
        <p class="bold" title="Name of Access Point">${ap.name}</p>
        <p title="Last Status Change">${readableDate}</p>
      </div>
    `;

    accessPointsList.appendChild(listItem);
  });

  card.className = "card";
  card.id = `card-${facility.uniqueID}`;

  // Add the delete button functionality
  card.querySelector(".delete-card-btn").addEventListener("click", function () {
    // Remove the card from the DOM
    card.remove();

    // Delete the facility from the savedDashboardFacilities object using the uniqueID
    const savedFacilities = facilities.filter(
      (f) => f.uniqueID !== facility.uniqueID
    );
    facilities = savedFacilities;

    // Update localStorage with the modified object
    localStorage.setItem(
      "savedDashboardFacilities",
      JSON.stringify(savedFacilities)
    );
  });

  // Append the card to the container
  document.getElementById("card-container").appendChild(card);
}

function createImportCard() {
  const importCard = document.createElement("div");
  importCard.className = "card import-card";
  importCard.innerHTML = `<button class="add-button">+</button>`;

  importCard.querySelector(".add-button").addEventListener("click", () => {
    modal.style.display = "block";
  });

  document.querySelector(".import-button").addEventListener("click", () => {
    document.getElementById("csv-file-input").click();
  });

  document
    .querySelector("#csv-file-input")
    .addEventListener("change", (event) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const csvContent = e.target.result;
          const importedFacilities = uploadCSV(csvContent);
          facilities.push(...importedFacilities);
          localStorage.setItem(
            "savedDashboardFacilities",
            JSON.stringify(facilities)
          );
          renderCards(facilities);
        };
        reader.readAsText(file);
      }
    });

  document.querySelector(".export-button").addEventListener("click", () => {
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

document.getElementById("scroll-up").addEventListener("click", function () {
  window.scrollTo({
    top: 0,
    behavior: "smooth", // Smooth scroll to the top
  });
});

document.getElementById("scroll-down").addEventListener("click", function () {
  window.scrollTo({
    top: document.body.scrollHeight,
    behavior: "smooth", // Smooth scroll to the bottom
  });
});

//
//
// Modal
//
//
// Get the modal
const modal = document.getElementById("addFacilityModal");

// Get the <span> element that closes the modal
const span = document.querySelector(".close");

// When the user clicks on <span> (x), close the modal
span.onclick = function () {
  modal.style.display = "none";
  enableButtons();
};

// When the user clicks anywhere outside of the modal, close it
window.onclick = function (event) {
  if (event.target == modal) {
    modal.style.display = "none";
    enableButtons();
  }
};

// Handle form submission
document
  .getElementById("addFacilityForm")
  .addEventListener("submit", function (event) {
    event.preventDefault(); // Prevent the form from submitting the traditional way

    // Create a new facility object from the form inputs
    const newFacility = {
      id: document.getElementById("propertyId").value + Date.now(),
      propertyID: document.getElementById("propertyId").value,
      username: document.getElementById("apiKey").value,
      password: document.getElementById("apiSecret").value,
      clientID: document.getElementById("clientId").value,
      secretID: document.getElementById("secretId").value,
      envKey: document.getElementById("environment").value,
      stageKey: document.getElementById("stagingKey").value,
    };

    // Add the new facility to the facilities array
    facilities.push(newFacility);

    // Save the updated facilities to localStorage
    localStorage.setItem(
      "savedDashboardFacilities",
      JSON.stringify(facilities)
    );

    // Re-render the cards with the new facility included
    renderCards(facilities);

    // Close the modal
    modal.style.display = "none";

    // Optionally, clear the form
    this.reset();
  });

// On webpage load function
async function onWebLoad() {
  // Show loading spinner
  showLoadingSpinner();
  let facilitiesString = localStorage.getItem("savedDashboardFacilities");
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
