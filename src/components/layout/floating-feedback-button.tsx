'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquareHeart } from 'lucide-react';
import { publicEnv } from '@/lib/env';
import { useRightDrawerOffset } from '@/lib/ui/right-drawer';

const EASE = [0.22, 1, 0.36, 1] as const;

export function FloatingFeedbackButton() {
  const feedbackUrl = publicEnv.NEXT_PUBLIC_FEEDBACK_FORM_URL;
  const drawerOffset = useRightDrawerOffset();
  const [viewportWidth, setViewportWidth] = useState<number | null>(null);

  useEffect(() => {
    const update = () => setViewportWidth(window.innerWidth);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  if (!feedbackUrl) {
    return null;
  }

  // On narrow viewports where a full-width drawer covers the screen, gently fade out
  const isCoveredByDrawer =
    drawerOffset > 0 && viewportWidth !== null && viewportWidth - drawerOffset < 180;

  return (
    <motion.a
      href={feedbackUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Share your thoughts about BisTech EMS"
      title="Share your thoughts about BisTech EMS"
      initial={false}
      animate={{
        x: isCoveredByDrawer ? 0 : -drawerOffset,
        opacity: isCoveredByDrawer ? 0 : 1,
        scale: isCoveredByDrawer ? 0.94 : 1,
      }}
      transition={{ duration: 0.26, ease: EASE }}
      style={{ pointerEvents: isCoveredByDrawer ? 'none' : 'auto' }}
      className="sidebar-nav-active group fixed bottom-6 right-6 z-[55] inline-flex h-11 items-center gap-2.5 rounded-2xl bg-[#2E8B57] px-3.5 text-sm font-medium text-[#F0F5F2] shadow-[0_6px_20px_-4px_rgba(46,139,87,0.5)] transition-[background-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:bg-[#349960] hover:shadow-[0_10px_24px_-4px_rgba(46,139,87,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4CAF7D] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0F0E] sm:px-4 md:bottom-8 md:right-8"
    >
      <MessageSquareHeart className="h-[18px] w-[18px] shrink-0" strokeWidth={1.9} />
      <span className="hidden whitespace-nowrap sm:inline">Share Thoughts</span>
    </motion.a>
  );
}
