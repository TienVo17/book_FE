import SachModel from '../../models/SachModel';
import { toast } from 'react-toastify';
import { addCartItem } from '../../api/CartSession';

export const themVaoGioHang = async (sach: SachModel, soLuong: number = 1): Promise<boolean> => {
    const soLuongTonKho = sach.soLuong || 0;

    if (soLuong > soLuongTonKho) {
        toast.error(`Số lượng sách không đủ. Chỉ còn ${soLuongTonKho} cuốn.`);
        return false;
    }

    try {
        await addCartItem({
            maSach: sach.maSach,
            sachDto: {
                tenSach: sach.tenSach || '',
                giaBan: sach.giaBan || 0,
                hinhAnh: '',
            },
            soLuong,
            soLuongTonKho,
        });
        toast.success('Đã thêm vào giỏ hàng!');
        return true;
    } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Không thể thêm sách vào giỏ hàng.');
        return false;
    }
};
