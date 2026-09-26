// Simple Supabase client mock for composable unit tests
// It provides the chained API used in the project (from, select, insert, update, delete, eq, single, range, order, .data, .error)
// Each method returns the mock itself to allow chaining, except for terminal calls that return a Promise.

export interface MockQuery<T = any> {
  select?: (columns: string, opts?: any) => MockQuery<T>
  insert?: (payload: any) => MockQuery<T>
  update?: (payload: any) => MockQuery<T>
  delete?: () => MockQuery<T>
  eq?: (col: string, value: any) => MockQuery<T>
  range?: (from: number, to: number) => MockQuery<T>
  order?: (col: string, opts?: any) => MockQuery<T>
  single?: () => Promise<{ data?: T; error?: any }>
  maybeSingle?: () => Promise<{ data?: T; error?: any }>
  // terminal calls used in code
  then?: (cb: (res: { data?: T; error?: any }) => void) => void
}

export function createSupabaseMock(overrides: Partial<MockQuery> = {}): any {
  const mock: any = {
    from: vi.fn().mockImplementation(() => mock),
    // chainable methods will delegate to the same mock object
    select: vi.fn().mockImplementation(() => mock),
    insert: vi.fn().mockImplementation(() => mock),
    update: vi.fn().mockImplementation(() => mock),
    delete: vi.fn().mockImplementation(() => mock),
    eq: vi.fn().mockImplementation(() => mock),
    range: vi.fn().mockImplementation(() => mock),
    order: vi.fn().mockImplementation(() => mock),
    // terminal methods return a promise that resolves to the configured result
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    // Some calls use .single().then(...), but async/await works with the Promise.
    // Allow overriding any of the above behaviours via the overrides argument.
    ...overrides,
  }
  return mock
}
