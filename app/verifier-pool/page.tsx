// The VerifierPoolRedirectPage component is a simple page that automatically redirects users to the main verifier page when they navigate to the /verifier-pool route. This is useful for maintaining a clean URL structure and ensuring that users are directed to the correct page for interacting with the verifier system.
import { redirect } from "next/navigation";

export default function VerifierPoolRedirectPage() {
  redirect("/verifier");
}
