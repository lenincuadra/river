import { ImageResponse } from "next/og";

// Favicon placeholder con el monograma "1R" (el definitivo, con el palo
// compartido entre el 1 y la R, queda pendiente según river-plan.md §7).
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 7,
          fontSize: 15,
          fontWeight: 800,
        }}
      >
        1R
      </div>
    ),
    { ...size }
  );
}
