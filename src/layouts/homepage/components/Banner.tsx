import React from "react";

function Banner() {
  return (
    <div className="p-2 mb-2 bg-secondary">
      <div
        className="container-fluid py-5 text-white d-flex 
    justify-content-center align-items-center"
      >
        <div>
          <h3 className="display-5 fw-bold">
            Sách hay mỗi ngày - Ưu đãi hấp dẫn <br /> khám phá tri thức ngay hôm
            nay!
          </h3>
          <button className="btn btn-primary btn-lg text-white float-end">
            Khám phá tại đây
          </button>
        </div>
      </div>
    </div>
  );
}
export default Banner;
