import React, { useEffect, useState } from "react";
import Banner from "./components/Banner";
import Carousel from "./components/Carousel";
import DanhSachSanPham from "../products/DanhSachSanPham";
import SachModel from "../../models/SachModel";
import { getSachBanChay, getSachMoiNhat } from "../../api/SachApi";
import SachRow from "./components/SachRow";
import LoiTaiDuLieu from "../products/components/LoiTaiDuLieu";

function HomeBookSection({ title, loadBooks }: {
  title: string;
  loadBooks: (limit?: number, signal?: AbortSignal) => Promise<SachModel[]>;
}): JSX.Element {
  const [books, setBooks] = useState<SachModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setFailed(false);
    loadBooks(8, controller.signal)
      .then(result => {
        if (!controller.signal.aborted) setBooks(result);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [loadBooks, retry]);

  if (!loading && !failed && books.length > 0) {
    return <SachRow title={title} danhSach={books} />;
  }
  return (
    <section className="container py-4" aria-label={title} aria-busy={loading}>
      <div className="section-header"><h2>{title}</h2></div>
      {loading ? <p>Đang tải sách…</p> : failed ? (
        <LoiTaiDuLieu onThuLai={() => setRetry(value => value + 1)} />
      ) : <p>Chưa có sách trong mục này.</p>}
    </section>
  );
}

function HomePage() {
  return (
    <div>
      <Banner />
      <Carousel />
      <HomeBookSection title="Sách bán chạy" loadBooks={getSachBanChay} />
      <HomeBookSection title="Sách mới nhất" loadBooks={getSachMoiNhat} />
      <DanhSachSanPham maTheLoai={0} />
    </div>
  );
}
export default HomePage;
