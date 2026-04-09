import { createSignal } from "solid-js";
import { hc } from "hono/client";
import type { ApiType } from "../api";

const client = hc<ApiType>("/api");

export default () => {
  const [data, setData] = createSignal<string | null>(null);
  const [loading, setLoading] = createSignal(false);

  const fetchData = async () => {
    setLoading(true);
    const res = await client.msg.$get();
    setData(JSON.stringify(await res.json(), null, 2));
    setLoading(false);
  };

  return (
    <main class="min-h-screen bg-neutral-950 text-neutral-300 font-mono p-6 text-sm">
      <div class="max-w-2xl mx-auto">
        <div class="border border-neutral-600 p-4 mb-6">
          <h1 class="text-lg text-white font-bold">Hono API Test</h1>
          <p class="text-neutral-500 mt-1">using hc() type-safe client</p>
        </div>

        <div class="border border-neutral-800 mb-4">
          <div class="border-b border-neutral-800 px-4 py-2 bg-neutral-900">
            <span class="text-neutral-400">request</span>
          </div>
          <div class="p-4">
            <button
              onClick={fetchData}
              disabled={loading()}
              class="border border-neutral-700 px-4 py-2 text-neutral-300 hover:bg-neutral-800 hover:text-white cursor-pointer disabled:opacity-50"
            >
              {loading() ? "loading..." : "GET /api/data"}
            </button>
          </div>
        </div>

        {data() && (
          <div class="border border-neutral-800 mb-6">
            <div class="border-b border-neutral-800 px-4 py-2 bg-neutral-900">
              <span class="text-neutral-400">response</span>
            </div>
            <div class="p-4">
              <pre class="text-neutral-400 overflow-x-auto">{data()}</pre>
            </div>
          </div>
        )}

        <div class="flex gap-4">
          <a
            href="/"
            class="border border-neutral-700 px-4 py-2 text-neutral-400 hover:bg-neutral-900 hover:text-white"
          >
            [home]
          </a>
        </div>
      </div>
    </main>
  );
};
