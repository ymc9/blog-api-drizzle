import * as dotenv from 'dotenv';
import { and, eq, or } from 'drizzle-orm';
import { PostgresJsDatabase, drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { createInsertSchema } from 'drizzle-zod';
import express from 'express';
import postgres from 'postgres';
import { z } from 'zod';
import * as schema from './db/schema';
import { posts, spaceUsers, spaces, users } from './db/schema';
require('express-async-errors');

dotenv.config();

if (!process.env.DATABASE_URL) {
    console.error('Missing DATABASE_URL environment variable');
    process.exit(1);
}

const DATABASE_URL = process.env.DATABASE_URL!;

main();

async function main() {
    // for migrations
    const migrationClient = postgres(DATABASE_URL, { max: 1 });
    await migrate(drizzle(migrationClient), {
        migrationsFolder: './migrations',
    });

    // for query purposes
    const queryClient = postgres(DATABASE_URL);
    const db = drizzle(queryClient, { schema, logger: true });

    // express app and routes
    const app = express();

    app.use(express.json());

    // auth middleware
    app.use(async (req, res, next) => {
        const uid = req.headers['x-user-id'];
        if (typeof uid === 'string') {
            req.uid = parseInt(uid);
            const user = await db.query.users.findFirst({
                where: eq(users.id, req.uid),
            });
            req.user = user;
        } else {
            if (req.path !== '/user' || req.method !== 'POST') {
                res.status(401).send({ error: 'Unauthorized' });
                return;
            }
        }
        next();
    });

    // user routes
    const createUser = createInsertSchema(users);
    app.post('/user', async (req, res) => {
        const data = createUser.parse(req.body);
        const r = await db.insert(users).values(data).returning();
        res.send(r[0]);
    });

    // space routes
    const createSpace = createInsertSchema(spaces);
    app.post('/space', async (req, res) => {
        const data = createSpace.parse(req.body);
        data.ownerId = req.uid;
        const r = await db.insert(spaces).values(data).returning();
        res.send(r[0]);
    });

    // space member management

    async function requireSpaceAdmin(
        uid: number,
        slug: string,
        db: PostgresJsDatabase<typeof schema>
    ) {
        const result = await db
            .select()
            .from(spaces)
            .where(eq(spaces.slug, slug))
            .leftJoin(spaceUsers, eq(spaceUsers.spaceId, spaces.id))
            .where(
                or(
                    eq(spaces.ownerId, uid),
                    and(
                        eq(spaceUsers.userId, uid),
                        eq(spaceUsers.role, 'ADMIN')
                    )
                )
            );

        if (result.length === 0) {
            return undefined;
        }

        return result[0].spaces;
    }

    const createSpaceUser = createInsertSchema(spaceUsers);
    app.post('/space/:slug/member', async (req, res) => {
        const space = await requireSpaceAdmin(req.uid!, req.params.slug, db);
        if (!space) {
            res.status(403).send({ error: 'Forbidden' });
            return;
        }

        const data = createSpaceUser.parse(req.body);
        // only allow adding users to the current space
        data.spaceId = space.id;
        const r = await db.insert(spaceUsers).values(data).returning();
        res.send(r[0]);
    });

    function requireSpace(slug: string) {
        return db.query.spaces.findFirst({
            where: eq(spaces.slug, slug),
        });
    }

    // post routes

    const createPost = createInsertSchema(posts);
    app.post('/space/:slug/post', async (req, res) => {
        const space = await requireSpace(req.params.slug);
        if (!space) {
            res.status(404).send({ error: 'Not found' });
            return;
        }

        const data: z.infer<typeof createPost> = createPost
            .pick({ title: true, published: true })
            .parse(req.body);
        data.spaceId = space.id;
        data.authorId = req.uid;
        const r = await db.insert(posts).values(data).returning();
        res.send(r[0]);
    });

    app.get('/space/:slug/post', async (req, res) => {
        const space = await requireSpace(req.params.slug);
        if (!space) {
            res.status(404).send({ error: 'Not found' });
            return;
        }

        const result = await db
            .selectDistinctOn([posts.id], {
                id: posts.id,
                title: posts.title,
                published: posts.published,
                author: { id: users.id, email: users.email },
            })
            .from(posts)
            .where(eq(posts.spaceId, space.id))
            .leftJoin(users, eq(posts.authorId, users.id))
            .leftJoin(spaces, eq(posts.spaceId, spaces.id))
            .leftJoin(
                spaceUsers,
                and(
                    eq(spaceUsers.spaceId, spaces.id),
                    eq(spaceUsers.userId, req.uid!)
                )
            )
            .where(
                or(
                    // 1. published
                    eq(posts.published, true),
                    // 2. authored by the current user
                    eq(posts.authorId, req.uid!),
                    // 3. belongs to space owned by the current user
                    eq(spaces.ownerId, req.uid!),
                    // 4. belongs to space where the current user is an admin
                    eq(spaceUsers.role, 'ADMIN')
                )
            );

        res.send(result);
    });

    app.listen(3000, () => {
        console.log('Server running on port 3000');
    });
}
