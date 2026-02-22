export async function rootHandler({
  request,
  set,
}: {
  request: Request;
  set: { status?: number | string };
}) {
  if (request.method !== "GET") {
    set.status = 405;
    return { error: "Method not allowed" };
  }

  return {
    status: "ok",
    version: "v1",
    message: "Bom dia mozão, tudo bem com você?",
  };
}
