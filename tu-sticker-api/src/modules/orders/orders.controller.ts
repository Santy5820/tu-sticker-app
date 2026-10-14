import { Request, Response } from "express";
import { BadRequestError, ForbiddenError, UnauthorizedError } from "../../shared/errors/AppError";
import { AuthRequest } from "../../shared/middlewares/auth.middleware";
import { OrderAdminFilters, OrderAdminUpdateInput, OrderCreateInput, OrderStatusInput } from "./orders.model";
import { OrdersService } from "./orders.service";

export class OrdersController {
    private readonly ordersService = new OrdersService();

    create = async (req: Request, res: Response): Promise<void> => {
        const user = this.getUser(req);
        const order = await this.ordersService.create(
            user.userId,
            req.body as OrderCreateInput
        );
        res.status(201).json(order);
    };

    findMine = async (req: Request, res: Response): Promise<void> => {
        const user = this.getUser(req);
        const orders = await this.ordersService.findMine(user.userId);
        res.status(200).json(orders);
    };

    findAll = async (req: Request, res: Response): Promise<void> => {
        const readFilter = (key: keyof OrderAdminFilters): string | undefined => {
            const value = req.query[key];
            if (value === undefined) {
                return undefined;
            }
            if (typeof value !== "string") {
                throw new BadRequestError(`El filtro '${key}' debe ser un único valor de texto`);
            }
            return value;
        };
        const filters: OrderAdminFilters = {
            status: readFilter("status"),
            name: readFilter("name"),
            month: readFilter("month"),
            from: readFilter("from"),
            to: readFilter("to"),
        };
        const orders = await this.ordersService.findAll(filters);
        res.status(200).json(orders);
    };

    findById = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
        const user = this.getUser(req);
        const isStaff = user.role !== "CUSTOMER";
        const order = await this.ordersService.findById(req.params.id, isStaff ? undefined : user.userId);
        res.status(200).json(order);
    };

    updateStatus = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
        const order = await this.ordersService.updateStatus(
            req.params.id,
            req.body as OrderStatusInput
        );
        res.status(200).json(order);
    };

    updateAdmin = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
        const user = this.getUser(req);
        const order = await this.ordersService.updateAdmin(
            req.params.id,
            req.body as OrderAdminUpdateInput,
            user.userId
        );
        res.status(200).json(order);
    };

    cancel = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
        const user = this.getUser(req);
        const isStaff = user.role !== "CUSTOMER";
        const order = await this.ordersService.cancel(req.params.id, user.userId, isStaff);
        res.status(200).json(order);
    };

    private getUser(req: Request) {
        const user = (req as AuthRequest).user;
        if (!user) {
            throw new UnauthorizedError("Debes autenticarte para gestionar pedidos");
        }
        if (!user.userId) {
            throw new ForbiddenError("El token no contiene un usuario válido");
        }
        return user;
    }
}
