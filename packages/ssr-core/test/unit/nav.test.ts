import { afterEach, describe, expect, test } from "bun:test";
import { renderToString } from "solid-js/web";
import { captureScroll, currentPathWithQuery, Link, navigate, restoreScroll, startViewTransition } from "../../src/nav";

const originalWindow = globalThis.window;
const originalDocument = globalThis.document;
const originalCss = globalThis.CSS;

type ScrollRegion = {
  dataset: { scrollPreserve?: string };
  scrollLeft: number;
  scrollTop: number;
};

const setupBrowserMocks = (options: { href?: string; regions?: ScrollRegion[]; startViewTransition?: boolean } = {}) => {
  const regions = options.regions ?? [];
  const scrollCalls: Array<[number, number]> = [];
  const historyCalls: Array<{ kind: "push" | "replace"; url: string }> = [];
  const assigned: string[] = [];
  const replaced: string[] = [];
  let currentHref = options.href ?? "https://example.test/app?page=1#hash";

  const windowMock = {
    get location() {
      return {
        href: currentHref,
        assign: (href: string) => assigned.push(href),
        replace: (href: string) => replaced.push(href),
      };
    },
    scrollX: 12,
    scrollY: 34,
    scrollTo: (x: number, y: number) => scrollCalls.push([x, y]),
    history: {
      pushState: (_state: unknown, _title: string, url: string) => {
        historyCalls.push({ kind: "push", url });
        currentHref = `https://example.test${url}`;
      },
      replaceState: (_state: unknown, _title: string, url: string) => {
        historyCalls.push({ kind: "replace", url });
        currentHref = `https://example.test${url}`;
      },
    },
  };

  const documentMock = {
    querySelectorAll: () => regions,
    querySelector: (selector: string) =>
      regions.find((region) => selector === `[data-scroll-preserve="${region.dataset.scrollPreserve}"]`) ?? null,
    startViewTransition: options.startViewTransition ? (callback: () => void) => callback() : undefined,
  };

  globalThis.window = windowMock as unknown as Window & typeof globalThis;
  globalThis.document = documentMock as unknown as Document;
  globalThis.CSS = { escape: (value: string) => value } as unknown as typeof CSS;

  return { assigned, replaced, historyCalls, regions, scrollCalls };
};

afterEach(() => {
  globalThis.window = originalWindow;
  globalThis.document = originalDocument;
  globalThis.CSS = originalCss;
});

describe("@valentinkolb/ssr/nav", () => {
  test("renders Link as a real anchor during SSR", () => {
    const html = renderToString(() => Link({ href: "/target", class: "link", children: "Open" }));

    expect(html).toContain("<a ");
    expect(html).toContain('href="/target"');
    expect(html).toContain('class="link');
    expect(html).toContain(">Open</a>");
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

    expect(historyCalls).toEqual([{ kind: "push", url: "/app?tab=two" }]);
    expect(region.scrollTop).toBe(120);
    expect(scrollCalls).toEqual([[0, 0]]);
  });

  test("navigate can replace history and preserve window scroll", () => {
    const { historyCalls, scrollCalls } = setupBrowserMocks();

    navigate("/app?tab=two#details", { replace: true, scroll: "preserve", viewTransition: false });

    expect(historyCalls).toEqual([{ kind: "replace", url: "/app?tab=two#details" }]);
    expect(scrollCalls).toEqual([[12, 34]]);
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
