"use client";

import { useState } from "react";
import styles from "@/styles/workspace.module.css";

interface PanelSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function PanelSection({ title, defaultOpen = true, children }: PanelSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={styles.panelSection}>
      <h3
        className={styles.panelSectionHeader}
        onClick={() => setOpen(!open)}
      >
        <span>{title}</span>
        <span className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}>
          &#9656;
        </span>
      </h3>
      {open && children}
    </div>
  );
}
