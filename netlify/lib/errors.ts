export class ServiceError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export class NotFoundError extends ServiceError {
  constructor(message = "Not found") {
    super(message, 404);
  }
}

export class ValidationError extends ServiceError {
  constructor(message: string) {
    super(message, 400);
  }
}

export function errorResponse(err: unknown, scope: string): Response {
  if (err instanceof ServiceError) {
    return Response.json({ error: err.message }, { status: err.status });
  }
  console.error(`${scope} error:`, err);
  return Response.json(
    { error: err instanceof Error ? err.message : "Internal server error" },
    { status: 500 },
  );
}
