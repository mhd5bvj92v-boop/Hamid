import { createRoot } from "react-dom/client";
import "../src/fonts";
import { App } from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(<App />);
