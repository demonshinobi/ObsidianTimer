/* background.js */

// A simple in-memory sessions store. 
// (In a production extension you might want to persist these in chrome.storage.)
let sessions = [];

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
      // Dummy markdown output
      sendResponse({ markdown: "# Exported Markdown\n\nSession Data Here" });
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
        sendResponse({ status: "edited", session: sessions[request.index] });
      } else {
        sendResponse({ status: "error", message: "Invalid session index" });
      }
      break;

    case "deleteSession":
      console.log("Background: deleteSession called at index", request.index);
      if (sessions[request.index]) {
        sessions.splice(request.index, 1);
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
          sendResponse({ status: "moved", direction: "up" });
        } else if (request.direction === "down" && request.index < sessions.length - 1) {
          [sessions[request.index], sessions[request.index + 1]] = [sessions[request.index + 1], sessions[request.index]];
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
