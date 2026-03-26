import { useEffect, useState, useRef } from "react";
import axios from "axios";
import ForceGraph2D from "react-force-graph-2d";

export default function GraphView({ highlightedIds = [] }: any) {
  const [fullData, setFullData] = useState<any>({ nodes: [], links: [] });
  const [data, setData] = useState<any>({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null);
  const [hideGranularOverlay, setHideGranularOverlay] = useState(false);
  const [graphError, setGraphError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    axios.get("http://localhost:3000/graph").then((res) => {
      console.log("Graph data:", res.data);
      setFullData(res.data);
      setData(res.data);
      setGraphError(null);
    }).catch((err) => {
      console.error("Graph fetch error:", err);
      setGraphError(
        "Failed to load graph data from backend. Please ensure the backend is running on port 3000."
      );
    });
  }, []);

  function buildNeighborhoodGraph(
    base: any,
    nodeId: string,
    hop: number = 1
  ): { nodes: any[]; links: any[] } {
    if (!base?.nodes?.length || !base?.links?.length) return { nodes: [], links: [] };

    const nodesById = new Map<string, any>();
    for (const n of base.nodes) {
      if (n?.id != null) nodesById.set(String(n.id), n);
    }

    // Treat graph as undirected for neighborhood expansion.
    const adjacency = new Map<string, Set<string>>();
    for (const l of base.links) {
      const s = String(l.source);
      const t = String(l.target);
      if (!adjacency.has(s)) adjacency.set(s, new Set());
      if (!adjacency.has(t)) adjacency.set(t, new Set());
      adjacency.get(s)!.add(t);
      adjacency.get(t)!.add(s);
    }

    const start = String(nodeId);
    const seen = new Set<string>([start]);
    let frontier = new Set<string>([start]);

    for (let step = 0; step < hop; step++) {
      const next = new Set<string>();
      for (const cur of frontier) {
        const neigh = adjacency.get(cur);
        if (!neigh) continue;
        for (const v of neigh) {
          if (!seen.has(v)) {
            seen.add(v);
            next.add(v);
          }
        }
      }
      frontier = next;
    }

    const nodes = Array.from(seen)
      .map((id) => nodesById.get(id))
      .filter(Boolean);

    const links = base.links.filter((l: any) => {
      const s = String(l.source);
      const t = String(l.target);
      return seen.has(s) && seen.has(t);
    });

    return { nodes, links };
  }

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

  // Auto-expand if exactly one node is highlighted by a query.
  useEffect(() => {
    if (!highlightedIds || highlightedIds.length !== 1) return;
    const id = highlightedIds[0];
    setExpandedNodeId(id);
    // Open the node details card for the highlighted entity.
    const nodeObj = fullData?.nodes?.find((n: any) => String(n?.id) === String(id));
    setSelectedNode(nodeObj ?? null);
    // If granular overlay is hidden, show only the neighborhood; otherwise keep full view.
    if (hideGranularOverlay && id) {
      const neighborhood = buildNeighborhoodGraph(fullData, id, 1);
      setData(neighborhood);
    } else {
      setData(fullData);
    }
  }, [highlightedIds, fullData, hideGranularOverlay]);

  // When user toggles granular overlay or changes expanded node, re-derive the view.
  useEffect(() => {
    if (!expandedNodeId) {
      setData(fullData);
      return;
    }
    if (!hideGranularOverlay) {
      setData(fullData);
      return;
    }
    setData(buildNeighborhoodGraph(fullData, expandedNodeId, 1));
  }, [expandedNodeId, hideGranularOverlay, fullData]);

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
      {/* GRAPH OVERLAY CONTROLS */}
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          zIndex: 5,
          display: "flex",
          gap: 8,
          pointerEvents: "auto",
        }}
      >
        <button
          onClick={() => {
            setExpandedNodeId(null);
            setSelectedNode(null);
            setData(fullData);
          }}
          style={{
            background: "rgba(255,255,255,0.9)",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            padding: "6px 10px",
            fontSize: 12,
            cursor: "pointer",
            boxShadow: "0 10px 25px rgba(0,0,0,0.06)",
          }}
        >
          Minimize
        </button>
        <button
          onClick={() => setHideGranularOverlay((v) => !v)}
          style={{
            background: hideGranularOverlay ? "#111827" : "rgba(255,255,255,0.9)",
            color: hideGranularOverlay ? "white" : "#111827",
            border: hideGranularOverlay ? "1px solid #111827" : "1px solid #e5e7eb",
            borderRadius: 8,
            padding: "6px 10px",
            fontSize: 12,
            cursor: "pointer",
            boxShadow: "0 10px 25px rgba(0,0,0,0.06)",
          }}
        >
          {hideGranularOverlay ? "Show Full Graph" : "Hide Granular Overlay"}
        </button>
      </div>

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
          linkColor={(link: any) => {
            const s = String(link.source);
            const t = String(link.target);
            const isHighlighted =
              highlightedIds.includes(s) || highlightedIds.includes(t);
            return isHighlighted ? "rgba(239, 68, 68, 0.8)" : "rgba(150, 150, 150, 0.25)";
          }}
          linkWidth={(link: any) => {
            const s = String(link.source);
            const t = String(link.target);
            const isHighlighted =
              highlightedIds.includes(s) || highlightedIds.includes(t);
            return isHighlighted ? 2 : 1;
          }}
          enableNodeDrag={true}
          enableZoomInteraction={true}
          enablePanInteraction={true}
          onNodeClick={(node) => {
            setSelectedNode(node);
            setExpandedNodeId(node?.id != null ? String(node.id) : null);
            if (hideGranularOverlay) {
              setData(buildNeighborhoodGraph(fullData, String(node.id), 1));
            }
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
          {graphError ? graphError : "Loading graph data..."}
        </div>
      )}

      {/* NODE DETAILS POPUP */}
      {selectedNode && (
        <div
          style={{
            position: "absolute",
            top: 80,
            left: "50%",
            transform: "translateX(-50%)",
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