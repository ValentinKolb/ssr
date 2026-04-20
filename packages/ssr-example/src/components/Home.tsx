import { ssr } from "../../config";
import Counter from "./Counter.island";
import Viewport from "./Viewport.client";

export default ssr(async (c) => {
  c.get("page").title = "Home";

  return () => (
    <main class="min-h-screen bg-neutral-950 text-neutral-300 font-mono p-6 text-sm">
      <div class="max-w-2xl mx-auto">
        <div class="border border-neutral-600 p-4 mb-6">
          <h1 class="text-lg text-white font-bold">SSR Example</h1>
          <p class="text-neutral-500 mt-1">
            server-rendered at {new Date().toLocaleTimeString()}
          </p>
        </div>

        <div class="border border-neutral-800 mb-4">
          <div class="border-b border-neutral-800 px-4 py-2 bg-neutral-900">
            <span class="text-neutral-500">island</span>
            <span class="text-neutral-600 mx-2">-</span>
            <span class="text-neutral-400">Counter.island.tsx</span>
          </div>
          <div class="p-4">
            <p class="text-neutral-400 mb-4">
              Hydrated on client, preserves server-rendered HTML
            </p>
            <div class="flex items-center gap-4">
              <Counter initial={0} />
              <span class="text-neutral-600 text-xs">+, -, 0 keys</span>
            </div>
          </div>
        </div>

        <div class="border border-neutral-800 mb-6">
          <div class="border-b border-neutral-800 px-4 py-2 bg-neutral-900">
            <span class="text-neutral-500">client</span>
            <span class="text-neutral-600 mx-2">-</span>
            <span class="text-neutral-400">Viewport.client.tsx</span>
          </div>
          <div class="p-4">
            <p class="text-neutral-400 mb-4">
              Rendered only on client, uses browser APIs
            </p>
            <div class="flex items-center gap-4">
              <Viewport />
              <span class="text-neutral-600 text-xs">resize to see updates</span>
            </div>
          </div>
        </div>

        <div class="flex gap-4">
          <a
            href="/about"
            class="border border-neutral-700 px-4 py-2 text-neutral-400 hover:bg-neutral-900 hover:text-white"
          >
            [about]
          </a>
          <a
            href="/api-test"
            class="border border-neutral-700 px-4 py-2 text-neutral-400 hover:bg-neutral-900 hover:text-white"
          >
            [api-test]
          </a>
        </div>

        <p class="text-neutral-600 mt-8 text-xs">
          tip: click [ssr] in the corner to highlight islands and client
          components
        </p>
      </div>
    </main>
  );
});
