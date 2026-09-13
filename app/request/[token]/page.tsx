import { notFound } from "next/navigation";
import { z } from "zod";
import { PublicTreeServiceRequestForm } from "@/components/public-tree-service-request-form";

type Props = { params: Promise<{ token: string }> };

export default async function PublicTreeServiceRequestPage({ params }: Props) {
  const token = z.string().uuid().safeParse((await params).token);
  if (!token.success) notFound();

  return (
    <main className="projects-page" style={{ maxWidth: 860, margin: "0 auto" }}>
      <header className="projects-header">
        <div className="brand"><div className="brand-mark">Z</div><div><div className="brand-title">ZIEPHER</div><div className="brand-subtitle">TREE SERVICE REQUEST</div></div></div>
      </header>
      <PublicTreeServiceRequestForm token={token.data} />
    </main>
  );
}
