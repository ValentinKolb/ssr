import { ssr } from "../../config";

export default ssr(async (c) => {
  c.get("page").title = "About";

  return (
    <main class="min-h-screen bg-neutral-950 text-neutral-300 font-mono p-6 text-sm">
      <div class="max-w-2xl mx-auto">
        <div class="border border-neutral-600 p-4 mb-6">
          <h1 class="text-lg text-white font-bold">About</h1>
        </div>

        <div class="border border-neutral-800 mb-4">
          <div class="border-b border-neutral-800 px-4 py-2 bg-neutral-900">
            <span class="text-neutral-400">overview</span>
          </div>
          <div class="p-4">
            <p class="text-neutral-400">
              SSR with islands architecture using @valentinkolb/ssr. Pages are
              server-rendered as static HTML, interactive components are
              hydrated on the client.
            </p>
          </div>
        </div>

        <div class="border border-neutral-800 mb-6">
          <div class="border-b border-neutral-800 px-4 py-2 bg-neutral-900">
            <span class="text-neutral-400">component types</span>
          </div>
          <div class="p-4 space-y-2">
            <div>
              <span class="text-white">*.island.tsx</span>
              <span class="text-neutral-600 mx-2">-</span>
              <span class="text-neutral-400">hydrated, SSR preserved</span>
            </div>
            <div>
              <span class="text-white">*.client.tsx</span>
              <span class="text-neutral-600 mx-2">-</span>
              <span class="text-neutral-400">client-only, no SSR</span>
            </div>
            <div>
              <span class="text-white">*.tsx</span>
              <span class="text-neutral-600 mx-2">-</span>
              <span class="text-neutral-400">static, server-only</span>
            </div>
          </div>
        </div>

        <div class="flex gap-4">
          <a
            href="/"
            class="border border-neutral-700 px-4 py-2 text-neutral-400 hover:bg-neutral-900 hover:text-white"
          >
            [home]
          </a>
          <a
            href="/api-test"
            class="border border-neutral-700 px-4 py-2 text-neutral-400 hover:bg-neutral-900 hover:text-white"
          >
            [api-test]
          </a>
        </div>
      </div>
    </main>
  );
});
