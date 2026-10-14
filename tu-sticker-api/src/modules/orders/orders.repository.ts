import { Collection, Filter, ObjectId } from "mongodb";
import { getDb } from "../../config/database";
import { Order, OrderStatus } from "./orders.model";

export class OrdersRepository {
    private collection(): Collection<Order> {
        return getDb().collection<Order>("orders");
    }

    private async ensureIndexes(): Promise<void> {
        await this.collection().createIndex(
            { orderNumber: 1 },
            { unique: true, name: "orders_number_unique" }
        );
        await this.collection().createIndex(
            { userId: 1, createdAt: -1 },
            { name: "orders_user_created_at" }
        );
    }

    async create(data: Omit<Order, "_id">): Promise<Order> {
        await this.ensureIndexes();
        const result = await this.collection().insertOne(data);
        return { _id: result.insertedId, ...data };
    }

    async findById(id: ObjectId): Promise<Order | null> {
        return this.collection().findOne({ _id: id });
    }

    async findByUserId(userId: ObjectId): Promise<Order[]> {
        return this.collection().find({ userId }).sort({ createdAt: -1 }).toArray();
    }

    async findAll(filters: {
        status?: OrderStatus;
        nameTerms?: string[];
        createdFrom?: Date;
        createdBefore?: Date;
    } = {}): Promise<Order[]> {
        const filter: Filter<Order> = {};
        if (filters.status) {
            filter.status = filters.status;
        }

        const clauses: Filter<Order>[] = [];
        if (filters.createdFrom || filters.createdBefore) {
            clauses.push({
                createdAt: {
                    ...(filters.createdFrom ? { $gte: filters.createdFrom } : {}),
                    ...(filters.createdBefore ? { $lt: filters.createdBefore } : {}),
                },
            });
        }
        for (const term of filters.nameTerms ?? []) {
            const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const expression = new RegExp(escapedTerm, "i");
            clauses.push({
                $or: [
                    { "address.firstName": expression },
                    { "address.lastName": expression },
                ],
            });
        }
        if (clauses.length) {
            filter.$and = clauses;
        }

        return this.collection().find(filter).sort({ createdAt: -1 }).toArray();
    }

    async updateStatus(
        id: ObjectId,
        status: OrderStatus,
        paymentStatus: Order["paymentStatus"]
    ): Promise<Order | null> {
        const result = await this.collection().findOneAndUpdate(
            { _id: id },
            { $set: { status, paymentStatus, updatedAt: new Date() } },
            { returnDocument: "after" }
        );
        return result ?? null;
    }

    async updateAdmin(
        id: ObjectId,
        expectedUpdatedAt: Date,
        changes: Omit<Order, "_id" | "orderNumber" | "createdAt" | "updatedAt">
    ): Promise<Order | null> {
        const result = await this.collection().findOneAndUpdate(
            { _id: id, updatedAt: expectedUpdatedAt },
            { $set: { ...changes, updatedAt: new Date() } },
            { returnDocument: "after" }
        );
        return result ?? null;
    }
}
