import { schemaMigrations, addColumns } from '@nozbe/watermelondb/Schema/migrations';

export const migrations = schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        addColumns({
          table: 'work_orders',
          columns: [{ name: 'created_at', type: 'number', isOptional: true }],
        }),
      ],
    },
  ],
});
