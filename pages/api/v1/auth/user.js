import { getSession } from "lib/session";

export default async function userHandler(req, res) {
  const session = await getSession(req, res);

  if (session.user) {
    return res.json({
      isLoggedIn: true,
      ...session.user,
    });
  } else {
    return res.json({
      isLoggedIn: false,
    });
  }
}
