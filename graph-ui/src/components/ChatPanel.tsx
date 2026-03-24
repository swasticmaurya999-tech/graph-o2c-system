import { useState, useEffect } from "react";
import axios from "axios";

type Message = {
  id: string;
  role: "user" | "bot";
  text: string;
};

type ChatPanelProps = {
  onResult: (ids: string[]) => void;
};

export default function ChatPanel({ onResult }: ChatPanelProps) {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  // 🔥 Show agent intro on first load
  useEffect(() => {
    setMessages([
      {
        id: "intro",
        role: "bot",
        text: "Hi! I can help you analyze the Order to Cash process. Ask me about orders, payments, deliveries, or any relationships in the graph.",
      },
    ]);
  }, []);

  const handleSend = async () => {
    if (!query.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", text: query };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await axios.post("http://localhost:3000/query", {
        question: query,
      });

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "bot",
        text: res.data.answer,
      };

      setMessages((prev) => [...prev, botMsg]);

      const ids: string[] = res.data.data
        .map((d: any) => {
          const key = Object.keys(d)[0];
          return d[key]?.id;
        })
        .filter(Boolean);

      if (ids.length > 0) {
        onResult(ids);
      }
    } catch (error) {
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "bot",
        text: "Sorry, I encountered an error. Please try again.",
      };

      setMessages((prev) => [...prev, botMsg]);
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
        <p style={{ margin: "0 0 4px 0", fontSize: "12px", color: "#9ca3af", fontWeight: "500" }}>Chat with Graph</p>
        <h3 style={{ margin: 0, fontSize: "14px", fontWeight: "600", color: "#1f2937" }}>Order to Cash</h3>
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
                padding: "12px 16px",
                borderRadius: "12px",
                background: msg.role === "user" ? "#2563eb" : "#e5e7eb",
                color: msg.role === "user" ? "white" : "#1f2937",
                fontSize: "14px",
                lineHeight: "1.5",
                wordWrap: "break-word",
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
                padding: "12px 16px",
                borderRadius: "12px",
                background: "#e5e7eb",
                color: "#6b7280",
              }}
            >
              Dodge AI is thinking...
            </div>
          </div>
        )}
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
              background: loading || !query.trim() ? "#d1d5db" : "#2563eb",
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