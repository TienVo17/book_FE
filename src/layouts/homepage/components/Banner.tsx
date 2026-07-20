import React from "react";
import { useNavigate } from "react-router-dom";

function Banner() {
  const navigate = useNavigate();

  return (
    <section className="hero-section">
      <div className="container">
        <div className="row align-items-center">
          <div className="col-12 hero-content">
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
        </div>
      </div>
    </section>
  );
}
export default Banner;
