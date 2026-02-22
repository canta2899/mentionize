import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DemoApp } from "./ExampleApp.tsx";
import "./examples.css";

const elem = document.getElementById("root")!;
const app = (
  <StrictMode>
    <DemoApp />
  </StrictMode>
);

if (import.meta.hot) {
  const root = (import.meta.hot.data.root ??= createRoot(elem));
  root.render(app);
} else {
  createRoot(elem).render(app);
}
