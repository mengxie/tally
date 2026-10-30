/** Expected failures, each with an HTTP-agnostic status hint and a stable, documented code. */
export class AppError extends Error {
  constructor(
    readonly status: 400 | 404 | 409,
    readonly code: string,
    message: string,
    readonly errors: readonly { path: string; message: string }[] = [],
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends AppError {
  constructor(code: string, message: string) {
    super(404, code, message);
  }
}

export class ValidationError extends AppError {
  constructor(
    code: string,
    message: string,
    errors: readonly { path: string; message: string }[] = [],
  ) {
    super(400, code, message, errors);
  }
}

export class ConflictError extends AppError {
  constructor(code: string, message: string) {
    super(409, code, message);
  }
}
