import { afterEach, describe, expect, test } from "bun:test";
import { renderToString } from "solid-js/web";
import {
  captureScroll,
  currentPathWithQuery,
  Link,
  listenPopState,
  navigate,
  restoreScroll,
  startViewTransition,
} from "../../src/nav";

const originalWindow = globalThis.window;
const originalDocument = globalThis.document;
const originalCss = globalThis.CSS;

type ScrollRegion = {
  dataset: { scrollPreserve?: string };
  scrollLeft: number;
  scrollTop: number;
};

const setupBrowserMocks = (
  options: {
    baseURI?: string;
    href?: string;
    historyState?: unknown;
    regions?: ScrollRegion[];
    startViewTransition?: boolean;
  } = {},
) => {
  const regions = options.regions ?? [];
  const scrollCalls: Array<[number, number]> = [];
  const historyCalls: Array<{ kind: "push" | "replace"; state: unknown; url: string }> = [];
  const assigned: string[] = [];
  const replaced: string[] = [];
  const popStateListeners = new Set<(event: PopStateEvent) => void>();
  let currentHref = options.href ?? "https://example.test/app?page=1#hash";
  let currentState = options.historyState ?? null;

  const windowMock = {
    get location() {
      const url = new URL(currentHref);
      return {
        href: currentHref,
        origin: url.origin,
        assign: (href: string) => assigned.push(href),
        replace: (href: string) => replaced.push(href),
      };
    },
    scrollX: 12,
    scrollY: 34,
    scrollTo: (x: number, y: number) => scrollCalls.push([x, y]),
    history: {
      get state() {
        return currentState;
      },
      pushState: (state: unknown, _title: string, url: string) => {
        historyCalls.push({ kind: "push", state, url });
        currentState = state;
        currentHref = `https://example.test${url}`;
      },
      replaceState: (state: unknown, _title: string, url: string) => {
        historyCalls.push({ kind: "replace", state, url });
        currentState = state;
        currentHref = `https://example.test${url}`;
      },
    },
    addEventListener: (type: string, listener: (event: PopStateEvent) => void) => {
      if (type === "popstate") popStateListeners.add(listener);
    },
    removeEventListener: (type: string, listener: (event: PopStateEvent) => void) => {
      if (type === "popstate") popStateListeners.delete(listener);
    },
  };

  const documentMock = {
    get baseURI() {
      return options.baseURI ?? currentHref;
    },
    querySelectorAll: () => regions,
    querySelector: (selector: string) =>
      regions.find((region) => selector === `[data-scroll-preserve="${region.dataset.scrollPreserve}"]`) ?? null,
    startViewTransition: options.startViewTransition ? (callback: () => void) => callback() : undefined,
  };

  globalThis.window = windowMock as unknown as Window & typeof globalThis;
  globalThis.document = documentMock as unknown as Document;
  globalThis.CSS = { escape: (value: string) => value } as unknown as typeof CSS;

  const emitPopState = (href: string, state: unknown) => {
    currentHref = new URL(href, currentHref).href;
    currentState = state;
    const event = { state } as PopStateEvent;
    for (const listener of popStateListeners) listener(event);
  };

  return { assigned, emitPopState, replaced, historyCalls, regions, scrollCalls };
};

afterEach(() => {
  globalThis.window = originalWindow;
  globalThis.document = originalDocument;
  globalThis.CSS = originalCss;
});

describe("@k2b/ssr/nav", () => {
  test("renders Link as a real anchor during SSR", () => {
    const html = renderToString(() =>
      Link({
        href: "/target",
        replace: true,
        scroll: "preserve",
        onNavigate: () => undefined,
        class: "link",
        children: "Open",
      }),
    );

    expect(html).toContain("<a ");
    expect(html).toContain('href="/target"');
    expect(html).toContain('class="link');
    expect(html).toContain(">Open</a>");
    expect(html).not.toContain("replace=");
    expect(html).not.toContain("scroll=");
    expect(html).not.toContain("onNavigate=");
  });

  test("currentPathWithQuery excludes the URL hash", () => {
    setupBrowserMocks({ href: "https://example.test/docs?page=2#section" });

    expect(currentPathWithQuery()).toBe("/docs?page=2");
  });

  test("captureScroll and restoreScroll preserve keyed scroll regions", () => {
    const region = { dataset: { scrollPreserve: "list" }, scrollLeft: 4, scrollTop: 90 };
    const { scrollCalls } = setupBrowserMocks({ regions: [region] });

    const snapshot = captureScroll();
    region.scrollLeft = 0;
    region.scrollTop = 0;
    restoreScroll(snapshot);

    expect(region.scrollLeft).toBe(4);
    expect(region.scrollTop).toBe(90);
    expect(scrollCalls).toEqual([[12, 34]]);
  });

  test("navigate pushes history and restores keyed regions while scrolling window to top", () => {
    const region = { dataset: { scrollPreserve: "pane" }, scrollLeft: 7, scrollTop: 120 };
    const { historyCalls, scrollCalls } = setupBrowserMocks({ regions: [region] });
    const snapshot = captureScroll();
    region.scrollTop = 0;

    navigate("/app?tab=two", { scroll: "top", scrollSnapshot: snapshot, viewTransition: false });

    expect(historyCalls).toEqual([{ kind: "push", state: null, url: "/app?tab=two" }]);
    expect(region.scrollTop).toBe(120);
    expect(scrollCalls).toEqual([[0, 0]]);
  });

  test("navigate can replace history without discarding existing state", () => {
    const existingState = { owner: "host-app" };
    const { historyCalls, scrollCalls } = setupBrowserMocks({ historyState: existingState });

    navigate("/app?tab=two#details", { replace: true, scroll: "preserve", viewTransition: false });

    expect(historyCalls).toEqual([{ kind: "replace", state: existingState, url: "/app?tab=two#details" }]);
    expect(scrollCalls).toEqual([[12, 34]]);
  });

  test("navigate supports explicit history state", () => {
    const { historyCalls } = setupBrowserMocks();
    const state = { tab: "two" };

    navigate("/app?tab=two", { state, viewTransition: false });

    expect(historyCalls).toEqual([{ kind: "push", state, url: "/app?tab=two" }]);
  });

  test("navigate resolves relative URLs against document.baseURI", () => {
    const { historyCalls } = setupBrowserMocks({
      baseURI: "https://example.test/base/",
      href: "https://example.test/current/page",
    });

    navigate("child?tab=two", { viewTransition: false });

    expect(historyCalls).toEqual([{ kind: "push", state: null, url: "/base/child?tab=two" }]);
  });

  test("navigate falls back to document navigation for cross-origin URLs", () => {
    const { assigned, historyCalls } = setupBrowserMocks();

    navigate("https://other.test/path", { viewTransition: false });

    expect(assigned).toEqual(["https://other.test/path"]);
    expect(historyCalls).toEqual([]);
  });

  test("listenPopState reports Back/Forward URLs and can unsubscribe", () => {
    const { emitPopState } = setupBrowserMocks();
    const navigations: Array<{ state: unknown; url: string }> = [];
    const unsubscribe = listenPopState(({ state, url }) => navigations.push({ state, url: url.href }));

    emitPopState("/app?tab=two", { tab: "two" });
    unsubscribe();
    emitPopState("/app?tab=three", { tab: "three" });

    expect(navigations).toEqual([{ state: { tab: "two" }, url: "https://example.test/app?tab=two" }]);
  });

  test("startViewTransition uses the browser API when available", () => {
    setupBrowserMocks({ startViewTransition: true });
    let called = false;

    startViewTransition(() => {
      called = true;
    });

    expect(called).toBe(true);
  });
});
