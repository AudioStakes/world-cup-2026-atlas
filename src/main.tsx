import { render } from "preact";
import { App } from "./app/App";
import "./styles.css";
import "./map-label-polish.css";
import "./map-route-polish.css";

const appRoot = document.getElementById("app");

if (!appRoot) {
  throw new Error("Application root element #app was not found.");
}

render(<App />, appRoot);
