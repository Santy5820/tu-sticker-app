import { randomUUID } from "crypto";
import { mkdir } from "fs";
import { unlink } from "fs/promises";
import { extname, resolve } from "path";
import multer, { FileFilterCallback } from "multer";
import { NextFunction, Request, Response } from "express";
import { BadRequestError } from "../../shared/errors/AppError";

export const productImageUploadDirectory = resolve(
    process.env.PRODUCT_UPLOAD_DIRECTORY || resolve(process.cwd(), "uploads", "products")
);

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const extensionByMimeType: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
};

const upload = multer({
    storage: multer.diskStorage({
        destination: (_req, _file, callback) => {
            mkdir(productImageUploadDirectory, { recursive: true }, (error) => {
                callback(error, productImageUploadDirectory);
            });
        },
        filename: (_req, file, callback) => {
            const extension = extensionByMimeType[file.mimetype];
            callback(null, `${randomUUID()}${extension ?? extname(file.originalname).toLowerCase()}`);
        },
    }),
    limits: {
        fileSize: 8 * 1024 * 1024,
        files: 8,
    },
    fileFilter: (_req, file, callback: FileFilterCallback) => {
        if (!allowedMimeTypes.has(file.mimetype)) {
            callback(new BadRequestError("Solo se permiten imágenes JPG, PNG, WEBP o GIF"));
            return;
        }
        callback(null, true);
    },
});

export const receiveProductImages = (req: Request, res: Response, next: NextFunction): void => {
    upload.array("images", 8)(req, res, async (error: unknown) => {
        if (error) {
            const files = (req.files ?? []) as Express.Multer.File[];
            const cleanupResults = await Promise.allSettled(files.map((file) => unlink(file.path)));
            cleanupResults.forEach((result) => {
                if (result.status === "rejected") {
                    console.error("No se pudo limpiar una carga de imágenes incompleta:", result.reason);
                }
            });
        }
        if (error instanceof multer.MulterError) {
            next(new BadRequestError(error.code === "LIMIT_FILE_SIZE"
                ? "Cada imagen debe pesar máximo 8 MB"
                : error.code === "LIMIT_FILE_COUNT" || error.code === "LIMIT_UNEXPECTED_FILE"
                    ? "Puedes cargar hasta 8 imágenes por solicitud"
                    : error.message));
            return;
        }
        next(error);
    });
};
