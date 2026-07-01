import React from "react";

export const MeshGradient = ({ colors }) => {
  const palette = colors && colors.length >= 5
    ? colors
    : [
        "rgb(120, 60, 200)",
        "rgb(60, 120, 220)",
        "rgb(230, 90, 120)",
        "rgb(90, 200, 180)",
        "rgb(240, 170, 80)",
      ];

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      data-testid="mesh-gradient"
    >
      {/* Base layer: three-stop linear gradient from album art palette */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${palette[0]} 0%, ${palette[1]} 55%, ${palette[2]} 100%)`,
          opacity: 0.42,
        }}
      />
      <div
        className="blob blob-1"
        style={{
          backgroundColor: palette[0],
          width: "70%",
          height: "70%",
          top: "-10%",
          left: "-10%",
        }}
      />
      <div
        className="blob blob-2"
        style={{
          backgroundColor: palette[1],
          width: "65%",
          height: "65%",
          top: "-20%",
          right: "-10%",
        }}
      />
      <div
        className="blob blob-3"
        style={{
          backgroundColor: palette[2],
          width: "60%",
          height: "60%",
          bottom: "-15%",
          left: "10%",
        }}
      />
      <div
        className="blob blob-4"
        style={{
          backgroundColor: palette[3],
          width: "60%",
          height: "60%",
          bottom: "-20%",
          right: "0%",
        }}
      />
      <div
        className="blob blob-5"
        style={{
          backgroundColor: palette[4],
          width: "55%",
          height: "55%",
          top: "20%",
          left: "25%",
        }}
      />
      {/* subtle grain */}
      <div className="grain absolute inset-0" />
      {/* darkening vignette to boost text contrast */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(0,0,0,0.0) 45%, rgba(0,0,0,0.35) 100%)",
        }}
      />
    </div>
  );
};

export default MeshGradient;
