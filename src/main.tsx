import { render } from "preact";
import { App } from "./app/App";
import "./styles/index.css";

const appRoot = document.getElementById("app");

if (!appRoot) {
  throw new Error("Application root element #app was not found.");
}

render(<App />, appRoot);
