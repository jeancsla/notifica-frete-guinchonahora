import { getSession } from "lib/session";

export default async function logoutHandler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const session = await getSession(req, res);
  session.destroy();
  return res.status(200).json({ ok: true });
}
