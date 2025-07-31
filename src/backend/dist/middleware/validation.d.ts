import { Request, Response, NextFunction } from 'express';
export declare const validateRequest: (req: Request, res: Response, next: NextFunction) => void;
export declare const validateObjectId: (req: Request, res: Response, next: NextFunction) => void;
export declare const validateRequired: (fields: string[]) => (req: Request, res: Response, next: NextFunction) => void;
export declare const validateEmail: (req: Request, res: Response, next: NextFunction) => void;
export declare const validateDate: (field: string) => (req: Request, res: Response, next: NextFunction) => void;
export declare const validateRange: (field: string, min?: number, max?: number) => (req: Request, res: Response, next: NextFunction) => void;
export declare const validatePagination: (req: Request, res: Response, next: NextFunction) => void;
export declare const sanitizeInput: (req: Request, _res: Response, next: NextFunction) => void;
//# sourceMappingURL=validation.d.ts.map