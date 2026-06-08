export function DicaLogo({
  variant = "white",
  fontSize = 28,
}: {
  variant?: "white" | "color";
  fontSize?: number;
}) {
  const c = variant === "white" ? "#ffffff" : "#1B4F8A";
  const tagC = variant === "white" ? "rgba(255,255,255,0.38)" : "rgba(27,79,138,0.40)";
  const barW = Math.round(fontSize * 0.15);
  const dotH = barW;
  const iW = Math.round(fontSize * 0.46);
  const padTop = Math.round(fontSize * 0.1);
  const padBot = Math.round(fontSize * 0.18);
  const gap = Math.round(fontSize * 0.1);
  const tagSize = Math.max(7, Math.round(fontSize * 0.27));

  return (
    <div style={{ userSelect: "none" }}>
      <div style={{ display: "flex", alignItems: "flex-end", lineHeight: 1 }}>
        <span style={{
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 800,
          fontSize,
          color: c,
          letterSpacing: "-0.025em",
        }}>D</span>

        <span style={{
          display: "inline-flex",
          flexDirection: "column",
          alignItems: "center",
          width: iW,
          alignSelf: "stretch",
          justifyContent: "flex-start",
          paddingTop: padTop,
          paddingBottom: padBot,
          gap,
        }}>
          <span style={{
            width: barW,
            height: dotH,
            background: "#8DC63F",
            borderRadius: "1px",
            flexShrink: 0,
          }} />
          <span style={{
            width: barW,
            flex: 1,
            background: "#8DC63F",
            borderRadius: "1px",
          }} />
        </span>

        <span style={{
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 800,
          fontSize,
          color: c,
          letterSpacing: "-0.025em",
        }}>ca</span>
      </div>

      <div style={{
        marginTop: Math.round(fontSize * 0.11),
        fontSize: tagSize,
        fontFamily: "'DM Mono', monospace",
        letterSpacing: "0.09em",
        textTransform: "uppercase",
        color: tagC,
      }}>
        Certainty behind every decision
      </div>
    </div>
  );
}
