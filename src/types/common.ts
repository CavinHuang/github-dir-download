export interface BaseResponse {
  success: boolean;
  error?: string;
}

export interface ApiResponse<T = any> extends BaseResponse {
  data?: T;
}

export type AsyncResult<T> = Promise<ApiResponse<T>>;

export interface PaginationInfo {
  page: number;
  per_page: number;
  total: number;
} 