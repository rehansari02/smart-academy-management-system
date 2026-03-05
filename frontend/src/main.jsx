import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "./app/store"; // Import the store we created
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import axios from "axios";
import "./index.css";

// Set global axios defaults
axios.defaults.withCredentials = true;


// Unregister any existing service workers to clean up PWA cache
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (let registration of registrations) {
      registration.unregister();
    }
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <HelmetProvider>
        <App />
      </HelmetProvider>
    </Provider>
  </React.StrictMode>
);