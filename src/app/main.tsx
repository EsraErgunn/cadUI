import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import { shouldRetryQuery } from "./queryRetry";
import { initTheme } from "../ui/admin/useTheme";
import "../styles/index.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: shouldRetryQuery } },
});

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
