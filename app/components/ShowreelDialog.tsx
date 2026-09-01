"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { MEDIA_PRIORITY, SHOWREEL_VIDEO_SRC, unlockMediaPriority } from "../hero-media";
import { useLanguage } from "../language";

export function ShowreelDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { language } = useLanguage();
  const closeRef = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!open) return;
    unlockMediaPriority(MEDIA_PRIORITY.showreel);
    const video = videoRef.current;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.body.classList.add("modal-open");
    window.addEventListener("keydown", onKeyDown);
    window.setTimeout(() => closeRef.current?.focus(), 30);
    return () => {
      document.body.classList.remove("modal-open");
      window.removeEventListener("keydown", onKeyDown);
      video?.pause();
    };
  }, [onClose, open]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="editorial-reel-dialog"
          role="dialog"
          aria-modal="true"
          aria-label="LIUKER Showreel"
          onMouseDown={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="editorial-reel-panel"
            onMouseDown={(event) => event.stopPropagation()}
            initial={{ opacity: 0, y: 28, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <button
              ref={closeRef}
              type="button"
              className="editorial-reel-close"
              onClick={onClose}
              aria-label={language === "zh" ? "关闭 Showreel" : "Close showreel"}
            >
              <X size={20} />
            </button>
            <video
              ref={videoRef}
              src={SHOWREEL_VIDEO_SRC}
              controls
              controlsList="nodownload"
              autoPlay
              playsInline
              preload="metadata"
              onLoadedData={() => unlockMediaPriority(MEDIA_PRIORITY.archive)}
            />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
