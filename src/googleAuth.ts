import { OAuth2Client } from "google-auth-library";
import config from "./config";

const oauth2Client = typeof config.clientId === "string" ? new OAuth2Client(config.clientId) : null;

const googleAuthAvailable = oauth2Client !== null;
export { googleAuthAvailable };

export async function getAuthPayload(idToken: string) {
  if (oauth2Client === null)
    throw new Error("Need to check googleAuthAvailable before trying to get payload.");
  
  // https://developers.google.com/identity/sign-in/web/backend-auth#using-a-google-api-client-library
  const ticket = await oauth2Client.verifyIdToken({
    idToken,
    audience: config.clientId as string
  });
  return ticket.getPayload();
}
