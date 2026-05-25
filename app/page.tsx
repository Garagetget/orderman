import { redirect } from "next/navigation";

// The app has no landing page — send people straight to order-taking.
// Middleware bounces signed-out users to /login.
export default function HomePage() {
  redirect("/order");
}
