import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './db/schema';
import { spaces, users } from './db/schema';

dotenv.config();

if (!process.env.DATABASE_URL) {
    console.error('Missing DATABASE_URL environment variable');
    process.exit(1);
}

main();

async function post(endpoint: string, data: any, uid?: number) {
    const baseUrl = 'http://localhost:3000';
    const r = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
            'Content-Type': 'application/json',
            ...(uid ? { 'x-user-id': uid.toString() } : {}),
        },
    });
    if (!r.ok) {
        console.error(await r.text());
        throw new Error('Request failed');
    }
    return r.json();
}

async function get(endpoint: string, uid?: number) {
    const baseUrl = 'http://localhost:3000';
    const r = await fetch(`${baseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
            ...(uid ? { 'x-user-id': uid.toString() } : {}),
        },
    });
    if (!r.ok) {
        console.error(await r.text());
        throw new Error('Request failed');
    }
    return r.json();
}

async function main() {
    const DATABASE_URL = process.env.DATABASE_URL!;

    // for query purposes
    const queryClient = postgres(DATABASE_URL);
    const db = drizzle(queryClient, { schema });

    await db.delete(spaces);
    await db.delete(users);
    console.log('Database cleaned up');

    const admin = (
        await db
            .insert(users)
            .values({ email: 'admin@zenstack.dev' })
            .returning()
    )[0];
    console.log('admin created:', admin);

    const space1 = (
        await db
            .insert(spaces)
            .values({ name: 'Space 1', slug: 'space1', ownerId: admin.id })
            .returning()
    )[0];
    console.log('space1 created:', space1);

    const user1 = await post('/user', { email: 'user1@zenstack.dev' });
    console.log('user1 created:', user1);

    const member1 = await post(
        `/space/${space1.slug}/member`,
        {
            userId: user1.id,
            spaceId: space1.id,
            role: 'ADMIN',
        },
        admin.id
    );
    console.log('user1 space membership created:', member1);

    const user2 = await post('/user', { email: 'user2@zenstack.dev' });
    console.log('user2 created:', user2);

    const member2 = await post(
        `/space/${space1.slug}/member`,
        { userId: user2.id, spaceId: space1.id },
        admin.id
    );
    console.log('user2 space membership created:', member2);

    const post1 = await post(
        `/space/${space1.slug}/post`,
        {
            title: 'Post1',
        },
        admin.id
    );
    console.log('post1 created:', post1);

    const post2 = await post(
        `/space/${space1.slug}/post`,
        {
            title: 'Post2',
        },
        user1.id
    );
    console.log('post2 created:', post2);

    const post3 = await post(
        `/space/${space1.slug}/post`,
        {
            title: 'Post3',
            published: true,
        },
        user1.id
    );
    console.log('post3 created:', post3);

    const adminSeesPosts = await get(`/space/${space1.slug}/post`, admin.id);
    console.log('admin sees posts:', adminSeesPosts);

    const user1SeesPosts = await get(`/space/${space1.slug}/post`, user1.id);
    console.log('user1 sees posts:', user1SeesPosts);

    const user2SeesPosts = await get(`/space/${space1.slug}/post`, user2.id);
    console.log('user2 sees posts:', user2SeesPosts);

    await queryClient.end();
}
