import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function ImportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const pathname = (await headers()).get("x-pathname") ?? "/import/youtube";

  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
  }

  if (session.user.role !== "admin") {
    return (
      <div className="container">
        <h1>Admin access required</h1>
        <p className="muted">
          Only administrators can import and transcribe videos.
        </p>
      </div>
    );
  }

  return children;
}
