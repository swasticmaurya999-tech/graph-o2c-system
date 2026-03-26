import { useState, useEffect } from "react";
import axios from "axios";

const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:3000";

type Message = {
  id: string;
  role: "user" | "bot";
  text: string;
};

interface ChatPanelProps {
  onResult: (ids: string[]) => void;
}

export default function ChatPanel({ onResult }: ChatPanelProps) {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  // Intro message on initial load
  useEffect(() => {
    setMessages([
      {
        id: "intro",
        role: "bot",
        text:
          "Dodge AI is awaiting instructions.\n\nTry asking:\n• Show me sales order 740584\n• Trace billing document 90504248\n• Which orders were delivered but not billed?\n• Which products have the highest number of billing documents?",
      },
    ]);
  }, []);

  const suggestionChips = [
    "Show me sales order 740584",
    "Trace billing document 90504248",
    "Which orders were delivered but not billed?",
    "Which products are associated with the highest number of billing documents?",
  ];

  const handleSend = async () => {
    if (!query.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", text: query };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await axios.post(`${API_BASE_URL}/query`, {
        question: query,
      });

      // Handle errors
      if (res.data.error) {
        const errorMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: "bot",
          text: `⚠️ ${res.data.error}`,
        };
        setMessages((prev) => [...prev, errorMsg]);
        setLoading(false);
        setQuery("");
        return;
      }

      // Show answer
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "bot",
        text: res.data.answer || "No answer generated.",
      };

      setMessages((prev) => [...prev, botMsg]);

      // Extract IDs for visualization - prioritize the new ids array
      const ids: string[] = res.data.ids || [];

      if (ids.length > 0) {
        onResult(ids);
      }
    } catch (error) {
      console.error("Query error:", error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "bot",
        text: "❌ Something went wrong while processing your request. Please try again.",
      };
      setMessages((prev) => [...prev, errorMsg]);
    }

    setLoading(false);
    setQuery("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !loading) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", background: "#f9fafb" }}>
      {/* Header */}
      <div style={{ padding: "14px 16px", borderBottom: "1px solid #e5e7eb", background: "white" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 999,
                background: "#111827",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              D
            </div>
            <div>
              <p style={{ margin: "0 0 2px 0", fontSize: "12px", color: "#9ca3af", fontWeight: 500 }}>
                Dodge AI
              </p>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#1f2937" }}>Order to Cash</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                maxWidth: "85%",
                padding: "10px 12px",
                borderRadius: "8px",
                background: msg.role === "user" ? "#d1d5db" : "#e8fff3",
                color: msg.role === "user" ? "#111827" : "#065f46",
                fontSize: "13px",
                lineHeight: "1.5",
                wordWrap: "break-word",
                whiteSpace: "pre-wrap",
                overflowWrap: "break-word",
              }}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div
              style={{
                padding: "10px 12px",
                borderRadius: "8px",
                background: "#e8fff3",
                color: "#6b7280",
                fontSize: "13px",
              }}
            >
              Dodge AI is thinking...
            </div>
          </div>
        )}
      </div>

      {/* Suggestions */}
      <div style={{ padding: "0 14px 12px 14px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {suggestionChips.map((s) => (
            <button
              key={s}
              onClick={() => setQuery(s)}
              style={{
                border: "1px solid #e5e7eb",
                background: "white",
                borderRadius: 999,
                padding: "6px 10px",
                fontSize: 12,
                cursor: "pointer",
                color: "#111827",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div style={{ padding: "12px 14px", borderTop: "1px solid #e5e7eb", background: "white" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            style={{
              flex: 1,
              padding: "8px 10px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "13px",
              fontFamily: "inherit",
              outline: "none",
              opacity: loading ? 0.6 : 1,
            }}
            placeholder="Analyze anything..."
          />
          <button
            onClick={handleSend}
            disabled={loading || !query.trim()}
            style={{
              padding: "8px 12px",
              background: loading || !query.trim() ? "#d1d5db" : "#111827",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: loading || !query.trim() ? "not-allowed" : "pointer",
              fontWeight: "500",
              fontSize: "12px",
              transition: "background 0.2s",
              whiteSpace: "nowrap",
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}