import React from "react";

function Carousel() {
  return (
    <div
      id="carouselExampleIndicators"
      className="carousel slide"
      data-bs-ride="carousel"
    >
      <div className="carousel-indicators">
        <button
          type="button"
          data-bs-target="#carouselExampleIndicators"
          data-bs-slide-to="0"
          className="active"
          aria-current="true"
          aria-label="Slide 1"
        ></button>
        <button
          type="button"
          data-bs-target="#carouselExampleIndicators"
          data-bs-slide-to="1"
          aria-label="Slide 2"
        ></button>
        <button
          type="button"
          data-bs-target="#carouselExampleIndicators"
          data-bs-slide-to="2"
          aria-label="Slide 3"
        ></button>
      </div>
      <div className="carousel-inner">
        <div className="carousel-item active">
          <img
            src={"/image/books/banner2.jpg"}
            className="d-block"
            alt="Wild Landscape"
            style={{
              width: "800px", // Chiều rộng cố định 800px
              height: "auto", // Đảm bảo tỷ lệ không bị biến dạng
              margin: "0 auto", // Căn giữa hình ảnh
              display: "block", // Đảm bảo margin hoạt động
            }}
          />
        </div>
        <div className="carousel-item">
          <img
            src={"/image/books/banner4.jpg"}
            className="d-block"
            alt="Camera"
            style={{
              width: "800px", // Chiều rộng cố định 800px
              height: "auto", // Đảm bảo tỷ lệ không bị biến dạng
              margin: "0 auto", // Căn giữa hình ảnh
              display: "block", // Đảm bảo margin hoạt động
            }}
          />
        </div>
        <div className="carousel-item">
          <img
            src={"/image/books/banner3.jpg"}
            className="d-block"
            alt="Exotic Fruits"
            style={{
              width: "800px", // Chiều rộng cố định 800px
              height: "auto", // Đảm bảo tỷ lệ không bị biến dạng
              margin: "0 auto", // Căn giữa hình ảnh
              display: "block", // Đảm bảo margin hoạt động
            }}
          />
        </div>
      </div>
      <button
        className="carousel-control-prev"
        type="button"
        data-bs-target="#carouselExampleIndicators"
        data-bs-slide="prev"
      >
        <span className="carousel-control-prev-icon" aria-hidden="true" style={{ filter: "invert(1)" }}></span>
        <span className="visually-hidden">Previous</span>
      </button>
      <button
        className="carousel-control-next"
        type="button"
        data-bs-target="#carouselExampleIndicators"
        data-bs-slide="next"
      >
        <span className="carousel-control-next-icon" aria-hidden="true" style={{ filter: "invert(1)" }}></span>
        <span className="visually-hidden">Next</span>
      </button>
    </div>
  );
}

export default Carousel;
