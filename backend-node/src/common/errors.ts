export class ApiException extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }

  static badRequest(message: string) {
    return new ApiException(400, message);
  }

  static unauthorized(message: string) {
    return new ApiException(401, message);
  }

  static forbidden(message: string) {
    return new ApiException(403, message);
  }

  static notFound(message: string) {
    return new ApiException(404, message);
  }

  static conflict(message: string) {
    return new ApiException(409, message);
  }

  static tooManyRequests(message: string) {
    return new ApiException(429, message);
  }
}
