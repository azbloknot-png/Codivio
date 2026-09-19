import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { LanguageProvider } from "./i18n/LanguageContext";
import { ConsentProvider } from "./consent/ConsentContext";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <LanguageProvider>
      <ConsentProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ConsentProvider>
    </LanguageProvider>
  </React.StrictMode>
);