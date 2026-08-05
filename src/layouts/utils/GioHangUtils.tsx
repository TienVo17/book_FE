import SachModel from '../../models/SachModel';
import { toast } from 'react-toastify';
import { addOrUpdateItem } from '../../api/CartStorage';

export const themVaoGioHang = (sach: SachModel, soLuong: number = 1) => {
    const soLuongTonKho = sach.soLuong || 0;

    if (soLuong > soLuongTonKho) {
        toast.error(`Số lượng sách không đủ. Chỉ còn ${soLuongTonKho} cuốn.`);
        return;
    }

    const outcome = addOrUpdateItem({
        maSach: sach.maSach,
        sachDto: {
            tenSach: sach.tenSach || '',
            giaBan: sach.giaBan || 0,
            hinhAnh: '',
        },
        soLuong,
        soLuongTonKho,
    });

    if (outcome.status === 'rejected-stock') {
        toast.warning(
            `Số lượng vượt quá tồn kho. Trong giỏ đã có ${outcome.currentQuantity} cuốn, chỉ còn có thể thêm ${outcome.soLuongTonKho - outcome.currentQuantity} cuốn.`,
        );
        return;
    }

    toast.success('Đã thêm vào giỏ hàng!');
};
