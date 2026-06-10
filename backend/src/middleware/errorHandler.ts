import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Maps PostgreSQL error codes to user-friendly 4xx responses.
const PG_ERROR_MAP: Record<string, { status: number; message: string }> = {
  '23502': { status: 400, message: 'Missing required field'                },  // not_null_violation
  '23503': { status: 400, message: 'Referenced record does not exist'      },  // foreign_key_violation
  '23505': { status: 409, message: 'Record already exists'                 },  // unique_violation
  '23514': { status: 400, message: 'Invalid value for field'               },  // check_violation
  '22P02': { status: 400, message: 'Invalid input format'                  },  // invalid_text_representation
  '22003': { status: 400, message: 'Numeric value out of range'            },  // numeric_value_out_of_range
  '42703': { status: 400, message: 'Unknown field in request'              },  // undefined_column
};

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Known application errors → pass through as-is
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ success: false, error: err.message });
    return;
  }

  // Malformed JSON body (thrown by Express body-parser)
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ success: false, error: 'Invalid JSON in request body' });
    return;
  }

  // PostgreSQL driver errors
  const pgCode = (err as NodeJS.ErrnoException).code;
  if (pgCode && pgCode in PG_ERROR_MAP) {
    const mapped = PG_ERROR_MAP[pgCode];
    res.status(mapped.status).json({ success: false, error: mapped.message });
    return;
  }

  console.error('[error]', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}

// Middleware: validates that req.params.id is a finite positive integer.
// Attach to any route that uses :id to get clean 400s instead of 500s.
export function validateId(req: Request, res: Response, next: NextFunction): void {
  const id = Number(req.params.id);
  // Guard against NaN, floats, negatives, and PostgreSQL INTEGER overflow (max 2^31-1)
  if (!Number.isInteger(id) || id <= 0 || id > 2_147_483_647) {
    res.status(400).json({ success: false, error: `Invalid ID: '${req.params.id}'` });
    return;
  }
  next();
}
