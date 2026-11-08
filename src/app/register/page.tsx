import { redirect } from "next/navigation";

export default function RegisterPage() {
  // Administrative registration is strictly disabled
  redirect("/login");
}

