import "./style.css";
import { Store } from "./storage.js";
import { renderApp } from "./ui.js";

const store = new Store();
renderApp(store);
