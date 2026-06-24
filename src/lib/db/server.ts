import { Pool, type QueryResultRow } from "pg";

type FilterOperator = "=" | ">=" | "<";
type Filter = {
  column: string;
  operator: FilterOperator;
  value: unknown;
};

type Order = {
  column: string;
  ascending: boolean;
};

type QueryResponse<T = any> = {
  data: T | null;
  error: { message: string } | null;
  count?: number | null;
};

let pool: Pool | null = null;

export function hasDatabaseConfig() {
  return Boolean(getDatabaseUrl());
}

export function createServiceDatabaseClient() {
  return {
    from(table: string) {
      return new CockroachQueryBuilder(table);
    }
  };
}

function getPool() {
  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    throw new Error("Missing DATABASE_URL or COCKROACH_DATABASE_URL.");
  }

  pool ??= new Pool({
    connectionString,
    ssl: shouldUseSsl(connectionString) ? { rejectUnauthorized: false } : undefined
  });

  return pool;
}

function getDatabaseUrl() {
  return process.env.COCKROACH_DATABASE_URL || process.env.DATABASE_URL || "";
}

function shouldUseSsl(connectionString: string) {
  return connectionString.includes("sslmode=require") || connectionString.includes("cockroachlabs.cloud");
}

class CockroachQueryBuilder<T = any> implements PromiseLike<QueryResponse<T[]>> {
  private action: "select" | "insert" | "upsert" | "update" | null = null;
  private columns = "*";
  private filters: Filter[] = [];
  private orders: Order[] = [];
  private payload: unknown;
  private conflictColumns: string[] = [];
  private returnRows = false;
  private maybeSingleMode = false;
  private singleMode = false;
  private head = false;
  private countMode: "exact" | null = null;

  constructor(private readonly table: string) {}

  select(columns = "*", options?: { count?: "exact"; head?: boolean }) {
    this.action = this.action ?? "select";
    this.columns = columns;
    this.head = options?.head ?? false;
    this.countMode = options?.count ?? null;
    if (this.action === "insert" || this.action === "upsert") this.returnRows = true;
    return this;
  }

  insert(payload: unknown) {
    this.action = "insert";
    this.payload = payload;
    return this;
  }

  upsert(payload: unknown, options?: { onConflict?: string }) {
    this.action = "upsert";
    this.payload = payload;
    this.conflictColumns = options?.onConflict?.split(",").map((column) => column.trim()).filter(Boolean) ?? [];
    return this;
  }

  update(payload: unknown) {
    this.action = "update";
    this.payload = payload;
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, operator: "=", value });
    return this;
  }

  gte(column: string, value: unknown) {
    this.filters.push({ column, operator: ">=", value });
    return this;
  }

  lt(column: string, value: unknown) {
    this.filters.push({ column, operator: "<", value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orders.push({ column, ascending: options?.ascending ?? true });
    return this;
  }

  maybeSingle(): Promise<QueryResponse<T | null>> {
    this.maybeSingleMode = true;
    return this.executeSingle(false);
  }

  single(): Promise<QueryResponse<T>> {
    this.singleMode = true;
    return this.executeSingle(true);
  }

  then<TResult1 = QueryResponse<T[]>, TResult2 = never>(
    onfulfilled?: ((value: QueryResponse<T[]>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async executeSingle(required: boolean) {
    const response = await this.execute();
    if (response.error) return { ...response, data: null };
    const rows = (response.data ?? []) as T[];
    if (!rows.length && required) {
      return { data: null as T, error: { message: "No rows returned." }, count: response.count };
    }
    if (rows.length > 1) {
      return { data: null as T, error: { message: "Multiple rows returned." }, count: response.count };
    }
    return { data: (rows[0] ?? null) as T, error: null, count: response.count };
  }

  private async execute(): Promise<QueryResponse<T[]>> {
    try {
      const { text, values } = this.toSql();
      const result = await getPool().query(text, values);
      return {
        data: this.head ? null : (result.rows.map(normalizeRow) as T[]),
        error: null,
        count: this.countMode === "exact" ? Number(result.rows[0]?.count ?? 0) : null
      };
    } catch (error) {
      return {
        data: null,
        error: { message: error instanceof Error ? error.message : "Unknown CockroachDB error." },
        count: null
      };
    }
  }

  private toSql() {
    if (this.action === "insert" || this.action === "upsert") return this.insertSql(this.action);
    if (this.action === "update") return this.updateSql();
    return this.selectSql();
  }

  private selectSql() {
    const values: unknown[] = [];
    const whereSql = this.whereSql(values);
    const orderSql = this.orderSql();
    if (this.countMode === "exact" && this.head) {
      return {
        text: `select count(*)::int as count from ${identifier(this.table)}${whereSql}`,
        values
      };
    }

    return {
      text: `select ${selectColumns(this.columns)} from ${identifier(this.table)}${whereSql}${orderSql}`,
      values
    };
  }

  private insertSql(action: "insert" | "upsert") {
    const rows = Array.isArray(this.payload) ? this.payload : [this.payload];
    if (!rows.length || rows.some((row) => !row || typeof row !== "object")) {
      throw new Error("Insert payload must be an object or object array.");
    }

    const columns = Object.keys(rows[0] as Record<string, unknown>);
    const values: unknown[] = [];
    const tuples = rows.map((row) => {
      const record = row as Record<string, unknown>;
      return `(${columns.map((column) => parameter(values, record[column])).join(", ")})`;
    });
    const conflictColumns = this.conflictColumns.length ? this.conflictColumns : defaultConflictColumns(columns);
    const conflictSql =
      action === "upsert" && conflictColumns.length
        ? ` on conflict (${conflictColumns.map(identifier).join(", ")}) do update set ${columns
            .filter((column) => !conflictColumns.includes(column))
            .map((column) => `${identifier(column)} = excluded.${identifier(column)}`)
            .join(", ")}`
        : "";
    const returningSql = this.returnRows || this.singleMode || this.maybeSingleMode ? " returning *" : "";

    return {
      text: `insert into ${identifier(this.table)} (${columns.map(identifier).join(", ")}) values ${tuples.join(", ")}${conflictSql}${returningSql}`,
      values
    };
  }

  private updateSql() {
    if (!this.payload || typeof this.payload !== "object") throw new Error("Update payload must be an object.");
    const values: unknown[] = [];
    const record = this.payload as Record<string, unknown>;
    const setSql = Object.entries(record)
      .map(([column, value]) => `${identifier(column)} = ${parameter(values, value)}`)
      .join(", ");
    const whereSql = this.whereSql(values);
    const returningSql = this.returnRows || this.singleMode || this.maybeSingleMode ? " returning *" : "";

    return {
      text: `update ${identifier(this.table)} set ${setSql}${whereSql}${returningSql}`,
      values
    };
  }

  private whereSql(values: unknown[]) {
    if (!this.filters.length) return "";
    return ` where ${this.filters
      .map((filter) => `${identifier(filter.column)} ${filter.operator} ${parameter(values, filter.value)}`)
      .join(" and ")}`;
  }

  private orderSql() {
    if (!this.orders.length) return "";
    return ` order by ${this.orders.map((order) => `${identifier(order.column)} ${order.ascending ? "asc" : "desc"}`).join(", ")}`;
  }
}

function identifier(value: string) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) throw new Error(`Unsafe SQL identifier: ${value}`);
  return `"${value}"`;
}

function selectColumns(columns: string) {
  if (columns.trim() === "*") return "*";
  return columns
    .split(",")
    .map((column) => identifier(column.trim()))
    .join(", ");
}

function parameter(values: unknown[], value: unknown) {
  values.push(prepareValue(value));
  return `$${values.length}`;
}

function prepareValue(value: unknown) {
  if (value && typeof value === "object" && !(value instanceof Date) && !Buffer.isBuffer(value)) {
    return JSON.stringify(value);
  }
  return value;
}

function normalizeRow(row: QueryResultRow) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, value instanceof Date ? value.toISOString() : value])
  );
}

function defaultConflictColumns(columns: string[]) {
  if (columns.includes("clerk_user_id")) return ["clerk_user_id"];
  if (columns.includes("id")) return ["id"];
  return [];
}
