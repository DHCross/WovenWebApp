/**
 * useScrollAnchor - Robust scroll management for chat interfaces
 *
 * Handles the mobile Safari issue where container-based scrolling fails
 * when the container's overflow context changes or on iOS bounce zones.
 *
 * Strategy:
 * 1. Use IntersectionObserver to detect if new messages are visible
 * 2. Respect user scroll position (don't force scroll if user scrolled up)
 * 3. Fallback to window.scrollTo if container scrolling fails
 * 4. Support reduced motion preferences
 */

import { useEffect, useRef, useState, useCallback } from 'react';

interface ScrollAnchorOptions {
  enabled?: boolean;
  offset?: number;                    // Offset from bottom (default: 100px)
  smooth?: boolean;                   // Use smooth scrolling (respects prefers-reduced-motion)
  threshold?: number;                 // Distance user must scroll up to disable auto-scroll (default: 150px)
}

export function useScrollAnchor(options: ScrollAnchorOptions = {}) {
  const {
    enabled = true,
    offset = 100,
    smooth = true,
    threshold = 150
  } = options;

  const containerRef = useRef<HTMLElement | null>(null);
  const sentinelRef = useRef<HTMLElement | null>(null);
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const [shouldFollow, setShouldFollow] = useState(true);
  const lastScrollY = useRef(0);

  // Detect if user scrolled up manually
  useEffect(() => {
    if (!enabled) return;

    const handleScroll = () => {
      const container = containerRef.current;
      const scrollY = container
        ? container.scrollTop
        : window.scrollY;

      // User scrolled up more than threshold
      if (lastScrollY.current - scrollY > threshold) {
        setUserScrolledUp(true);
        setShouldFollow(false);
      }

      lastScrollY.current = scrollY;
    };

    const target = containerRef.current || window;
    target.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      target.removeEventListener('scroll', handleScroll);
    };
  }, [enabled, threshold]);

  // IntersectionObserver to detect if sentinel (bottom) is visible
  useEffect(() => {
    if (!enabled || !sentinelRef.current) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scrollBehavior = smooth && !prefersReducedMotion ? 'smooth' : 'auto';

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;

        // If sentinel is not visible and user hasn't manually scrolled up
        if (!entry.isIntersecting && shouldFollow && !userScrolledUp) {
          scrollToBottom(scrollBehavior);
        }
      },
      {
        root: containerRef.current,
        threshold: 0.1
      }
    );

    observer.observe(sentinelRef.current);

    return () => observer.disconnect();
  }, [enabled, smooth, shouldFollow, userScrolledUp]);

  // Scroll to bottom function with fallbacks
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const container = containerRef.current;
    const sentinel = sentinelRef.current;

    if (!sentinel) return;

    // Try container scroll first
    if (container && container.scrollHeight > container.clientHeight) {
      try {
        container.scrollTo({
          top: container.scrollHeight - offset,
          behavior
        });
        return;
      } catch (e) {
        console.warn('Container scroll failed, falling back to window scroll');
      }
    }

    // Fallback to window scroll (for mobile Safari issues)
    try {
      const rect = sentinel.getBoundingClientRect();
      const targetY = rect.top + window.scrollY - offset;

      window.scrollTo({
        top: targetY,
        behavior
      });
    } catch (e) {
      console.error('Scroll failed:', e);
    }
  }, [offset]);

  // Enable "follow live" mode
  const enableFollow = useCallback(() => {
    setUserScrolledUp(false);
    setShouldFollow(true);
    scrollToBottom('smooth');
  }, [scrollToBottom]);

  // Manually trigger scroll to bottom
  const scrollToBottomNow = useCallback(() => {
    scrollToBottom('auto');
  }, [scrollToBottom]);

  return {
    containerRef,
    sentinelRef,
    userScrolledUp,
    shouldFollow,
    enableFollow,
    scrollToBottomNow
  };
}
