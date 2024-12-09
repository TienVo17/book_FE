import SachModel from '../../models/SachModel';
import { toast } from 'react-toastify';

export const themVaoGioHang = (sach: SachModel, soLuong: number = 1) => {
    const soLuongTonKho = sach.soLuong || 0;
    
    if (soLuong > soLuongTonKho) {
        toast.error(`Số lượng sách không đủ. Chỉ còn ${soLuongTonKho} cuốn.`);
        return;
    }

    const gioHangHienTai = JSON.parse(localStorage.getItem('gioHang') || '[]');
    
    const sanPhamMoi = {
        maSach: sach.maSach,
        sachDto: {
            tenSach: sach.tenSach,
            giaBan: sach.giaBan,
            hinhAnh: ''
        },
        soLuong: soLuong,
        soLuongTonKho: soLuongTonKho
    };

    const sanPhamTonTai = gioHangHienTai.find((item: any) => item.maSach === sach.maSach);

    let gioHangMoi;
    if (sanPhamTonTai) {
        const soLuongMoi = sanPhamTonTai.soLuong + soLuong;
        
        if (soLuongMoi > soLuongTonKho) {
            toast.warning(`Số lượng vượt quá tồn kho. Trong giỏ đã có ${sanPhamTonTai.soLuong} cuốn, chỉ còn có thể thêm ${soLuongTonKho - sanPhamTonTai.soLuong} cuốn.`);
            return;
        }
        
        gioHangMoi = gioHangHienTai.map((item: any) => 
            item.maSach === sach.maSach 
                ? {...item, soLuong: soLuongMoi}
                : item
        );
    } else {
        gioHangMoi = [...gioHangHienTai, sanPhamMoi];
    }

    localStorage.setItem('gioHang', JSON.stringify(gioHangMoi));
    window.dispatchEvent(new Event('storage'));
    toast.success('Đã thêm vào giỏ hàng!');
}; 