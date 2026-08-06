import React, { useEffect, useRef } from "react";
import { DanhGiaHinhAnhCongKhai } from "../../../api/DanhGiaAPI";

interface XemAnhLonProps {
  danhSach: DanhGiaHinhAnhCongKhai[];
  chiSo: number;
  onChuyen: (chiSo: number) => void;
  onDong: () => void;
}

const XemAnhLon: React.FC<XemAnhLonProps> = ({ danhSach, chiSo, onChuyen, onDong }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const nutDongRef = useRef<HTMLButtonElement>(null);
  const anh = danhSach[chiSo];

  useEffect(() => {
    const focusTruoc = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflowTruoc = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    nutDongRef.current?.focus();

    return () => {
      document.body.style.overflow = overflowTruoc;
      if (focusTruoc?.isConnected) focusTruoc.focus();
    };
  }, []);

  useEffect(() => {
    const xuLyPhim = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onDong();
      } else if (event.key === "ArrowLeft" && danhSach.length > 1) {
        event.preventDefault();
        onChuyen((chiSo - 1 + danhSach.length) % danhSach.length);
      } else if (event.key === "ArrowRight" && danhSach.length > 1) {
        event.preventDefault();
        onChuyen((chiSo + 1) % danhSach.length);
      } else if (event.key === "Tab" && dialogRef.current) {
        const nut = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), [href], [tabindex]:not([tabindex='-1'])")
        );
        if (nut.length === 0) return;
        const dau = nut[0];
        const cuoi = nut[nut.length - 1];
        if (event.shiftKey && document.activeElement === dau) {
          event.preventDefault();
          cuoi.focus();
        } else if (!event.shiftKey && document.activeElement === cuoi) {
          event.preventDefault();
          dau.focus();
        }
      }
    };

    document.addEventListener("keydown", xuLyPhim);
    return () => document.removeEventListener("keydown", xuLyPhim);
  }, [chiSo, danhSach.length, onChuyen, onDong]);

  if (!anh) return null;

  return (
    <div
      className="review-image-viewer-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onDong();
      }}
    >
      <div
        ref={dialogRef}
        className="review-image-viewer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-image-viewer-title"
        aria-describedby="review-image-viewer-hint"
      >
        <div className="review-image-viewer-header">
          <h2 id="review-image-viewer-title">
            Ảnh đánh giá {chiSo + 1} / {danhSach.length}
          </h2>
          <button ref={nutDongRef} type="button" className="review-image-viewer-close" onClick={onDong}>
            <span aria-hidden="true">×</span>
            <span className="visually-hidden">Đóng ảnh lớn</span>
          </button>
        </div>
        <div className="review-image-viewer-body">
          {danhSach.length > 1 && (
            <button
              type="button"
              className="review-image-viewer-nav"
              onClick={() => onChuyen((chiSo - 1 + danhSach.length) % danhSach.length)}
              aria-label="Ảnh trước"
            >
              ‹
            </button>
          )}
          <img src={anh.urlHinh} alt={`Ảnh đánh giá ${chiSo + 1} trên ${danhSach.length}`} />
          {danhSach.length > 1 && (
            <button
              type="button"
              className="review-image-viewer-nav"
              onClick={() => onChuyen((chiSo + 1) % danhSach.length)}
              aria-label="Ảnh tiếp theo"
            >
              ›
            </button>
          )}
        </div>
        <p id="review-image-viewer-hint" className="review-image-viewer-hint">
          Dùng phím mũi tên để chuyển ảnh, Escape để đóng.
        </p>
      </div>
    </div>
  );
};

export default XemAnhLon;
