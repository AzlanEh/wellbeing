import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { LimitReached } from "./components/LimitReached";

// Check if this is the limit popup window
const isLimitPopup = window.location.pathname === "/limit-popup";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {isLimitPopup ? <LimitReached /> : <App />}
  </React.StrictMode>,
);
