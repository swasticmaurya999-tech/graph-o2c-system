import { useState } from "react";
import GraphView from "./components/GraphView";
import ChatPanel from "./components/ChatPanel";
import "./App.css";

function App() {
  const [highlightedIds, setHighlightedIds] = useState<string[]>([]);

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
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        
        {/* GRAPH */}
        <div className="graph-container" style={{ width: "78%", overflow: "hidden", background: "white" }}>
          <GraphView highlightedIds={highlightedIds} />
        </div>

        {/* CHAT */}
        <div
          className="chat-container"
          style={{
            width: "22%",
            borderLeft: "1px solid #e5e7eb",
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