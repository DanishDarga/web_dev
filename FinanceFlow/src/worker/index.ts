import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { getCookie, setCookie } from "hono/cookie";
import {
  exchangeCodeForSessionToken,
  getOAuthRedirectUrl,
  authMiddleware,
  deleteSession,
  MOCHA_SESSION_TOKEN_COOKIE_NAME,
} from "@getmocha/users-service/backend";
import {
  CreateCategorySchema,
  CreateTransactionSchema,
  CreateBudgetSchema,
} from "@/shared/types";

const app = new Hono<{ Bindings: Env }>();

// Auth endpoints
app.get('/api/oauth/google/redirect_url', async (c) => {
  const redirectUrl = await getOAuthRedirectUrl('google', {
    apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
    apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
  });

  return c.json({ redirectUrl }, 200);
});

app.post("/api/sessions", async (c) => {
  const body = await c.req.json();

  if (!body.code) {
    return c.json({ error: "No authorization code provided" }, 400);
  }

  const sessionToken = await exchangeCodeForSessionToken(body.code, {
    apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
    apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
  });

  setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: true,
    maxAge: 60 * 24 * 60 * 60, // 60 days
  });

  return c.json({ success: true }, 200);
});

app.get("/api/users/me", authMiddleware, async (c) => {
  return c.json(c.get("user"));
});

app.get('/api/logout', async (c) => {
  const sessionToken = getCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME);

  if (typeof sessionToken === 'string') {
    await deleteSession(sessionToken, {
      apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
      apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
    });
  }

  setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, '', {
    httpOnly: true,
    path: '/',
    sameSite: 'none',
    secure: true,
    maxAge: 0,
  });

  return c.json({ success: true }, 200);
});

// Dashboard endpoint
app.get('/api/dashboard', authMiddleware, async (c) => {
  const user = c.get('user')!;
  
  // Get total income and expenses for current month
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  
  const incomeResult = await c.env.DB.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM transactions 
    WHERE user_id = ? AND is_income = 1 AND strftime('%Y-%m', transaction_date) = ?
  `).bind(user.id, currentMonth).first();
  
  const expensesResult = await c.env.DB.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM transactions 
    WHERE user_id = ? AND is_income = 0 AND strftime('%Y-%m', transaction_date) = ?
  `).bind(user.id, currentMonth).first();
  
  const totalIncome = Number(incomeResult?.total) || 0;
  const totalExpenses = Number(expensesResult?.total) || 0;
  const balance = totalIncome - totalExpenses;
  
  // Get recent transactions
  const recentTransactions = await c.env.DB.prepare(`
    SELECT t.*, c.name as category_name, c.color as category_color
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = ?
    ORDER BY t.transaction_date DESC, t.created_at DESC
    LIMIT 10
  `).bind(user.id).all();
  
  // Get category spending for current month
  const categorySpending = await c.env.DB.prepare(`
    SELECT c.name as category, COALESCE(SUM(t.amount), 0) as amount, c.color
    FROM categories c
    LEFT JOIN transactions t ON c.id = t.category_id AND t.user_id = ? AND t.is_income = 0 AND strftime('%Y-%m', t.transaction_date) = ?
    WHERE c.user_id = ? AND c.is_income = 0
    GROUP BY c.id, c.name, c.color
    HAVING amount > 0
    ORDER BY amount DESC
  `).bind(user.id, currentMonth, user.id).all();
  
  // Get monthly trend for last 6 months
  const monthlyTrend = await c.env.DB.prepare(`
    SELECT 
      strftime('%Y-%m', transaction_date) as month,
      COALESCE(SUM(CASE WHEN is_income = 1 THEN amount ELSE 0 END), 0) as income,
      COALESCE(SUM(CASE WHEN is_income = 0 THEN amount ELSE 0 END), 0) as expenses
    FROM transactions
    WHERE user_id = ? AND transaction_date >= date('now', '-6 months')
    GROUP BY strftime('%Y-%m', transaction_date)
    ORDER BY month
  `).bind(user.id).all();
  
  const dashboardData = {
    totalIncome,
    totalExpenses,
    balance,
    recentTransactions: recentTransactions.results || [],
    categorySpending: categorySpending.results || [],
    monthlyTrend: monthlyTrend.results || [],
  };
  
  return c.json(dashboardData);
});

// Categories endpoints
app.get('/api/categories', authMiddleware, async (c) => {
  const user = c.get('user')!;
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM categories WHERE user_id = ? ORDER BY name'
  ).bind(user.id).all();
  
  return c.json(results);
});

app.post('/api/categories', authMiddleware, zValidator('json', CreateCategorySchema), async (c) => {
  const user = c.get('user')!;
  const data = c.req.valid('json');
  
  const { meta } = await c.env.DB.prepare(`
    INSERT INTO categories (name, color, icon, is_income, user_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).bind(data.name, data.color, data.icon || null, data.is_income, user.id).run();
  
  const category = await c.env.DB.prepare(
    'SELECT * FROM categories WHERE id = ?'
  ).bind(meta.last_row_id).first();
  
  return c.json(category, 201);
});

// Transactions endpoints
app.get('/api/transactions', authMiddleware, async (c) => {
  const user = c.get('user')!;
  const { results } = await c.env.DB.prepare(`
    SELECT t.*, c.name as category_name, c.color as category_color
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = ?
    ORDER BY t.transaction_date DESC, t.created_at DESC
  `).bind(user.id).all();
  
  return c.json(results);
});

app.post('/api/transactions', authMiddleware, zValidator('json', CreateTransactionSchema), async (c) => {
  const user = c.get('user')!;
  const data = c.req.valid('json');
  
  const { meta } = await c.env.DB.prepare(`
    INSERT INTO transactions (amount, description, category_id, is_income, transaction_date, user_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).bind(data.amount, data.description, data.category_id || null, data.is_income, data.transaction_date, user.id).run();
  
  const transaction = await c.env.DB.prepare(`
    SELECT t.*, c.name as category_name, c.color as category_color
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.id = ?
  `).bind(meta.last_row_id).first();
  
  return c.json(transaction, 201);
});

app.delete('/api/transactions/:id', authMiddleware, async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id');
  
  const result = await c.env.DB.prepare(
    'DELETE FROM transactions WHERE id = ? AND user_id = ?'
  ).bind(id, user.id).run();
  
  if (result.meta.changes === 0) {
    return c.json({ error: 'Transaction not found' }, 404);
  }
  
  return c.json({ success: true });
});

// Budgets endpoints
app.get('/api/budgets', authMiddleware, async (c) => {
  const user = c.get('user')!;
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM budgets WHERE user_id = ? ORDER BY created_at DESC'
  ).bind(user.id).all();
  
  return c.json(results);
});

app.post('/api/budgets', authMiddleware, zValidator('json', CreateBudgetSchema), async (c) => {
  const user = c.get('user')!;
  const data = c.req.valid('json');
  
  const { meta } = await c.env.DB.prepare(`
    INSERT INTO budgets (name, amount, period, start_date, end_date, user_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).bind(data.name, data.amount, data.period, data.start_date, data.end_date || null, user.id).run();
  
  const budget = await c.env.DB.prepare(
    'SELECT * FROM budgets WHERE id = ?'
  ).bind(meta.last_row_id).first();
  
  return c.json(budget, 201);
});

export default app;
