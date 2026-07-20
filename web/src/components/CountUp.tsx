import { animate, useMotionValue } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/** Animates numeric changes with a decelerating tween; renders via `format`. */
export function CountUp({ value, format }: { value: number; format: (v: number) => string }) {
  const mv = useMotionValue(value);
  const [text, setText] = useState(() => format(value));
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      mv.set(value);
      setText(format(value));
      return;
    }
    const controls = animate(mv, value, {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setText(format(v)),
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <span className="amount">{text}</span>;
}
