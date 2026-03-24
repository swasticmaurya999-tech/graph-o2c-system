import { useEffect, useState, useRef } from "react";
import axios from "axios";
import ForceGraph2D from "react-force-graph-2d";

export default function GraphView({ highlightedIds = [] }: any) {
  const [data, setData] = useState<any>({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    axios.get("http://localhost:3000/graph").then((res) => {
      console.log("Graph data:", res.data);
      setData(res.data);
    });
  }, []);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  useEffect(() => {
    if (fgRef.current && data.nodes.length > 0 && dimensions.width > 0) {
      const fg = fgRef.current;
      
      // Configure forces
      try {
        fg.d3Force("charge").strength(-50);
        fg.d3Force("link").distance(80);
        
        // Auto-zoom to fit
        setTimeout(() => {
          fg.zoomToFit(400, 50);
        }, 500);
      } catch (err) {
        console.error("Force configuration error:", err);
      }
    }
  }, [data, dimensions]);

  return (
    <div 
      ref={containerRef}
      style={{ 
        width: "100%", 
        height: "100%", 
        position: "relative", 
        background: "white",
        overflow: "hidden"
      }}
    >
      {data.nodes.length > 0 && dimensions.width > 0 ? (
        <ForceGraph2D
          ref={fgRef}
          graphData={data}
          width={dimensions.width}
          height={dimensions.height}
          nodeLabel={(node: any) => `${node.label}: ${node.id}`}
          nodeCanvasObject={(node: any, ctx) => {
            // Draw circle
            ctx.fillStyle = highlightedIds.includes(node.id) ? "#ef4444" : "#3b82f6";
            ctx.beginPath();
            ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI);
            ctx.fill();
            
            // Draw border
            ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
            ctx.lineWidth = 1;
            ctx.stroke();
          }}
          linkColor={() => "rgba(150, 150, 150, 0.25)"}
          linkWidth={1}
          enableNodeDrag={true}
          enableZoomInteraction={true}
          enablePanInteraction={true}
          onNodeClick={(node) => {
            setSelectedNode(node);
          }}
          onNodeHover={(node) => {
            if (containerRef.current) {
              containerRef.current.style.cursor = node ? "pointer" : "grab";
            }
          }}
        />
      ) : (
        <div 
          style={{ 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            height: "100%",
            color: "#9ca3af",
            fontSize: "16px"
          }}
        >
          Loading graph data...
        </div>
      )}

      {/* NODE DETAILS POPUP */}
      {selectedNode && (
        <div
          style={{
            position: "absolute",
            top: 20,
            left: 20,
            background: "white",
            padding: "16px",
            borderRadius: "12px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
            maxWidth: "380px",
            maxHeight: "75vh",
            overflowY: "auto",
            zIndex: 100,
            border: "1px solid #e5e7eb",
            fontSize: "13px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "12px" }}>
            <div>
              <h3 style={{ margin: "0 0 4px 0", fontSize: "16px", fontWeight: "600", color: "#1f2937" }}>
                {selectedNode.label}
              </h3>
              <p style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}>Type: {selectedNode.label}</p>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              style={{
                background: "none",
                border: "none",
                fontSize: "20px",
                cursor: "pointer",
                color: "#9ca3af",
                padding: 0,
                width: 24,
                height: 24,
                flexShrink: 0,
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "12px" }}>
            {Object.entries(selectedNode)
              .filter(([key]) => {
                // Filter out internal properties
                const internalProps = ["x", "y", "vx", "vy", "index", "__indexColor", "__graph", "label"];
                return !internalProps.includes(key);
              })
              .map(([key, value]) => {
                // Skip null/undefined values
                if (value === null || value === undefined) return null;

                const displayValue = typeof value === "object" ? JSON.stringify(value, null, 2) : String(value);

                return (
                  <div key={key} style={{ marginBottom: "10px", paddingBottom: "10px", borderBottom: "1px solid #f3f4f6" }}>
                    <p style={{ margin: "0 0 4px 0", fontWeight: "600", color: "#374151", textTransform: "capitalize" }}>
                      {key}:
                    </p>
                    <p style={{ 
                      margin: 0, 
                      color: "#6b7280", 
                      wordBreak: "break-word",
                      whiteSpace: "pre-wrap",
                      fontFamily: "monospace",
                      fontSize: "12px",
                      background: "#f9fafb",
                      padding: "6px 8px",
                      borderRadius: "4px",
                      overflow: "auto",
                      maxHeight: "150px"
                    }}>
                      {displayValue}
                    </p>
                  </div>
                );
              })
              .filter(Boolean)}
          </div>
        </div>
      )}
    </div>
  );
}