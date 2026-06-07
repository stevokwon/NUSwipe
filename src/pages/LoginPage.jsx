export default function LoginPage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f0a1e 0%, #1a0f3a 40%, #2d1060 100%)",
      fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      <div style={{ textAlign: "center", color: "#fff" }}>
        <div style={{ fontSize: "64px", marginBottom: 24 }}>💼</div>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "44px", marginBottom: 16 }}>
          JobSwipe
        </h1>
        <p style={{ fontSize: "18px", color: "rgba(255,255,255,0.6)", marginBottom: 40 }}>
          AI-powered job discovery for students
        </p>

        <button style={{
          background: "linear-gradient(135deg, #7c3aed, #9d46f5)",
          border: "none",
          color: "#fff",
          fontWeight: 600,
          fontSize: "16px",
          padding: "16px 48px",
          borderRadius: "50px",
          cursor: "pointer",
          fontFamily: "'DM Sans', sans-serif",
          boxShadow: "0 8px 32px rgba(124,58,237,0.5)",
        }}>
          Login (Coming Soon)
        </button>
      </div>
    </div>
  );
}
