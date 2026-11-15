import { redirect } from "next/navigation";

/** Dashboard-first: the app opens straight into the command center. No landing page. */
export default function Home() {
  redirect("/dashboard");
}
