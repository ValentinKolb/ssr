import { createSignal, onMount } from "solid-js";

export default () => {
  const [size, setSize] = createSignal("...");

  onMount(() => {
    const update = () => setSize(`${window.innerWidth}x${window.innerHeight}`);
    update();
    window.addEventListener("resize", update);
  });

  return <span class="text-white text-lg font-bold">{size()}</span>;
};
