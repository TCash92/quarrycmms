import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import { schema } from './schema';
import { migrations } from './migrations';
import { modelClasses } from './models';

// Create the SQLite adapter
const adapter = new SQLiteAdapter({
  schema,
  migrations,
  jsi: true, // Enable JSI for better performance
  onSetUpError: (error: Error): void => {
    console.error('Database setup error:', error);
  },
});

// Create the database instance
export const database = new Database({
  adapter,
  modelClasses,
});

// Database context
interface DatabaseContextValue {
  database: Database;
  isReady: boolean;
}

const DatabaseContext = createContext<DatabaseContextValue | null>(null);

interface DatabaseProviderProps {
  children: ReactNode;
}

export function DatabaseProvider({ children }: DatabaseProviderProps): React.ReactElement {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Database is ready immediately after adapter initialization
    // In a real app, you might want to perform initial data loading here
    setIsReady(true);
  }, []);

  const value: DatabaseContextValue = {
    database,
    isReady,
  };

  return React.createElement(DatabaseContext.Provider, { value }, children);
}

// Hook to access the database
export function useDatabase(): Database {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context.database;
}

// Hook to check if database is ready
export function useDatabaseReady(): boolean {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabaseReady must be used within a DatabaseProvider');
  }
  return context.isReady;
}

// Re-export schema, migrations, and models for convenience
export { schema } from './schema';
export { migrations } from './migrations';
export * from './models';
