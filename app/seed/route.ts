import bcrypt from 'bcryptjs';
import postgres from 'postgres';
import { invoices, customers, revenue, users } from '../lib/placeholder-data';

const connectionString = process.env.POSTGRES_URL;
function describeConnection(url: string | undefined) {
  if (!url) return { defined: false, note: '未读到 POSTGRES_URL，postgres 库会退回 localhost:5432' };
  try {
    const u = new URL(url);
    return {
      defined: true,
      host: u.hostname,
      port: u.port || '5432',
      database: u.pathname.replace(/^\//, ''),
      user: u.username,
      sslmode: u.searchParams.get('sslmode'),
    };
  } catch {
    return { defined: true, note: '格式不是合法 URL', preview: url.slice(0, 30) + '…' };
  }
}


const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

async function seedUsers() {
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    );
  `;

  const insertedUsers = await Promise.all(
    users.map(async (user) => {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      return sql`
        INSERT INTO users (id, name, email, password)
        VALUES (${user.id}, ${user.name}, ${user.email}, ${hashedPassword})
        ON CONFLICT (id) DO NOTHING;
      `;
    }),
  );

  return insertedUsers;
}

async function seedInvoices() {
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

  await sql`
    CREATE TABLE IF NOT EXISTS invoices (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      customer_id UUID NOT NULL,
      amount INT NOT NULL,
      status VARCHAR(255) NOT NULL,
      date DATE NOT NULL
    );
  `;

  const insertedInvoices = await Promise.all(
    invoices.map(
      (invoice) => sql`
        INSERT INTO invoices (customer_id, amount, status, date)
        VALUES (${invoice.customer_id}, ${invoice.amount}, ${invoice.status}, ${invoice.date})
        ON CONFLICT (id) DO NOTHING;
      `,
    ),
  );

  return insertedInvoices;
}

async function seedCustomers() {
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

  await sql`
    CREATE TABLE IF NOT EXISTS customers (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      image_url VARCHAR(255) NOT NULL
    );
  `;

  const insertedCustomers = await Promise.all(
    customers.map(
      (customer) => sql`
        INSERT INTO customers (id, name, email, image_url)
        VALUES (${customer.id}, ${customer.name}, ${customer.email}, ${customer.image_url})
        ON CONFLICT (id) DO NOTHING;
      `,
    ),
  );

  return insertedCustomers;
}

async function seedRevenue() {
  await sql`
    CREATE TABLE IF NOT EXISTS revenue (
      month VARCHAR(4) NOT NULL UNIQUE,
      revenue INT NOT NULL
    );
  `;

  const insertedRevenue = await Promise.all(
    revenue.map(
      (rev) => sql`
        INSERT INTO revenue (month, revenue)
        VALUES (${rev.month}, ${rev.revenue})
        ON CONFLICT (month) DO NOTHING;
      `,
    ),
  );

  return insertedRevenue;
}



export async function GET() {
  const target = describeConnection(connectionString);
  const envKeys = Object.keys(process.env)
    .filter((k) => /POSTGRES|DATABASE|PG|NEON/i.test(k))
    .sort();

  console.log('[seed] target:', target);
  console.log('[seed] db-related env keys:', envKeys);

  try {
    await sql.begin((sql) => [
      seedUsers(),
      seedCustomers(),
      seedInvoices(),
      seedRevenue(),
    ]);
    return Response.json({ message: 'Database seeded successfully', target, envKeys });
  } catch (error) {
    return Response.json(
      {
        target,
        envKeys,
        error: error instanceof Error
          ? { name: error.name, message: error.message, ...(error as any) }
          : error,
      },
      { status: 500 },
    );
  }
}


// export async function GET() {
//   try {
//     const result = await sql.begin((sql) => [
//       seedUsers(),
//       seedCustomers(),
//       seedInvoices(),
//       seedRevenue(),
//     ]);

//     return Response.json({ message: 'Database seeded successfully' });
//   } catch (error) {
//     return Response.json({ error }, { status: 500 });
  // }
// }
