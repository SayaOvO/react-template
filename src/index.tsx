import { createRoot } from "react-dom/client";
import App from "./App";
const rootEl = document.getElementById("app");

if (rootEl) {
  const root = createRoot(rootEl);
  root.render(<App />);
}
