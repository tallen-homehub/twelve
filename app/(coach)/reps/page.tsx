import { redirect } from "next/navigation";

// The rep list now lives on the dashboard.
export default function RepsPage() {
  redirect("/dashboard");
}
