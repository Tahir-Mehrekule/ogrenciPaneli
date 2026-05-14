import React, { useRef } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";

interface FocusTrapContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Whether the trap is active. When true, Tab stays inside. */
  isActive?: boolean;
}

/**
 * AX-1 — Focus Trap wrapper.
 * Drop this around any modal's inner panel div.
 * The trap activates as long as `isActive` is true (default: true).
 *
 * Usage:
 *   <FocusTrapContainer role="dialog" aria-modal="true" className="...">
 *     ...modal content...
 *   </FocusTrapContainer>
 */
export function FocusTrapContainer({
  isActive = true,
  children,
  ...divProps
}: FocusTrapContainerProps) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, isActive);
  return (
    <div ref={ref} {...divProps}>
      {children}
    </div>
  );
}
