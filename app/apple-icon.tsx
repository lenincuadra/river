import { ImageResponse } from "next/og";

// Ícono para la pantalla de inicio del celular (iOS lo redondea solo).
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0e7490",
          color: "#fff",
          fontSize: 84,
          fontWeight: 800,
        }}
      >
        1R
      </div>
    ),
    { ...size }
  );
}
