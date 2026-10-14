import { Collection, ObjectId } from "mongodb";
import { getDb } from "../../config/database";
import { User } from "./users.model";

export class UsersRepository {
    private collection(): Collection<User> {
        return getDb().collection<User>("users");
    }

    async create(data: Omit<User, "_id">): Promise<User> {
        const now = new Date();
        const user: User = {
            ...data,
            createdAt: data.createdAt ?? now,
            updatedAt: data.updatedAt ?? now,
        };

        const result = await this.collection().insertOne(user);
        return { ...user, _id: result.insertedId };
    }

    async findAll(): Promise<User[]> {
        return this.collection().find().sort({ createdAt: -1 }).toArray();
    }

    async findById(id: ObjectId): Promise<User | null> {
        return this.collection().findOne({ _id: id });
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.collection().findOne({ email: email.toLowerCase() });
    }

    async update(id: ObjectId, changes: Partial<User>, unsetFields: (keyof User)[] = []): Promise<User | null> {
        const unset: Record<string, ""> = {};
        unsetFields.forEach((field) => {
            unset[field] = "";
        });
        const result = await this.collection().findOneAndUpdate(
            { _id: id },
            {
                $set: { ...changes, updatedAt: new Date() },
                ...(unsetFields.length ? { $unset: unset } : {}),
            },
            { returnDocument: "after" }
        );
        return result ?? null;
    }

    async delete(id: ObjectId): Promise<boolean> {
        const result = await this.collection().updateOne(
            { _id: id },
            { $set: { isActive: false, updatedAt: new Date() } }
        );
        return result.matchedCount === 1;
    }
}
