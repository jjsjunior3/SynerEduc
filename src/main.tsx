import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/globals.css";
import { verificarVersao } from './utils/versaoApp'; // ← adiciona

verificarVersao(); // ← adiciona

createRoot(document.getElementById("root")!).render(<App/>);