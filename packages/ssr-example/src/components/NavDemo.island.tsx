import { Link, listenPopState, type LinkNavigateEvent } from "@valentinkolb/ssr/nav";
import { createMemo, createSignal, For, onCleanup, onMount } from "solid-js";

type View = "alpha" | "beta";

type Props = {
  initialView: View;
};

const isView = (value: string | null): value is View =>
  value === "alpha" || value === "beta";

export default function NavDemo(props: Props) {
  const [view, setView] = createSignal<View>(props.initialView);
  const [count, setCount] = createSignal(0);
  const [scrollTop, setScrollTop] = createSignal(0);

  const items = createMemo(() =>
    Array.from({ length: 36 }, (_, index) => ({
      id: `${view()}-${index + 1}`,
      label: `${view() === "alpha" ? "Alpha" : "Beta"} row ${index + 1}`,
    })),
  );

  onMount(() => {
    onCleanup(
      listenPopState(({ url }) => {
        const nextView = url.searchParams.get("view");
        if (isView(nextView)) setView(nextView);
      }),
    );
  });

  const openView = (nav: LinkNavigateEvent) => {
    const nextView = nav.url.searchParams.get("view");
    if (!isView(nextView)) {
      nav.fallback();
      return;
    }
    const changed = nextView !== view();
    setView(nextView);
    if (!changed) {
      nav.replaceWith(`/nav-demo?view=${nextView}`, { scroll: "preserve" });
      return;
    }
    nav.push(`/nav-demo?view=${nextView}`, { scroll: "preserve" });
  };

  return (
    <main class="min-h-screen bg-neutral-950 text-neutral-300 font-mono p-6 text-sm">
      <div class="max-w-2xl mx-auto">
        <div class="border border-neutral-600 p-4 mb-6">
          <h1 class="text-lg text-white font-bold">SSR nav demo</h1>
          <p class="text-neutral-500 mt-1">
            URL changes without a document reload
          </p>
        </div>

        <div class="border border-neutral-800 mb-4">
          <div class="border-b border-neutral-800 px-4 py-2 bg-neutral-900">
            <span class="text-neutral-500">subpackage</span>
            <span class="text-neutral-600 mx-2">-</span>
            <span class="text-neutral-400">@valentinkolb/ssr/nav</span>
          </div>
          <div class="p-4">
            <div class="flex gap-4 mb-4">
              <Link
                href="/nav-demo?view=alpha"
                scroll="preserve"
                onNavigate={openView}
                class={`border border-neutral-700 px-4 py-2 hover:bg-neutral-900 hover:text-white ${view() === "alpha" ? "text-white bg-neutral-900" : "text-neutral-400"}`}
              >
                [alpha]
              </Link>
              <Link
                href="/nav-demo?view=beta"
                scroll="preserve"
                onNavigate={openView}
                class={`border border-neutral-700 px-4 py-2 hover:bg-neutral-900 hover:text-white ${view() === "beta" ? "text-white bg-neutral-900" : "text-neutral-400"}`}
              >
                [beta]
              </Link>
            </div>

            <div class="flex items-center gap-4 mb-4">
              <button
                type="button"
                onClick={() => setCount((value) => value + 1)}
                class="border border-neutral-700 px-4 py-2 text-neutral-300 hover:bg-neutral-800 hover:text-white cursor-pointer"
              >
                count {count()}
              </button>
              <span class="text-neutral-500 text-xs">
                current view: {view()} / scroll: {scrollTop()}px
              </span>
            </div>

            <div
              data-scroll-preserve="nav-demo-list"
              onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
              class="nav-demo-scroll border border-neutral-800 bg-neutral-950"
              style="height: 16rem; overflow: auto; scrollbar-color: #525252 #0a0a0a; scrollbar-width: thin;"
            >
              <For each={items()}>
                {(item) => (
                  <div class="border-b border-neutral-800 px-4 py-3">
                    <p class="text-white">{item.label}</p>
                    <p class="text-neutral-500 text-xs">
                      scroll this panel, increment the counter, then switch tabs
                    </p>
                  </div>
                )}
              </For>
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
            href="/about"
            class="border border-neutral-700 px-4 py-2 text-neutral-400 hover:bg-neutral-900 hover:text-white"
          >
            [about]
          </a>
        </div>
      </div>
    </main>
  );
}
