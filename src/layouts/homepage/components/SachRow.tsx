import React from 'react';
import SachModel from '../../../models/SachModel';
import SachProps from '../../products/components/SachProps';

interface SachRowProps {
  title: string;
  danhSach: SachModel[];
}

function SachRow({ title, danhSach }: SachRowProps) {
  if (danhSach.length === 0) return null;

  return (
    <div className="container py-4">
      <div className="section-header">
        <h2>{title}</h2>
      </div>
      <div className="row">
        {danhSach.slice(0, 4).map(sach => (
          <SachProps key={sach.maSach} sach={sach} />
        ))}
      </div>
    </div>
  );
}

export default SachRow;
