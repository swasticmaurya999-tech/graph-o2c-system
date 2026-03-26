import { useEffect, useRef, useState } from "react";
import GraphView from "./components/GraphView";
import ChatPanel from "./components/ChatPanel";
import "./App.css";

function App() {
  const [highlightedIds, setHighlightedIds] = useState<string[]>([]);
  const [chatPct, setChatPct] = useState<number>(30);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ startX: number; startPct: number; totalW: number } | null>(
    null
  );

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!isDraggingRef.current) return;
      const drag = dragStartRef.current;
      if (!drag || !containerRef.current) return;

      e.preventDefault();
      const deltaX = e.clientX - drag.startX;
      const deltaPct = (deltaX / Math.max(1, drag.totalW)) * 100;

      // When mouse moves right, chat width should increase.
      // In our flex layout, increasing chat width makes the divider move left.
      // Users expect the divider to move in the same direction as the pointer,
      // so we invert the delta here.
      const next = drag.startPct - deltaPct;
      const clamped = Math.min(45, Math.max(18, next));
      setChatPct(clamped);
    }

    function onMouseUp() {
      isDraggingRef.current = false;
      dragStartRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    window.addEventListener("mousemove", onMouseMove, { passive: false });
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove as any);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      
      {/* HEADER */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid #e5e7eb",
          background: "white",
        }}
      >
        <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>
          <span style={{ color: "#9ca3af" }}>Mapping</span>
          <span style={{ margin: "0 6px", color: "#d1d5db" }}>/</span>
          <span style={{ color: "#1f2937", fontWeight: "500" }}>Order to Cash</span>
        </p>
      </div>

      {/* MAIN */}
      <div
        ref={containerRef}
        style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}
      >
        
        {/* GRAPH */}
        <div
          className="graph-container"
          style={{
            flex: "1 1 auto",
            overflow: "hidden",
            background: "white",
            minWidth: 0,
          }}
        >
          <GraphView highlightedIds={highlightedIds} />
        </div>

        {/* SPLITTER */}
        <div
          role="separator"
          aria-orientation="vertical"
          onMouseDown={(e) => {
            if (!containerRef.current) return;
            isDraggingRef.current = true;
            const totalW = containerRef.current.getBoundingClientRect().width;
            dragStartRef.current = { startX: e.clientX, startPct: chatPct, totalW };
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
          }}
          style={{
            width: 8,
            background: "#e5e7eb",
            cursor: "col-resize",
            flex: "0 0 8px",
          }}
          title="Drag to resize panels"
        />

        {/* CHAT */}
        <div
          className="chat-container"
          style={{
            flex: `0 0 ${chatPct}%`,
            background: "#f9fafb",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <ChatPanel onResult={setHighlightedIds} />
        </div>
      </div>
    </div>
  );
}

export default App;