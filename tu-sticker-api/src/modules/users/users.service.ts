import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import { BadRequestError, NotFoundError } from "../../shared/errors/AppError";
import { User, UserCreateInput, UserRole, UserUpdateInput } from "./users.model";
import { UsersRepository } from "./users.repository";
import { Customer } from "../customers/customers.model";
import { CustomersRepository } from "../customers/customers.repository";

export class UsersService {
    private readonly usersRepository = new UsersRepository();
    private readonly customersRepository = new CustomersRepository();

    async create(data: UserCreateInput): Promise<User> {
        const name = this.requireString(data.name, "name");
        const email = this.requireEmail(data.email);
        const password = this.requireString(data.password, "password");
        const role = this.requireRole(data.role);

        if (role === "CUSTOMER" && (!data.customerId || typeof data.customerId !== "string")) {
            throw new BadRequestError("Los usuarios con rol CUSTOMER deben incluir customerId");
        }
        if (role !== "CUSTOMER" && data.customerId) {
            throw new BadRequestError("Solo los usuarios con rol CUSTOMER pueden tener customerId");
        }

        const existingUser = await this.usersRepository.findByEmail(email);
        if (existingUser) {
            throw new BadRequestError("Ya existe un usuario con ese correo electrónico");
        }

        const customer = role === "CUSTOMER"
            ? await this.requireAvailableCustomer(this.toObjectId(data.customerId as string))
            : null;
        const hashedPassword = await bcrypt.hash(password, 10);
        const now = new Date();

        const user = await this.usersRepository.create({
            name,
            email,
            password: hashedPassword,
            role,
            customerId: customer?._id,
            isActive: data.isActive ?? true,
            createdAt: now,
            updatedAt: now,
        });
        if (customer?._id && user._id) {
            await this.customersRepository.update(customer._id, { userId: user._id });
        }
        return user;
    }

    async findAll(): Promise<User[]> {
        return this.usersRepository.findAll();
    }

    async findById(id: string): Promise<User> {
        const user = await this.usersRepository.findById(this.toObjectId(id));
        if (!user) {
            throw new NotFoundError("Usuario no encontrado");
        }
        return user;
    }

    async update(id: string, data: UserUpdateInput, actorId?: string): Promise<User> {
        const objectId = this.toObjectId(id);
        const currentUser = await this.usersRepository.findById(objectId);
        if (!currentUser) {
            throw new NotFoundError("Usuario no encontrado");
        }
        const isSelf = actorId ? objectId.equals(this.toObjectId(actorId)) : false;
        const changes: Partial<User> = {};
        const unsetFields: (keyof User)[] = [];

        if (data.name !== undefined) changes.name = this.requireString(data.name, "name");
        if (data.email !== undefined) {
            changes.email = this.requireEmail(data.email);
            const existingUser = await this.usersRepository.findByEmail(changes.email);
            if (existingUser && !existingUser._id?.equals(objectId)) {
                throw new BadRequestError("Ya existe un usuario con ese correo electrónico");
            }
        }
        if (data.password !== undefined) {
            changes.password = await bcrypt.hash(this.requireString(data.password, "password"), 10);
        }
        if (data.role !== undefined) changes.role = this.requireRole(data.role);
        const nextRole = changes.role ?? currentUser.role;
        if (nextRole === "CUSTOMER") {
            if (data.customerId !== undefined) {
                if (typeof data.customerId !== "string" || !data.customerId.trim()) {
                    throw new BadRequestError("Los usuarios con rol CUSTOMER deben incluir customerId");
                }
                changes.customerId = this.toObjectId(data.customerId);
            } else if (currentUser.customerId) {
                changes.customerId = currentUser.customerId;
            } else {
                throw new BadRequestError("Los usuarios con rol CUSTOMER deben incluir customerId");
            }
        } else if (data.customerId !== undefined) {
            throw new BadRequestError("Solo los usuarios con rol CUSTOMER pueden tener customerId");
        } else if (currentUser.customerId) {
            unsetFields.push("customerId");
        }
        if (data.isActive !== undefined) {
            if (typeof data.isActive !== "boolean") {
                throw new BadRequestError("El campo 'isActive' debe ser booleano");
            }
            changes.isActive = data.isActive;
        }

        if (isSelf && changes.role !== undefined && changes.role !== "ADMIN") {
            throw new BadRequestError("No puedes cambiar tu propio rol de administrador");
        }
        if (isSelf && changes.isActive === false) {
            throw new BadRequestError("No puedes desactivar tu propia cuenta");
        }
        if (Object.keys(changes).length === 0 && unsetFields.length === 0) {
            throw new BadRequestError("No se enviaron campos para actualizar");
        }

        const customerId = changes.customerId ?? currentUser.customerId;
        const customer = nextRole === "CUSTOMER" && customerId
            ? await this.requireAvailableCustomer(customerId, objectId)
            : null;
        const updatedUser = await this.usersRepository.update(objectId, changes, unsetFields);
        if (!updatedUser) {
            throw new NotFoundError("Usuario no encontrado");
        }
        if (currentUser.customerId && (
            nextRole !== "CUSTOMER" ||
            !customerId ||
            !currentUser.customerId.equals(customerId)
        )) {
            await this.customersRepository.clearUserAssociation(currentUser.customerId);
        }
        if (customer?._id && updatedUser._id) {
            await this.customersRepository.update(customer._id, { userId: updatedUser._id });
        }
        return updatedUser;
    }

    async delete(id: string, actorId?: string): Promise<void> {
        const objectId = this.toObjectId(id);
        if (actorId && objectId.equals(this.toObjectId(actorId))) {
            throw new BadRequestError("No puedes desactivar tu propia cuenta");
        }
        const user = await this.usersRepository.findById(objectId);
        if (!user) {
            throw new NotFoundError("Usuario no encontrado");
        }
        if (!user.isActive) {
            throw new BadRequestError("El usuario ya está inactivo");
        }

        const deleted = await this.usersRepository.delete(objectId);
        if (!deleted) {
            throw new NotFoundError("Usuario no encontrado");
        }
    }

    private async requireAvailableCustomer(id: ObjectId, userId?: ObjectId): Promise<Customer> {
        const customer = await this.customersRepository.findById(id);
        if (!customer || !customer.isActive) {
            throw new BadRequestError("El cliente asociado no existe o está inactivo");
        }
        if (customer.userId && (!userId || !customer.userId.equals(userId))) {
            throw new BadRequestError("El cliente seleccionado ya está asociado a otro usuario");
        }
        return customer;
    }

    private requireString(value: unknown, field: string): string {
        if (typeof value !== "string" || value.trim() === "") {
            throw new BadRequestError(`El campo '${field}' es obligatorio y debe ser texto no vacío`);
        }
        return value.trim();
    }

    private requireEmail(value: unknown): string {
        const email = this.requireString(value, "email");
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!regex.test(email)) {
            throw new BadRequestError("El correo electrónico no tiene un formato válido");
        }
        return email.toLowerCase();
    }

    private requireRole(value: unknown): UserRole {
        const roles: UserRole[] = ["CUSTOMER", "ADMIN", "SALES", "DESIGNER", "PRODUCTION"];
        if (typeof value !== "string" || !roles.includes(value as UserRole)) {
            throw new BadRequestError("El rol no es válido");
        }
        return value as UserRole;
    }

    private toObjectId(id: string): ObjectId {
        if (!ObjectId.isValid(id)) {
            throw new BadRequestError(`Identificador inválido: ${id}`);
        }
        return new ObjectId(id);
    }
}
