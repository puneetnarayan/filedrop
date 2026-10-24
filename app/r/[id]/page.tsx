import { notFound } from "next/navigation";
import Room from "@/components/Room";
import { validRoom } from "@/lib/keys";

export default async function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!validRoom(id)) notFound();
  return <Room room={id} />;
}
