import { Request, Response } from "express";
import { ProductsService } from "./products.service";
import { AuthRequest } from "../../shared/middlewares/auth.middleware";
import { UnauthorizedError } from "../../shared/errors/AppError";
import type { UserRole } from "../auth/auth.model";
import { readFile, unlink } from "fs/promises";
import { BadRequestError } from "../../shared/errors/AppError";

const isValidImage = (mimeType: string, data: Buffer): boolean => {
    switch (mimeType) {
        case "image/jpeg":
            return data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
        case "image/png":
            return data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
        case "image/webp":
            return data.length >= 12 && data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP";
        case "image/gif":
            return data.toString("ascii", 0, 6) === "GIF87a" || data.toString("ascii", 0, 6) === "GIF89a";
        default:
            return false;
    }
};

export class ProductsController {
    private readonly productsService = new ProductsService();

    create = async (req: Request, res: Response): Promise<void> => {
        const product = await this.productsService.create(req.body, this.getActorRole(req));
        res.status(201).json(product);
    };

    findAll = async (_req: Request, res: Response): Promise<void> => {
        const products = await this.productsService.findAll();
        res.status(200).json(products);
    };

    findById = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
        const product = await this.productsService.findById(req.params.id);
        res.status(200).json(product);
    };

    findBySlug = async (req: Request<{ slug: string }>, res: Response): Promise<void> => {
        const product = await this.productsService.findBySlug(req.params.slug);
        res.status(200).json(product);
    };

    uploadImages = async (req: Request, res: Response): Promise<void> => {
        const files = (req.files ?? []) as Express.Multer.File[];
        try {
            for (const file of files) {
                const content = await readFile(file.path);
                if (!isValidImage(file.mimetype, content)) {
                    throw new BadRequestError(`El archivo '${file.originalname}' no es una imagen válida`);
                }
            }
        } catch (error) {
            const cleanupResults = await Promise.allSettled(files.map((file) => unlink(file.path)));
            cleanupResults.forEach((result) => {
                if (result.status === "rejected") {
                    console.error("No se pudo limpiar una imagen de producto inválida:", result.reason);
                }
            });
            throw error;
        }

        const origin = `${req.protocol}://${req.get("host")}`;
        res.status(201).json({
            images: files.map((file) => `${origin}/uploads/products/${file.filename}`),
        });
    };

    findByCategory = async (req: Request<{ category: string }>, res: Response): Promise<void> => {
        const products = await this.productsService.findByCategory(req.params.category);
        res.status(200).json(products);
    };

    update = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
        const product = await this.productsService.update(req.params.id, req.body, this.getActorRole(req));
        res.status(200).json(product);
    };

    delete = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
        await this.productsService.delete(req.params.id);
        res.status(204).send();
    };

    private getActorRole(req: Request): UserRole {
        const role = (req as AuthRequest).user?.role;
        if (!role) {
            throw new UnauthorizedError("Debes autenticarte para realizar esta operación");
        }
        return role;
    }
}
