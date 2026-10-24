import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function Home() {
  // 16 random bytes -> 26 base32-ish chars; unguessable room id.
  const id = BigInt("0x" + randomBytes(12).toString("hex")).toString(36).padStart(16, "0");
  redirect(`/r/${id}`);
}
