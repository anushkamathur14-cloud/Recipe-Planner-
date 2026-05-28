import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/settings");
  }

  if (session.user.role !== "admin") {
    return (
      <div className="container">
        <h1>Admin access required</h1>
        <p className="muted">Settings are only available to administrators.</p>
      </div>
    );
  }

  return children;
}
