import React from "react";

function Carousel() {
  return (
    <div className="container py-4">
      <div
        id="carouselExampleIndicators"
        className="carousel slide"
        data-bs-ride="carousel"
        style={{ borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "var(--shadow-lg)" }}
      >
        <div className="carousel-indicators">
          <button type="button" data-bs-target="#carouselExampleIndicators" data-bs-slide-to="0" className="active" aria-current="true" aria-label="Slide 1" style={{ borderRadius: 4, height: 4, width: 32 }}></button>
          <button type="button" data-bs-target="#carouselExampleIndicators" data-bs-slide-to="1" aria-label="Slide 2" style={{ borderRadius: 4, height: 4, width: 32 }}></button>
          <button type="button" data-bs-target="#carouselExampleIndicators" data-bs-slide-to="2" aria-label="Slide 3" style={{ borderRadius: 4, height: 4, width: 32 }}></button>
        </div>
        <div className="carousel-inner">
          <div className="carousel-item active">
            <img
              src={"/image/books/banner2.jpg"}
              className="d-block w-100"
              alt="Bộ sưu tập sách mới"
              style={{ height: "380px", objectFit: "cover" }}
            />
          </div>
          <div className="carousel-item">
            <img
              src={"/image/books/banner4.jpg"}
              className="d-block w-100"
              alt="Khuyến mãi đặc biệt"
              style={{ height: "380px", objectFit: "cover" }}
            />
          </div>
          <div className="carousel-item">
            <img
              src={"/image/books/banner3.jpg"}
              className="d-block w-100"
              alt="Sách bán chạy"
              style={{ height: "380px", objectFit: "cover" }}
            />
          </div>
        </div>
        <button className="carousel-control-prev" type="button" data-bs-target="#carouselExampleIndicators" data-bs-slide="prev">
          <span className="carousel-control-prev-icon" aria-hidden="true" style={{
            background: "rgba(0,0,0,0.4)",
            borderRadius: "50%",
            width: 40,
            height: 40,
            backgroundSize: "50%",
            backgroundPosition: "center"
          }}></span>
          <span className="visually-hidden">Previous</span>
        </button>
        <button className="carousel-control-next" type="button" data-bs-target="#carouselExampleIndicators" data-bs-slide="next">
          <span className="carousel-control-next-icon" aria-hidden="true" style={{
            background: "rgba(0,0,0,0.4)",
            borderRadius: "50%",
            width: 40,
            height: 40,
            backgroundSize: "50%",
            backgroundPosition: "center"
          }}></span>
          <span className="visually-hidden">Next</span>
        </button>
      </div>
    </div>
  );
}

export default Carousel;
