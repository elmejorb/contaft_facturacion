import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installFetchInterceptor } from "./config/api";

// Instalar el interceptor ANTES de montar React. Reescribe URLs hardcodeadas
// `http://localhost:80/conta-app-backend/api/...` al apiUrl del config.json.
// Esto cubre los ~90 componentes legacy que aún tienen el URL fijo.
installFetchInterceptor();

createRoot(document.getElementById("root")!).render(<App />);
