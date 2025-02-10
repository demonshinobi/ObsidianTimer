/* @ts-nocheck */

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM fully loaded. Initializing popup.js...");

  // Global settings, timer state, and session name (for continuous sessions)
  let continuousSetting = false;
  let darkModeSetting = false;
  let timerRunning = false; // track if timer is active
  let currentSessionName = ""; // store session name if continuous timing is enabled

  // Immediately load persisted settings from storage on startup so that dark mode is applied
  chrome.storage.sync.get(["enableDarkMode", "continuousTiming"], (data) => {
    darkModeSetting = data.enableDarkMode || false;
    continuousSetting = data.continuousTiming || false;
    updateDarkMode();
  });

  // Function to update dark mode on the UI with visible changes.
  function updateDarkMode() {
    if (darkModeSetting) {
      document.body.classList.add("dark-mode");
      document.body.style.backgroundColor = "#333";
      document.body.style.color = "#FFF";
    } else {
      document.body.classList.remove("dark-mode");
      document.body.style.backgroundColor = "#FFF";
      document.body.style.color = "#000";
    }
  }

  // Function to show inline notifications in the popup
  function showNotification(message) {
    let notif = document.getElementById("notification");
    if (!notif) {
      notif = document.createElement("div");
      notif.id = "notification";
      // Styling the notification to appear as a popout in the upper right corner
      notif.style.position = "fixed";
      notif.style.top = "10px";
      notif.style.right = "10px";
      notif.style.background = "#007bff";
      notif.style.color = "#fff";
      notif.style.padding = "10px 15px";
      notif.style.borderRadius = "4px";
      notif.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";
      notif.style.zIndex = "1000";
      notif.style.opacity = "0";
      notif.style.transition = "opacity 0.3s ease";
      document.body.appendChild(notif);
    }
    notif.textContent = message;
    notif.style.opacity = "1";
    setTimeout(() => {
      notif.style.opacity = "0";
    }, 3000);
  }

  // Function to show an inline modal input for session name
  function showSessionInput(promptMessage, defaultValue, callback) {
    let overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    overlay.style.display = "flex";
    overlay.style.justifyContent = "center";
    overlay.style.alignItems = "center";
    overlay.style.zIndex = "1000";

    let container = document.createElement("div");
    container.style.background = "#fff";
    container.style.padding = "20px";
    container.style.borderRadius = "8px";
    container.style.textAlign = "center";
    container.style.maxWidth = "90%";

    let msg = document.createElement("p");
    msg.textContent = promptMessage;
    let input = document.createElement("input");
    input.type = "text";
    input.value = defaultValue || "";
    input.style.marginTop = "10px";
    input.style.padding = "5px";
    input.style.width = "80%";
    let confirmBtn = document.createElement("button");
    confirmBtn.textContent = "Submit";
    confirmBtn.style.marginTop = "10px";
    confirmBtn.addEventListener("click", function(){
      let val = input.value;
      document.body.removeChild(overlay);
      callback(val ? val : "");
    });

    container.appendChild(msg);
    container.appendChild(input);
    container.appendChild(confirmBtn);
    overlay.appendChild(container);
    document.body.appendChild(overlay);
  }

  // Function to show an inline modal input for editing session details (name and time)
  function showSessionEditInput(promptMessage, defaultName, defaultTime, callback) {
    let overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    overlay.style.display = "flex";
    overlay.style.justifyContent = "center";
    overlay.style.alignItems = "center";
    overlay.style.zIndex = "1000";

    let container = document.createElement("div");
    container.style.background = "#fff";
    container.style.padding = "20px";
    container.style.borderRadius = "8px";
    container.style.textAlign = "center";
    container.style.maxWidth = "90%";

    let msg = document.createElement("p");
    msg.textContent = promptMessage;

    let nameLabel = document.createElement("label");
    nameLabel.textContent = "Session Name:";
    nameLabel.style.display = "block";
    nameLabel.style.marginTop = "10px";

    let nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = defaultName || "";
    nameInput.style.marginTop = "5px";
    nameInput.style.padding = "5px";
    nameInput.style.width = "80%";

    let timeLabel = document.createElement("label");
    timeLabel.textContent = "Session Time (HH:MM:SS):";
    timeLabel.style.display = "block";
    timeLabel.style.marginTop = "10px";

    let timeInput = document.createElement("input");
    timeInput.type = "text";
    timeInput.value = defaultTime || "00:00:00";
    timeInput.style.marginTop = "5px";
    timeInput.style.padding = "5px";
    timeInput.style.width = "80%";

    let confirmBtn = document.createElement("button");
    confirmBtn.textContent = "Submit";
    confirmBtn.style.marginTop = "10px";
    confirmBtn.addEventListener("click", function(){
      let newName = nameInput.value;
      let timeStr = timeInput.value;
      document.body.removeChild(overlay);
      callback(newName, timeStr);
    });

    container.appendChild(msg);
    container.appendChild(nameLabel);
    container.appendChild(nameInput);
    container.appendChild(timeLabel);
    container.appendChild(timeInput);
    container.appendChild(confirmBtn);
    overlay.appendChild(container);
    document.body.appendChild(overlay);
  }

  // Utility: Parse a time string in HH:MM:SS format to milliseconds
  function parseTimeString(timeStr) {
    let parts = timeStr.split(":");
    if (parts.length !== 3) return 0;
    let hours = parseInt(parts[0], 10);
    let minutes = parseInt(parts[1], 10);
    let seconds = parseInt(parts[2], 10);
    return ((hours * 3600) + (minutes * 60) + seconds) * 1000;
  }

  // Primary view elements
  const timerContainer = document.getElementById("timerContainer");
  const sessionsDiv = document.getElementById("sessions");
  let settingsDiv = document.getElementById("settings");

  // If settingsDiv is not found, create one and append it to the document.
  if (!settingsDiv) {
    settingsDiv = document.createElement("div");
    settingsDiv.id = "settings";
    // Apply basic inline styles to ensure visibility.
    settingsDiv.style.padding = "10px";
    settingsDiv.style.border = "1px solid #ccc";
    settingsDiv.style.width = "100%";
    settingsDiv.style.boxSizing = "border-box";
    document.body.appendChild(settingsDiv);
    console.warn("settingsDiv was not found. A new settings container has been created.");
  }

  // Control buttons in the popup header (assumed to be grouped in two rows in the HTML)
  const startBtn = document.getElementById("start-timer-btn");
  const stopBtn = document.getElementById("stop-timer-btn");
  const resetBtn = document.getElementById("reset-timer-btn");
  const exportBtn = document.getElementById("export-md-btn");
  const settingsBtn = document.getElementById("settingsBtn");
  const sessionsBtn = document.getElementById("sessionsBtn");
  const timerDisplay = document.getElementById("timerDisplay");

  if (!timerContainer) console.error("timerContainer not found");
  if (!sessionsDiv) console.error("sessionsDiv not found");
  if (!settingsDiv) console.error("settingsDiv not found");
  if (!startBtn) console.error("start-timer-btn not found");
  if (!stopBtn) console.error("stop-timer-btn not found");
  if (!resetBtn) console.error("reset-timer-btn not found");
  if (!exportBtn) console.error("export-md-btn not found");
  if (!settingsBtn) console.error("settingsBtn not found");
  if (!sessionsBtn) console.error("sessionsBtn not found");
  if (!timerDisplay) console.error("timerDisplay not found");

  // Timer controls

  // Start button: initiate a session only if the timer is not running.
  startBtn.addEventListener("click", () => {
    console.log("Start button clicked");
    if (timerRunning) {
      console.log("Timer is already running.");
      return;
    }
    let sessionName = "";
    // Use inline modal instead of prompt
    if (continuousSetting) {
      if (!currentSessionName) {
        showSessionInput("Enter a name for this continuous session (or leave blank for default):", "", (val) => {
          currentSessionName = val || "Continuous Session";
          sessionName = currentSessionName;
          startTimer(sessionName);
        });
      } else {
        sessionName = currentSessionName;
        startTimer(sessionName);
      }
    } else {
      showSessionInput("Enter a name for this session (or leave blank for default):", "", (val) => {
        sessionName = val || "Default Session";
        startTimer(sessionName);
      });
    }
  });

  function startTimer(sessionName) {
    chrome.runtime.sendMessage({ action: "startTimer", sessionName: sessionName }, (response) => {
      console.log("Timer started:", response);
      timerRunning = true;
      showNotification("Timer started: " + sessionName);
    });
  }

  // Stop button: stops the timer. For continuous timing, it automatically restarts without using a separate window.
  stopBtn.addEventListener("click", () => {
    console.log("Stop button clicked");
    chrome.runtime.sendMessage({ action: "stopTimer" }, (response) => {
      console.log("Timer stopped:", response);
      timerRunning = false;
      if (continuousSetting) {
        // Instead of Edge's prompt dialog, use inline input.
        showSessionInput("Enter new session name for continuous session (or leave blank for default):", currentSessionName, (val) => {
          let newSessionName = val || "Continuous Session";
          currentSessionName = newSessionName;
          setTimeout(() => {
            chrome.runtime.sendMessage({ action: "startTimer", sessionName: newSessionName }, (resp) => {
              console.log("Timer restarted for continuous timing:", resp);
              timerRunning = true;
              showNotification("Timer restarted: " + newSessionName);
            });
          }, 100);
        });
      } else {
        showNotification("Timer stopped");
      }
    });
  });

  resetBtn.addEventListener("click", () => {
    console.log("Reset button clicked");
    chrome.runtime.sendMessage({ action: "resetTimer" }, (response) => {
      console.log("Timer reset:", response);
      timerRunning = false;
      // Clear saved continuous session name on reset.
      currentSessionName = "";
    });
  });

  exportBtn.addEventListener("click", () => {
    console.log("Export MD button clicked");
    chrome.runtime.sendMessage({ action: "exportMarkdown" }, (response) => {
      console.log("Markdown received:", response);
      const mdWindow = window.open("", "_blank");
      mdWindow.document.write("<pre>" + response.markdown + "</pre>");
    });
  });

  // Settings button: display settings within the popup instead of opening a new tab.
  settingsBtn.addEventListener("click", () => {
    console.log("Settings button clicked");
    if (timerContainer) timerContainer.style.display = "none";
    if (sessionsDiv) sessionsDiv.style.display = "none";
    if (settingsDiv) {
      settingsDiv.style.display = "block";
      initSettings();
    }
  });

  sessionsBtn.addEventListener("click", () => {
    console.log("Sessions button clicked");
    if (timerContainer) timerContainer.style.display = "none";
    if (settingsDiv) settingsDiv.style.display = "none";
    sessionsDiv.style.display = "block";
    loadSessions();
  });

  // Update timer display more frequently (every 100ms) for responsiveness.
  setInterval(() => {
    chrome.runtime.sendMessage({ action: "getElapsedTime" }, (response) => {
      if (timerDisplay) timerDisplay.textContent = formatTime(response.elapsed);
    });
  }, 100);

  // Function to switch back to timer view (from sessions or settings)
  function showTimerView() {
    if (timerContainer) timerContainer.style.display = "block";
    sessionsDiv.style.display = "none";
    settingsDiv.style.display = "none";
  }

  // Updated Function to load sessions into the management view with edit and add functionalities
  function loadSessions() {
    console.log("Loading sessions...");
    chrome.runtime.sendMessage({ action: "getSessions" }, (response) => {
      sessionsDiv.innerHTML = "";
      
      // Back button to return to the timer view
      const backBtn = document.createElement("button");
      backBtn.textContent = "Back";
      backBtn.addEventListener("click", showTimerView);
      sessionsDiv.appendChild(backBtn);
      
      // Add Session button to manually add a session
      const addBtn = document.createElement("button");
      addBtn.textContent = "Add Session";
      addBtn.style.marginLeft = "10px";
      addBtn.addEventListener("click", () => {
        showSessionInput("Enter a name for the new session:", "", (val) => {
          let newSessionName = val || "New Session";
          // Add a new session with elapsed time of 0
          chrome.runtime.sendMessage({ action: "addSession", sessionName: newSessionName, elapsed: 0 }, (resp) => {
            console.log("Session added:", resp);
            loadSessions();
          });
        });
      });
      sessionsDiv.appendChild(addBtn);
      
      // List sessions with delete, edit, and reorder options
      response.sessions.forEach((session, index) => {
        const sessionDiv = document.createElement("div");
        sessionDiv.className = "session";
        sessionDiv.textContent = `${index + 1}. ${session.name} — ${formatTime(session.elapsed)}`;
  
        // Delete button
        const delBtn = document.createElement("button");
        delBtn.textContent = "Delete";
        delBtn.style.marginLeft = "10px";
        delBtn.addEventListener("click", () => {
          chrome.runtime.sendMessage({ action: "deleteSession", index: index }, (resp) => {
            console.log("Session deleted:", resp);
            loadSessions();
          });
        });
        sessionDiv.appendChild(delBtn);
  
        // Edit button for updating session name and time
        const editBtn = document.createElement("button");
        editBtn.textContent = "Edit";
        editBtn.style.marginLeft = "10px";
        editBtn.addEventListener("click", () => {
          let currentTime = formatTime(session.elapsed);
          showSessionEditInput("Edit session details:", session.name, currentTime, (newName, newTimeStr) => {
            let newElapsed = parseTimeString(newTimeStr);
            newName = newName || session.name;
            chrome.runtime.sendMessage({ action: "editSession", index: index, newName: newName, newElapsed: newElapsed }, (resp) => {
              console.log("Session edited:", resp);
              loadSessions();
            });
          });
        });
        sessionDiv.appendChild(editBtn);
  
        // Up button for reordering
        const upBtn = document.createElement("button");
        upBtn.textContent = "Up";
        upBtn.style.marginLeft = "10px";
        upBtn.addEventListener("click", () => {
          chrome.runtime.sendMessage({ action: "moveSession", index: index, direction: "up" }, (resp) => {
            console.log("Session moved up:", resp);
            loadSessions();
          });
        });
        sessionDiv.appendChild(upBtn);
  
        // Down button for reordering
        const downBtn = document.createElement("button");
        downBtn.textContent = "Down";
        downBtn.style.marginLeft = "10px";
        downBtn.addEventListener("click", () => {
          chrome.runtime.sendMessage({ action: "moveSession", index: index, direction: "down" }, (resp) => {
            console.log("Session moved down:", resp);
            loadSessions();
          });
        });
        sessionDiv.appendChild(downBtn);
  
        sessionsDiv.appendChild(sessionDiv);
      });
    });
  }
  
  // Function to initialize and manage the settings view
  function initSettings() {
    settingsDiv.innerHTML = `
      <h2 style="margin-top: 0;">Settings</h2>
      <div style="margin-bottom: 10px;">
        <label>
          Dark Mode:
          <input type="checkbox" id="enableDarkMode" />
        </label>
      </div>
      <div style="margin-bottom: 10px;">
        <label>
          Continuous Timing:
          <input type="checkbox" id="continuousTiming" />
        </label>
      </div>
      <div>
        <button id="saveSettingsBtn">Save Settings</button>
        <button id="backFromSettingsBtn">Back</button>
      </div>
    `;
  
    const saveBtn = settingsDiv.querySelector("#saveSettingsBtn");
    const darkModeCheckbox = settingsDiv.querySelector("#enableDarkMode");
    const continuousTimingCheckbox = settingsDiv.querySelector("#continuousTiming");
    const backBtn = settingsDiv.querySelector("#backFromSettingsBtn");
  
    if (!saveBtn) console.error("saveSettingsBtn not found in settings view");
    if (!darkModeCheckbox) console.error("enableDarkMode checkbox not found in settings view");
    if (!continuousTimingCheckbox) console.error("continuousTiming checkbox not found in settings view");
    if (!backBtn) console.error("backFromSettingsBtn not found in settings view");
  
    // Load saved settings from chrome.storage and update local globals.
    chrome.storage.sync.get(["enableDarkMode", "continuousTiming"], (data) => {
      darkModeCheckbox.checked = data.enableDarkMode || false;
      continuousTimingCheckbox.checked = data.continuousTiming || false;
      darkModeSetting = darkModeCheckbox.checked;
      continuousSetting = continuousTimingCheckbox.checked;
      updateDarkMode();
    });
  
    // Save settings and update globals when the user clicks "Save Settings"
    saveBtn.addEventListener("click", () => {
      darkModeSetting = darkModeCheckbox.checked;
      continuousSetting = continuousTimingCheckbox.checked;
      // Reset continuous session name if continuous timing has been turned off.
      if (!continuousSetting) currentSessionName = "";
      chrome.storage.sync.set({ enableDarkMode: darkModeSetting, continuousTiming: continuousSetting }, () => {
        console.log("Settings saved.");
        showNotification("Settings saved!");
        updateDarkMode();
      });
    });
  
    backBtn.addEventListener("click", () => {
      showTimerView();
    });
  }
  
  // Utility: Format milliseconds as HH:MM:SS.
  function formatTime(ms) {
    let totalSeconds = Math.floor(ms / 1000);
    let hours = Math.floor(totalSeconds / 3600);
    let minutes = Math.floor((totalSeconds % 3600) / 60);
    let seconds = totalSeconds % 60;
    return (
      (hours < 10 ? "0" + hours : hours) + ":" +
      (minutes < 10 ? "0" + minutes : minutes) + ":" +
      (seconds < 10 ? "0" + seconds : seconds)
    );
  }
  
  // On initial load, show the timer view and hide sessions and settings views.
  if (timerContainer) timerContainer.style.display = "block";
  sessionsDiv.style.display = "none";
  settingsDiv.style.display = "none";
});
