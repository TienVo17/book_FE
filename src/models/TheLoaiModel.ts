export interface TheLoaiModel {
  maTheLoai: number;
  tenTheLoai: string;
  slug: string;
  soLuongSach: number;
}

export interface TheLoaiAdminModel extends TheLoaiModel {
  coTheXoa: boolean;
}

export interface TheLoaiAdminUpsertPayload {
  tenTheLoai: string;
}
