import z from "zod";

// Categories
export const CategorySchema = z.object({
  id: z.number(),
  name: z.string(),
  color: z.string(),
  icon: z.string().optional(),
  is_income: z.boolean(),
  user_id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const CreateCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  color: z.string().min(1, "Color is required"),
  icon: z.string().optional(),
  is_income: z.boolean().default(false),
});

export type Category = z.infer<typeof CategorySchema>;
export type CreateCategory = z.infer<typeof CreateCategorySchema>;

// Transactions
export const TransactionSchema = z.object({
  id: z.number(),
  amount: z.number(),
  description: z.string(),
  category_id: z.number().optional(),
  is_income: z.boolean(),
  transaction_date: z.string(),
  user_id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const CreateTransactionSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  description: z.string().min(1, "Description is required"),
  category_id: z.number().optional(),
  is_income: z.boolean().default(false),
  transaction_date: z.string().min(1, "Date is required"),
});

export type Transaction = z.infer<typeof TransactionSchema>;
export type CreateTransaction = z.infer<typeof CreateTransactionSchema>;

// Budgets
export const BudgetSchema = z.object({
  id: z.number(),
  name: z.string(),
  amount: z.number(),
  period: z.enum(['monthly', 'weekly', 'yearly']),
  start_date: z.string(),
  end_date: z.string().optional(),
  is_active: z.boolean(),
  user_id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const CreateBudgetSchema = z.object({
  name: z.string().min(1, "Budget name is required"),
  amount: z.number().positive("Amount must be positive"),
  period: z.enum(['monthly', 'weekly', 'yearly']),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().optional(),
});

export type Budget = z.infer<typeof BudgetSchema>;
export type CreateBudget = z.infer<typeof CreateBudgetSchema>;

// Budget Categories
export const BudgetCategorySchema = z.object({
  id: z.number(),
  budget_id: z.number(),
  category_id: z.number(),
  allocated_amount: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type BudgetCategory = z.infer<typeof BudgetCategorySchema>;

// Dashboard Data
export const DashboardDataSchema = z.object({
  totalIncome: z.number(),
  totalExpenses: z.number(),
  balance: z.number(),
  recentTransactions: z.array(TransactionSchema),
  categorySpending: z.array(z.object({
    category: z.string(),
    amount: z.number(),
    color: z.string(),
  })),
  monthlyTrend: z.array(z.object({
    month: z.string(),
    income: z.number(),
    expenses: z.number(),
  })),
});

export type DashboardData = z.infer<typeof DashboardDataSchema>;
