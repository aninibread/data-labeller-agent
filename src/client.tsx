import "./styles.css";
import { createRoot } from "react-dom/client";
import { AppRouter } from "./AppRouter";
import { Providers } from "@/providers";

const root = createRoot(document.getElementById("app")!);

root.render(
  <Providers>
    <AppRouter />
  </Providers>
);
