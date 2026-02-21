import { createApp } from "./app";

const port = Number(process.env.API_PORT || process.env.PORT || 4000);

createApp().listen(port);

console.log(`[Bun API] Listening on port ${port}`);
