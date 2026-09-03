export class AppError extends Error {
  constructor(
    message: string,
    public readonly code = 'UNEXPECTED_ERROR',
    public readonly status?: number,
    public readonly fields: Record<string, string[]> = {},
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

