import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import { initTheme } from "../ui/admin/useTheme";
import "../styles/index.css";

const queryClient = new QueryClient();

// Kayıtlı tema React ağacı kurulmadan uygulanır: ilk boyamada açık tema görünüp
// hemen koyuya atlaması engellenir.
initTheme();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
