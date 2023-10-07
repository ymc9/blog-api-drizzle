import {
    boolean,
    integer,
    pgEnum,
    pgTable,
    serial,
    uniqueIndex,
    varchar,
} from 'drizzle-orm/pg-core';

export const spaceUserRoleEnum = pgEnum('SpaceUserRole', ['MEMBER', 'ADMIN']);

export const users = pgTable(
    'users',
    {
        id: serial('id').primaryKey(),
        email: varchar('email', { length: 256 }).notNull(),
    },
    (users) => {
        return {
            emailIndex: uniqueIndex('email_idx').on(users.email),
        };
    }
);

export const spaces = pgTable(
    'spaces',
    {
        id: serial('id').primaryKey(),
        slug: varchar('slug', { length: 8 }).notNull(),
        name: varchar('name', { length: 256 }).notNull(),
        ownerId: integer('ownerId').references(() => users.id, {
            onDelete: 'cascade',
        }),
    },
    (spaces) => {
        return {
            slugIndex: uniqueIndex('slug_idx').on(spaces.slug),
        };
    }
);

export const spaceUsers = pgTable(
    'spaceUsers',
    {
        id: serial('id').primaryKey(),
        spaceId: integer('spaceId').references(() => spaces.id, {
            onDelete: 'cascade',
        }),
        userId: integer('userId').references(() => users.id, {
            onDelete: 'cascade',
        }),
        role: spaceUserRoleEnum('role').notNull().default('MEMBER'),
    },
    (spaceUsers) => {
        return {
            uniqueSpaceUser: uniqueIndex('space_user_idx').on(
                spaceUsers.spaceId,
                spaceUsers.userId
            ),
        };
    }
);

export const posts = pgTable('posts', {
    id: serial('id').primaryKey(),
    title: varchar('title', { length: 256 }).notNull(),
    published: boolean('published').default(false),
    spaceId: integer('spaceId').references(() => spaces.id, {
        onDelete: 'cascade',
    }),
    authorId: integer('authorId').references(() => users.id, {
        onDelete: 'cascade',
    }),
});
