import React from "react";

function About() {
  return (
    <div className="container py-5">
      <div className="section-header">
        <h2>Về chúng tôi</h2>
      </div>

      <div className="row g-4">
        {/* Store Info */}
        <div className="col-lg-6">
          <div className="detail-section h-100 animate-fade-in-up">
            <div className="d-flex align-items-center gap-3 mb-4">
              <div style={{
                width: 56, height: 56, borderRadius: "var(--radius-md)",
                background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-light))",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <i className="fas fa-book-open" style={{ color: "white", fontSize: "1.3rem" }}></i>
              </div>
              <div>
                <h4 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, marginBottom: 2 }}>BookStore</h4>
                <span style={{ color: "var(--color-text-secondary)", fontSize: "0.88rem" }}>Nhà sách trực tuyến</span>
              </div>
            </div>

            <div style={{ fontSize: "0.93rem", lineHeight: 2 }}>
              <p className="d-flex align-items-start gap-2" style={{ marginBottom: "0.5rem" }}>
                <i className="fas fa-map-marker-alt mt-1" style={{ color: "var(--color-primary)", width: 20, textAlign: "center" }}></i>
                A34/24D3 Quốc lộ 50, xã Bình Hưng, huyện Bình Chánh
              </p>
              <p className="d-flex align-items-center gap-2" style={{ marginBottom: "0.5rem" }}>
                <i className="fas fa-phone" style={{ color: "var(--color-primary)", width: 20, textAlign: "center" }}></i>
                0348972987
              </p>
              <p className="d-flex align-items-center gap-2" style={{ marginBottom: "0.5rem" }}>
                <i className="fas fa-envelope" style={{ color: "var(--color-primary)", width: 20, textAlign: "center" }}></i>
                tienvovan917@gmail.com
              </p>
              <p className="d-flex align-items-center gap-2" style={{ marginBottom: 0 }}>
                <i className="fas fa-clock" style={{ color: "var(--color-primary)", width: 20, textAlign: "center" }}></i>
                08:00 - 21:00, Thứ 2 - Chủ nhật
              </p>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="col-lg-6">
          <div className="detail-section h-100 animate-fade-in-up stagger-2" style={{ padding: 0, overflow: "hidden" }}>
            <iframe
              width="100%"
              height="100%"
              src="https://www.openstreetmap.org/export/embed.html?bbox=106.67393%2C10.73398%2C106.68193%2C10.74198&layer=mapnik&marker=10.73798%2C106.67793"
              style={{ border: 0, minHeight: 350 }}
              title="BookStore Location"
              loading="lazy"
            ></iframe>
          </div>
        </div>
      </div>
    </div>
  );
}

export default About;
