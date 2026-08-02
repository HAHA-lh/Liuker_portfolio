import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found">
      <div>
        <div className="not-found-code">404</div>
        <h1 className="gradient-text" style={{ fontSize: "clamp(2rem, 6vw, 5rem)", fontWeight: 800 }}>
          FRAME NOT FOUND
        </h1>
        <p style={{ margin: "1rem auto 2rem", color: "var(--text-medium)" }}>
          这个作品不存在，或者正在等待素材。 / This frame is not in the reel yet.
        </p>
        <Link href="/" className="primary-button">返回首页 / Back home</Link>
      </div>
    </main>
  );
}
