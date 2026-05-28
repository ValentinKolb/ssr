/**
 * Opt-in browser navigation helpers for SSR islands.
 *
 * This is not a router. Links remain real anchors and apps decide whether an
 * enhanced click can update client state before committing browser history.
 */
import type { JSX } from "solid-js";
import { createDynamic } from "solid-js/web";

type AnchorProps = JSX.AnchorHTMLAttributes<HTMLAnchorElement>;

export type NavigationScrollMode = "top" | "preserve" | "manual";

export type ScrollSnapshot = {
  window: { x: number; y: number };
  regions: Array<{
    key: string;
    x: number;
    y: number;
  }>;
};

export type EnhancedNavigateOptions = {
  replace?: boolean;
  scroll?: NavigationScrollMode;
  scrollSnapshot?: ScrollSnapshot;
  viewTransition?: boolean;
};

export type LinkNavigateEvent = {
  event: MouseEvent;
  href: string;
  url: URL;
  replace: boolean;
  scroll: NavigationScrollMode;
  push: (href?: string, options?: EnhancedNavigateOptions) => void;
  replaceWith: (href?: string, options?: Omit<EnhancedNavigateOptions, "replace">) => void;
  fallback: (href?: string) => void;
  scrollSnapshot: ScrollSnapshot;
  captureScroll: (selector?: string) => ScrollSnapshot;
  restoreScroll: typeof restoreScroll;
};

export type LinkProps = Omit<AnchorProps, "href" | "onClick"> & {
  href: string;
  replace?: boolean;
  scroll?: NavigationScrollMode;
  onClick?: JSX.EventHandlerUnion<HTMLAnchorElement, MouseEvent>;
  onNavigate?: (event: LinkNavigateEvent) => void | Promise<void>;
};

const SCROLL_PRESERVE_SELECTOR = "[data-scroll-preserve]";

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void | Promise<void>) => unknown;
};

/**
 * Returns the current URL path + query, without the hash.
 */
export const currentPathWithQuery = (): string => {
  const url = new URL(window.location.href);
  return `${url.pathname}${url.search}`;
};

/**
 * Navigates to the current path + query with a full document navigation.
 */
export const refreshCurrentPath = (): void => {
  window.location.assign(currentPathWithQuery());
};

/**
 * Navigates with a full document navigation.
 */
export const navigateTo = (href: string): void => {
  window.location.assign(href);
};

export const startViewTransition = (callback: () => void | Promise<void>): void => {
  const doc = document as ViewTransitionDocument;
  if (!doc.startViewTransition) {
    void callback();
    return;
  }
  doc.startViewTransition(callback);
};

const restoreRegionScroll = (snapshot: ScrollSnapshot): void => {
  for (const region of snapshot.regions) {
    const selector = `[data-scroll-preserve="${CSS.escape(region.key)}"]`;
    const el = document.querySelector<HTMLElement>(selector);
    if (!el) continue;
    el.scrollLeft = region.x;
    el.scrollTop = region.y;
  }
};

/**
 * Captures window scroll and keyed `[data-scroll-preserve]` regions.
 */
export const captureScroll = (selector = SCROLL_PRESERVE_SELECTOR): ScrollSnapshot => ({
  window: { x: window.scrollX, y: window.scrollY },
  regions: Array.from(document.querySelectorAll<HTMLElement>(selector))
    .map((el) => ({
      key: el.dataset.scrollPreserve ?? "",
      x: el.scrollLeft,
      y: el.scrollTop,
    }))
    .filter((region) => region.key.length > 0),
});

/**
 * Restores a captured scroll snapshot.
 */
export const restoreScroll = (snapshot: ScrollSnapshot, options: { window?: boolean } = {}): void => {
  restoreRegionScroll(snapshot);
  if (options.window === false) return;
  window.scrollTo(snapshot.window.x, snapshot.window.y);
};

/**
 * Updates browser history without a document reload.
 *
 * Use this after the current island has already updated its UI or when it is
 * intentionally preserving the current DOM. It does not match routes, load
 * data, or re-render server pages.
 */
export const navigate = (href: string, options: EnhancedNavigateOptions = {}): void => {
  const scroll = options.scroll ?? "top";
  const snapshot = scroll === "manual" ? null : (options.scrollSnapshot ?? captureScroll());
  const url = new URL(href, window.location.href);
  const target = `${url.pathname}${url.search}${url.hash}`;

  const commit = () => {
    if (options.replace) window.history.replaceState(null, "", target);
    else window.history.pushState(null, "", target);

    if (!snapshot) return;
    restoreRegionScroll(snapshot);
    if (scroll === "preserve") {
      window.scrollTo(snapshot.window.x, snapshot.window.y);
      return;
    }
    window.scrollTo(0, 0);
  };

  if (options.viewTransition === false) {
    commit();
    return;
  }
  startViewTransition(commit);
};

export const documentNavigate = (href: string, options: { replace?: boolean } = {}): void => {
  if (options.replace) window.location.replace(href);
  else window.location.assign(href);
};

const shouldEnhanceClick = (event: MouseEvent, anchor: HTMLAnchorElement): boolean => {
  if (event.defaultPrevented || event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  if (anchor.target && anchor.target !== "_self") return false;
  if (anchor.hasAttribute("download")) return false;

  const url = new URL(anchor.href, window.location.href);
  return url.origin === window.location.origin;
};

const callUserClick = (handler: LinkProps["onClick"], event: MouseEvent, anchor: HTMLAnchorElement): void => {
  if (!handler) return;
  if (typeof handler === "function") {
    handler(event as MouseEvent & { currentTarget: HTMLAnchorElement; target: Element });
    return;
  }
  (handler as unknown as EventListenerObject).handleEvent(event);
};

/**
 * SSR-safe anchor with opt-in progressive navigation.
 */
export function Link(props: LinkProps) {
  const anchorProps = () => {
    const { href: _href, replace: _replace, scroll: _scroll, onNavigate: _onNavigate, onClick: _onClick, ...rest } = props;
    return rest;
  };

  const handleClick: JSX.EventHandler<HTMLAnchorElement, MouseEvent> = (event) => {
    callUserClick(props.onClick, event, event.currentTarget);
    if (!shouldEnhanceClick(event, event.currentTarget)) return;

    const href = props.href;
    const url = new URL(href, window.location.href);
    const scroll = props.scroll ?? "top";
    const replace = Boolean(props.replace);
    const scrollSnapshot = captureScroll();

    event.preventDefault();

    if (!props.onNavigate) {
      navigate(href, { replace, scroll, scrollSnapshot });
      return;
    }

    startViewTransition(() =>
      props.onNavigate!({
        event,
        href,
        url,
        replace,
        scroll,
        push: (nextHref = href, options = {}) =>
          navigate(nextHref, { replace: false, scroll, scrollSnapshot, viewTransition: false, ...options }),
        replaceWith: (nextHref = href, options = {}) =>
          navigate(nextHref, { replace: true, scroll, scrollSnapshot, viewTransition: false, ...options }),
        fallback: (nextHref = href) => documentNavigate(nextHref, { replace }),
        scrollSnapshot,
        captureScroll,
        restoreScroll,
      }),
    );
  };

  return createDynamic(() => "a", {
    ...anchorProps(),
    href: props.href,
    onClick: handleClick,
  });
}
