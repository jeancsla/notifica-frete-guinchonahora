export default function handler(request, response) {
  return response.status(200).json({
    status: "ok",
    version: "v1",
    message: "Bom dia mozão, tudo bem com você?"
  });
}
