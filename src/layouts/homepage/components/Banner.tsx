import React from "react";
import { useNavigate } from "react-router-dom";

function Banner() {
  const navigate = useNavigate();

  return (
    <section className="hero-section">
      <div className="container">
        <div className="row align-items-center">
          <div className="col-lg-7">
            <h1 className="hero-title">
              Khám phá thế giới
              <br />
              qua từng trang sách
            </h1>
            <p className="hero-subtitle">
              Hàng ngàn đầu sách hay với ưu đãi hấp dẫn. Giao hàng nhanh chóng, đổi trả dễ dàng.
            </p>
            <button
              className="hero-cta mt-3"
              onClick={() => {
                const el = document.getElementById("san-pham");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Khám phá ngay
              <i className="fas fa-arrow-right"></i>
            </button>
          </div>
          <div className="col-lg-5 d-none d-lg-flex justify-content-center" style={{ position: "relative" }}>
            <div style={{
              width: 280, height: 280,
              background: "rgba(59,130,246,0.12)",
              borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              animation: "float 4s ease-in-out infinite"
            }}>
              <i className="fas fa-book-reader" style={{
                fontSize: "6rem",
                color: "rgba(255,255,255,0.7)",
              }}></i>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
export default Banner;
