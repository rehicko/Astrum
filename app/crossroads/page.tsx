// app/crossroads/page.tsx
import { redirect } from "next/navigation";

export default function CrossroadsIndex() {
  redirect("/crossroads/global");
}
