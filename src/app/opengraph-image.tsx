import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Wayne — Full-Stack Developer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const poppins = await fetch(
    new URL(
      "https://fonts.gstatic.com/s/poppins/v21/pxiByp8kv8JHgFVrLCz7Z1JlFd2JQEl8qw.woff2"
    )
  ).then((res) => res.arrayBuffer());

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#ffffff",
        }}
      >
        <span
          style={{
            fontSize: 180,
            fontFamily: "Poppins",
            fontWeight: 700,
            color: "#1a1a2e",
            letterSpacing: "-0.025em",
          }}
        >
          Wayne
          <span style={{ color: "#2563eb" }}>.</span>
        </span>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Poppins",
          data: poppins,
          style: "normal",
          weight: 700,
        },
      ],
    }
  );
}
