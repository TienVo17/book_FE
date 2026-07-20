import React, { useEffect, useState } from "react";

interface AnhSachProps {
  src?: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  width?: number;
  height?: number;
  loading?: "lazy" | "eager";
}

/**
 * Ảnh sách có sẵn ảnh thay thế. Khi url rỗng hoặc tải lỗi, hiển thị khối
 * placeholder theo design token thay vì để trống khung ảnh.
 */
const AnhSach: React.FC<AnhSachProps> = ({
  src,
  alt = "Ảnh sách",
  className,
  style,
  width,
  height,
  loading = "lazy",
}) => {
  const [taiLoi, setTaiLoi] = useState(false);

  // Danh sách dùng lại component khi cuộn, phải reset trạng thái lỗi theo src.
  useEffect(() => {
    setTaiLoi(false);
  }, [src]);

  if (!src || taiLoi) {
    return (
      <div
        className={`anh-sach-thay-the ${className ?? ""}`}
        style={{ ...style, width, height }}
        role="img"
        aria-label={alt}
      >
        <i className="fas fa-book" aria-hidden="true"></i>
        <span>Chưa có ảnh</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      width={width}
      height={height}
      loading={loading}
      onError={() => setTaiLoi(true)}
    />
  );
};

export default AnhSach;
