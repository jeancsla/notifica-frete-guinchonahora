import { createApp } from "../../../../apps/api/src/app";

const app = createApp();

async function handle(request) {
  return app.handle(request);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const OPTIONS = handle;
export const HEAD = handle;
