import EntryForm from "@/components/EntryForm";

export default function NewEntryPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">New entry</h1>
      <EntryForm mode="create" />
    </main>
  );
}
