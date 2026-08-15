import { apiUrl } from './ApiUrl';
import { CartItem } from './CartStorage';
import { authRequest, authRequestWithCapture } from './Request';

export interface ServerCartSummary {
  items: CartItem[];
  tongSoLuong: number;
  tongTien: number;
}

export interface CartMergeItem {
  maSach: number;
  soLuong: number;
}

export interface CartLineAdjustment {
  maSach: number;
  tenSach: string | null;
  requestedSoLuong: number;
  appliedSoLuong: number;
  reason: string;
}

export interface ServerCartMergeResponse extends ServerCartSummary {
  mergedCount: number;
  adjustedItems: CartLineAdjustment[];
  removedItems: CartLineAdjustment[];
}

interface RawCartItem {
  maSach?: unknown;
  tenSach?: unknown;
  giaBan?: unknown;
  soLuong?: unknown;
  soLuongTon?: unknown;
  hinhAnh?: unknown;
  isActive?: unknown;
}

interface RawCartSummary {
  items?: unknown;
  tongSoLuong?: unknown;
  tongTien?: unknown;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && typeof value === 'number' && value > 0;
}

function mapItem(raw: unknown): CartItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as RawCartItem;
  if (
    !isPositiveInteger(item.maSach) ||
    typeof item.tenSach !== 'string' ||
    !isFiniteNumber(item.giaBan) || item.giaBan < 0 ||
    !isPositiveInteger(item.soLuong) ||
    !Number.isInteger(item.soLuongTon) || typeof item.soLuongTon !== 'number' || item.soLuongTon < 0 ||
    (item.hinhAnh !== null && item.hinhAnh !== undefined && typeof item.hinhAnh !== 'string')
  ) {
    return null;
  }

  return {
    maSach: item.maSach,
    sachDto: {
      tenSach: item.tenSach,
      giaBan: item.giaBan,
      hinhAnh: typeof item.hinhAnh === 'string' ? item.hinhAnh : '',
    },
    soLuong: item.soLuong,
    soLuongTonKho: item.soLuongTon,
  };
}

function mapSummary(raw: unknown): ServerCartSummary {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Dữ liệu giỏ hàng từ máy chủ không hợp lệ.');
  }
  const summary = raw as RawCartSummary;
  if (
    !Array.isArray(summary.items) ||
    !Number.isInteger(summary.tongSoLuong) || typeof summary.tongSoLuong !== 'number' || summary.tongSoLuong < 0 ||
    !isFiniteNumber(summary.tongTien) || summary.tongTien < 0
  ) {
    throw new Error('Dữ liệu giỏ hàng từ máy chủ không hợp lệ.');
  }

  const items = summary.items.map(mapItem);
  if (items.some(item => item === null)) {
    throw new Error('Dữ liệu giỏ hàng từ máy chủ không hợp lệ.');
  }

  return {
    items: items as CartItem[],
    tongSoLuong: summary.tongSoLuong,
    tongTien: summary.tongTien,
  };
}

function mapAdjustments(raw: unknown): CartLineAdjustment[] {
  if (!Array.isArray(raw)) {
    throw new Error('Dữ liệu merge giỏ hàng từ máy chủ không hợp lệ.');
  }
  return raw.map(value => {
    if (!value || typeof value !== 'object') {
      throw new Error('Dữ liệu merge giỏ hàng từ máy chủ không hợp lệ.');
    }
    const item = value as Record<string, unknown>;
    if (
      !isPositiveInteger(item.maSach) ||
      (item.tenSach !== null && typeof item.tenSach !== 'string') ||
      !Number.isInteger(item.requestedSoLuong) || typeof item.requestedSoLuong !== 'number' || item.requestedSoLuong < 0 ||
      !Number.isInteger(item.appliedSoLuong) || typeof item.appliedSoLuong !== 'number' || item.appliedSoLuong < 0 ||
      typeof item.reason !== 'string'
    ) {
      throw new Error('Dữ liệu merge giỏ hàng từ máy chủ không hợp lệ.');
    }
    return item as unknown as CartLineAdjustment;
  });
}

function mapMergeResponse(raw: unknown): ServerCartMergeResponse {
  const summary = mapSummary(raw);
  const value = raw as Record<string, unknown>;
  if (!Number.isInteger(value.mergedCount) || typeof value.mergedCount !== 'number' || value.mergedCount < 0) {
    throw new Error('Dữ liệu merge giỏ hàng từ máy chủ không hợp lệ.');
  }
  return {
    ...summary,
    mergedCount: value.mergedCount,
    adjustedItems: mapAdjustments(value.adjustedItems),
    removedItems: mapAdjustments(value.removedItems),
  };
}

export async function getServerCart(): Promise<ServerCartSummary> {
  return (await getServerCartWithCapture()).summary;
}

export async function getServerCartWithCapture() {
  const result = await authRequestWithCapture(apiUrl('/api/gio-hang'));
  return {
    summary: mapSummary(result.data),
    capture: result.capture,
  };
}

export async function addServerCartItem(maSach: number, soLuong: number): Promise<ServerCartSummary> {
  return mapSummary(await authRequest(apiUrl('/api/gio-hang/items'), {
    method: 'POST',
    body: JSON.stringify({ maSach, soLuong }),
  }));
}

export async function updateServerCartItem(maSach: number, soLuong: number): Promise<ServerCartSummary> {
  return mapSummary(await authRequest(apiUrl(`/api/gio-hang/items/${maSach}`), {
    method: 'PUT',
    body: JSON.stringify({ soLuong }),
  }));
}

export async function removeServerCartItem(maSach: number): Promise<ServerCartSummary> {
  return mapSummary(await authRequest(apiUrl(`/api/gio-hang/items/${maSach}`), {
    method: 'DELETE',
  }));
}

export async function mergeGuestCart(
  items: CartMergeItem[],
  idempotencyKey: string,
): Promise<ServerCartMergeResponse> {
  return mapMergeResponse(await authRequest(apiUrl('/api/gio-hang/merge'), {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({ items }),
  }));
}
