import { createSignal, onMount, onCleanup } from "solid-js";

export default ({ initial = 0 }: { initial?: number }) => {
  const [count, setCount] = createSignal(initial);

  onMount(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "+") setCount((c) => c + 1);
      if (e.key === "-") setCount((c) => c - 1);
      if (e.key === "0") setCount(0);
    };
    window.addEventListener("keydown", handler);
    onCleanup(() => window.removeEventListener("keydown", handler));
  });

  return (
    <div class="flex items-center gap-1">
      <button
        onClick={() => setCount((c) => c - 1)}
        class="border border-neutral-700 w-10 h-10 text-neutral-300 hover:bg-neutral-800 hover:text-white cursor-pointer text-lg"
      >
        -
      </button>
      <span class="text-white w-12 text-center text-lg font-bold">
        {count()}
      </span>
      <button
        onClick={() => setCount((c) => c + 1)}
        class="border border-neutral-700 w-10 h-10 text-neutral-300 hover:bg-neutral-800 hover:text-white cursor-pointer text-lg"
      >
        +
      </button>
    </div>
  );
};
