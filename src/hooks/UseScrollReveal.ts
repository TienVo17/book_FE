import { useEffect, useRef } from "react";

/**
 * Custom hook that adds scroll-reveal animation to elements.
 * Uses IntersectionObserver to trigger CSS class when element enters viewport.
 * Respects prefers-reduced-motion accessibility setting.
 */
export function useScrollReveal<T extends HTMLElement>(threshold = 0.1) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Respect reduced motion preference
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      element.classList.add("revealed");
      return;
    }

    element.classList.add("scroll-reveal");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold]);

  return ref;
}
