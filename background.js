/* background.js */

// A simple sessions store that persists in chrome.storage
let sessions = [];

// Load sessions from storage when extension starts
chrome.storage.sync.get(['sessions'], (result) => {
  if (result.sessions) {
    sessions = result.sessions;
    console.log('Loaded sessions from storage:', sessions);
  }
});

// Helper function to save sessions to storage
function saveSessions() {
  chrome.storage.sync.set({ sessions }, () => {
    console.log('Sessions saved to storage:', sessions);
  });
}

// Listener for messages from popup.js (and other parts of the extension)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case "startTimer":
      // (Timer logic would go here)
      console.log("Background: startTimer called with session name:", request.sessionName);
      sendResponse({ status: "started" });
      break;

    case "stopTimer":
      // (Timer stop logic would go here)
      console.log("Background: stopTimer called");
      sendResponse({ status: "stopped", session: { name: request.sessionName || "N/A", elapsed: 1000 } });
      break;

    case "resetTimer":
      console.log("Background: resetTimer called");
      sendResponse({ status: "reset" });
      break;

    case "exportMarkdown":
      console.log("Background: exportMarkdown called");
      // Create markdown with actual session data
      const markdown = `# Session Records\n\n${sessions.map((s, i) => 
        `${i + 1}. ${s.name} — ${formatTime(s.elapsed)}`
      ).join('\n')}`;
      sendResponse({ markdown });
      break;

    case "getElapsedTime":
      // Return a dummy elapsed time (in ms)
      sendResponse({ elapsed: Date.now() % 3600000 });
      break;

    case "getSessions":
      // Return the current sessions list
      console.log("Background: getSessions called");
      sendResponse({ sessions });
      break;

    case "addSession":
      console.log("Background: addSession called with:", request.sessionName);
      sessions.push({ name: request.sessionName, elapsed: request.elapsed });
      saveSessions(); // Persist to storage
      sendResponse({ status: "added", session: { name: request.sessionName, elapsed: request.elapsed } });
      break;

    case "editSession":
      console.log("Background: editSession called at index", request.index, "with new name:", request.newName, "and newElapsed:", request.newElapsed);
      if (sessions[request.index]) {
        sessions[request.index].name = request.newName;
        // Update elapsed time if provided (even if zero)
        if (typeof request.newElapsed !== "undefined") {
          sessions[request.index].elapsed = request.newElapsed;
        }
        saveSessions(); // Persist to storage
        sendResponse({ status: "edited", session: sessions[request.index] });
      } else {
        sendResponse({ status: "error", message: "Invalid session index" });
      }
      break;

    case "deleteSession":
      console.log("Background: deleteSession called at index", request.index);
      if (sessions[request.index]) {
        sessions.splice(request.index, 1);
        saveSessions(); // Persist to storage
        sendResponse({ status: "deleted" });
      } else {
        sendResponse({ status: "error", message: "Invalid session index" });
      }
      break;

    case "moveSession":
      console.log("Background: moveSession called at index", request.index, "direction:", request.direction);
      if (typeof sessions[request.index] === "undefined") {
        sendResponse({ status: "error", message: "Invalid session index" });
      } else {
        if (request.direction === "up" && request.index > 0) {
          [sessions[request.index - 1], sessions[request.index]] = [sessions[request.index], sessions[request.index - 1]];
          saveSessions(); // Persist to storage
          sendResponse({ status: "moved", direction: "up" });
        } else if (request.direction === "down" && request.index < sessions.length - 1) {
          [sessions[request.index], sessions[request.index + 1]] = [sessions[request.index + 1], sessions[request.index]];
          saveSessions(); // Persist to storage
          sendResponse({ status: "moved", direction: "down" });
        } else {
          sendResponse({ status: "error", message: "Cannot move session" });
        }
      }
      break;

    default:
      console.warn("Background: Unknown action", request.action);
      sendResponse({ status: "error", message: "Unknown action" });
  }
  return true;
});

// Utility: Format milliseconds as HH:MM:SS for markdown export
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
