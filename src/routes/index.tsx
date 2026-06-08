import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { Toaster } from "sonner";
import { Navbar } from "@/components/bni/Navbar";
import { Hero } from "@/components/bni/Hero";
import { Footer } from "@/components/bni/Footer";
import { MemberForm } from "@/components/bni/MemberForm";
import { RosterPanel, membersQueryOptions } from "@/components/bni/RosterPanel";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BNI Ethan — 2026 Member Profile Submission" },
      {
        name: "description",
        content:
          "Submit your BNI Ethan 2026 member profile — contact details, services, and headshot for the Navi Mumbai chapter roster.",
      },
      { property: "og:title", content: "BNI Ethan — 2026 Member Profile Submission" },
      {
        property: "og:description",
        content: "Member profile submission for the BNI Ethan 2026 roster, Navi Mumbai chapter.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(membersQueryOptions),
  component: HomePage,
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <div>
        <h1 className="font-display font-bold text-2xl">Could not load roster</h1>
        <p className="text-sm text-gray-600 mt-2">{error.message}</p>
      </div>
    </div>
  ),
});

function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Toaster richColors position="top-center" />
      <NavWithCount />
      <Hero />
      <main className="flex-1 grid md:grid-cols-[1.4fr_1fr] max-w-7xl w-full mx-auto gap-0">
        <div className="p-6 md:p-8 md:pr-6">
          <MemberFormWithRefresh />
        </div>
        <Suspense
          fallback={
            <div className="bni-roster-panel p-7 text-sm text-gray-500 animate-pulse">
              Loading roster…
            </div>
          }
        >
          <RosterPanel />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

function MemberFormWithRefresh() {
  const queryClient = useQueryClient();
  return (
    <MemberForm
      onSuccess={() => {
        queryClient.invalidateQueries({ queryKey: ["members"] });
      }}
    />
  );
}

function NavWithCount() {
  const { data } = useSuspenseQuery(membersQueryOptions);
  return <Navbar count={data.members.length} />;
}
